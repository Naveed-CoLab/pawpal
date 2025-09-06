import { useState, useEffect, useCallback } from 'react';
import { 
  BehaviorTrendService, 
  BehaviorTrendData 
} from '@/lib/behaviorTrendService';
import { useAuth } from './useAuth';
import { usePets } from './useDatabase';

export const useBehaviorTrends = (
  petId?: string,
  days: number = 30
) => {
  const { user } = useAuth();
  const { pets } = usePets();
  const [trendData, setTrendData] = useState<BehaviorTrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the pet ID to use (from props, primary pet, or first pet)
  const targetPetId = petId || pets.find(p => p.is_primary)?.id || pets[0]?.id;

  const fetchTrendData = useCallback(async () => {
    if (!user?.id || !targetPetId) {
      console.log('❌ useBehaviorTrends: Missing user or pet ID', { 
        userId: user?.id, 
        petId: targetPetId 
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 useBehaviorTrends: Fetching trend data...', {
        userId: user.id,
        petId: targetPetId,
        days
      });

      const data = await BehaviorTrendService.getBehaviorTrend(
        user.id,
        targetPetId,
        days
      );

      console.log('📊 useBehaviorTrends: Data received:', {
        dataPoints: data.dataPoints.length,
        totalEntries: data.insights.totalEntries,
        trend: data.insights.trend
      });

      setTrendData(data);
      setError(null);
    } catch (err) {
      console.error('❌ useBehaviorTrends: Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trend data');
      setTrendData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, targetPetId, days]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchTrendData();
  }, [fetchTrendData]);

  // Refresh function for manual refresh
  const refresh = useCallback(() => {
    fetchTrendData();
  }, [fetchTrendData]);

  // Get summary statistics
  const getSummary = useCallback(() => {
    if (!trendData) {
      return {
        totalEntries: 0,
        avgMoodScore: 0,
        avgHealthScore: 0,
        trend: 'stable' as const,
        lastWeekChange: 0,
        hasData: false
      };
    }

    return {
      totalEntries: trendData.insights.totalEntries,
      avgMoodScore: trendData.insights.avgMoodScore,
      avgHealthScore: trendData.insights.avgHealthScore,
      trend: trendData.insights.trend,
      lastWeekChange: trendData.insights.lastWeekTrend,
      hasData: trendData.insights.totalEntries > 0,
      commonMoods: trendData.insights.commonMoods,
      healthAlerts: trendData.insights.healthAlerts
    };
  }, [trendData]);

  // Get recent data points for quick access
  const getRecentDataPoints = useCallback((count: number = 7) => {
    if (!trendData) return [];
    
    return trendData.dataPoints
      .filter(point => point.notes) // Only points with actual data
      .slice(-count); // Get most recent
  }, [trendData]);

  // Check if there's enough data for meaningful insights
  const hasEnoughData = useCallback(() => {
    return trendData && trendData.insights.totalEntries >= 3;
  }, [trendData]);

  return {
    trendData,
    loading,
    error,
    refresh,
    getSummary,
    getRecentDataPoints,
    hasEnoughData,
    targetPetId,
  };
}; 