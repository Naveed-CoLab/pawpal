import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { BadgeService, BadgeAward } from '@/lib/badgeService';

export function useBadges() {
  const { user } = useAuth();
  const { showSuccess } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [badgeStats, setBadgeStats] = useState({
    totalBadges: 0,
    totalPoints: 0,
    userLevel: 1,
    nextMilestone: { points: 50, title: 'Getting Started' }
  });
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [badgesByCategory, setBadgesByCategory] = useState<Record<string, any[]>>({});

  // Load badge data
  const loadBadgeData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/badges?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch badge data');
      }
      
      const data = await response.json();
      
      setUserBadges(data.userBadges || []);
      setBadgeStats(data.stats || {
        totalBadges: 0,
        totalPoints: 0,
        userLevel: 1,
        nextMilestone: { points: 50, title: 'Getting Started' }
      });
      setAllBadges(data.allBadges || []);
      setBadgesByCategory(data.badgesByCategory || {});
      
    } catch (err) {
      console.error('Error loading badge data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load badge data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Check for badges based on activity type
  const checkForBadges = useCallback(async (activityType: 'chat' | 'mood' | 'coaching' | 'pet') => {
    if (!user?.id) return [];
    
    try {
      const awardedBadges = await BadgeService.checkAndAwardBadges(user.id, activityType);
      
      // Show notifications for awarded badges
      awardedBadges.forEach(badge => {
        BadgeService.showBadgeNotification(badge, showSuccess);
      });
      
      // Refresh badge data if any badges were awarded
      if (awardedBadges.length > 0) {
        await loadBadgeData();
      }
      
      return awardedBadges;
    } catch (err) {
      console.error('Error checking for badges:', err);
      return [];
    }
  }, [user?.id, showSuccess, loadBadgeData]);

  // Award a specific badge by name
  const awardBadge = useCallback(async (badgeName: string) => {
    if (!user?.id) return false;
    
    try {
      const response = await fetch('/api/badges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          badgeName
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to award badge');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Show notification
        showSuccess(`🏅 Badge Earned: ${data.badge?.title || badgeName}!`);
        
        // Refresh badge data
        await loadBadgeData();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error awarding badge:', err);
      return false;
    }
  }, [user?.id, showSuccess, loadBadgeData]);

  // Load badge data on mount
  useEffect(() => {
    loadBadgeData();
  }, [loadBadgeData]);

  return {
    userBadges,
    allBadges,
    badgesByCategory,
    badgeStats,
    loading,
    error,
    checkForBadges,
    awardBadge,
    refreshBadges: loadBadgeData
  };
}