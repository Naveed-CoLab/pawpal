import { useState, useEffect, useCallback } from 'react';
import { NotificationService, Notification } from '@/lib/notificationService';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        NotificationService.getUserNotifications(user.id),
        NotificationService.getUnreadCount(user.id),
      ]);

      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.markAsRead(notificationId);
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return success;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, [user?.id]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.markAllAsRead(user.id);
      if (success) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        );
        setUnreadCount(0);
      }
      return success;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return false;
    }
  }, [user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.deleteNotification(notificationId);
      if (success) {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Update unread count if the deleted notification was unread
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
      return success;
    } catch (err) {
      console.error('Error deleting notification:', err);
      return false;
    }
  }, [user?.id, notifications]);

  // Create notification helpers
  const createBadgeNotification = useCallback(async (petId: string, badgeName: string, badgeDescription: string) => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.createBadgeNotification(user.id, petId, badgeName, badgeDescription);
      if (success) {
        await fetchNotifications(); // Refresh notifications
      }
      return success;
    } catch (err) {
      console.error('Error creating badge notification:', err);
      return false;
    }
  }, [user?.id, fetchNotifications]);

  const createBehaviorTrendNotification = useCallback(async (petId: string, trendType: 'improving' | 'declining' | 'stable') => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.createBehaviorTrendNotification(user.id, petId, trendType);
      if (success) {
        await fetchNotifications(); // Refresh notifications
      }
      return success;
    } catch (err) {
      console.error('Error creating behavior trend notification:', err);
      return false;
    }
  }, [user?.id, fetchNotifications]);

  const createHealthAlertNotification = useCallback(async (petId: string, alertMessage: string) => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.createHealthAlertNotification(user.id, petId, alertMessage);
      if (success) {
        await fetchNotifications(); // Refresh notifications
      }
      return success;
    } catch (err) {
      console.error('Error creating health alert notification:', err);
      return false;
    }
  }, [user?.id, fetchNotifications]);

  const createMoodReminderNotification = useCallback(async (petId: string) => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.createMoodReminderNotification(user.id, petId);
      if (success) {
        await fetchNotifications(); // Refresh notifications
      }
      return success;
    } catch (err) {
      console.error('Error creating mood reminder notification:', err);
      return false;
    }
  }, [user?.id, fetchNotifications]);

  const createCoachingAvailableNotification = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.createCoachingAvailableNotification(user.id);
      if (success) {
        await fetchNotifications(); // Refresh notifications
      }
      return success;
    } catch (err) {
      console.error('Error creating coaching notification:', err);
      return false;
    }
  }, [user?.id, fetchNotifications]);

  const createWelcomeNotification = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.createWelcomeNotification(user.id);
      if (success) {
        await fetchNotifications(); // Refresh notifications
      }
      return success;
    } catch (err) {
      console.error('Error creating welcome notification:', err);
      return false;
    }
  }, [user?.id, fetchNotifications]);

  const createAchievementNotification = useCallback(async (achievementName: string, description: string) => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.createAchievementNotification(user.id, achievementName, description);
      if (success) {
        await fetchNotifications(); // Refresh notifications
      }
      return success;
    } catch (err) {
      console.error('Error creating achievement notification:', err);
      return false;
    }
  }, [user?.id, fetchNotifications]);

  // Create sample notifications for testing
  const createSampleNotifications = useCallback(async () => {
    if (!user?.id) {
      console.error('❌ createSampleNotifications: No user ID');
      return false;
    }

    // Use the auth_user_id for RLS compatibility
    const authUserId = user.auth_user_id || user.id;
    console.log('🔥 Creating sample notifications for user:', user.id);
    console.log('🔥 Using auth_user_id for RLS:', authUserId);

    // First, let's test if we can read from the notifications table
    try {
      console.log('🔥 Testing database connectivity...');
      const { data: testData, error: testError } = await supabase
        .from('notifications')
        .select('count')
        .eq('user_id', authUserId);
      
      console.log('🔥 Database test result:', { testData, testError });
      
      if (testError) {
        console.error('❌ Database connectivity issue:', testError);
      }
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
    }

    try {
      // Create various types of notifications for testing (non-pet specific first)
      console.log('🔥 Creating welcome notification...');
      const welcome = await NotificationService.createWelcomeNotification(authUserId);
      console.log('🔥 Welcome notification result:', welcome);
      
      console.log('🔥 Creating coaching notification...');
      const coaching = await NotificationService.createCoachingAvailableNotification(authUserId);
      console.log('🔥 Coaching notification result:', coaching);
      
      console.log('🔥 Creating achievement notification...');
      const achievement = await NotificationService.createAchievementNotification(authUserId, "First Steps", "You completed your first week with VetPaw!");
      console.log('🔥 Achievement notification result:', achievement);
      
      // For pet-specific notifications, use null instead of invalid UUID
      console.log('🔥 Creating pet-specific notifications (with null pet_id)...');
      const mood = await NotificationService.createMoodReminderNotification(authUserId, null);
      console.log('🔥 Mood notification result:', mood);
      
      const behavior = await NotificationService.createBehaviorTrendNotification(authUserId, null, 'improving');
      console.log('🔥 Behavior notification result:', behavior);
      
      const badge = await NotificationService.createBadgeNotification(authUserId, null, 'Good Boy', 'Your pet has been extra good today!');
      console.log('🔥 Badge notification result:', badge);
      
      console.log('🔥 Refreshing notifications...');
      await fetchNotifications(); // Refresh to show new notifications
      
      // Check if any notifications were actually created
      const successCount = [welcome, coaching, achievement, mood, behavior, badge].filter(Boolean).length;
      console.log('🔥 Successfully created notifications:', successCount, 'out of 6');
      
      if (successCount > 0) {
        console.log('✅ Some sample notifications created successfully!');
        return true;
      } else {
        console.error('❌ No notifications were created successfully');
        return false;
      }
    } catch (err) {
      console.error('❌ Error creating sample notifications:', err);
      return false;
    }
  }, [user?.id, user?.auth_user_id, fetchNotifications]);

  // Auto-fetch notifications on mount and user change
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      
      // Set up periodic refresh (every 30 seconds)
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications]);

  // Clean up expired notifications periodically
  useEffect(() => {
    if (user?.id) {
      const cleanup = async () => {
        await NotificationService.cleanupExpiredNotifications(user.id);
        await fetchNotifications();
      };

      // Clean up on mount and then every hour
      cleanup();
      const interval = setInterval(cleanup, 3600000); // 1 hour
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    // Notification creators
    createBadgeNotification,
    createBehaviorTrendNotification,
    createHealthAlertNotification,
    createMoodReminderNotification,
    createCoachingAvailableNotification,
    createWelcomeNotification,
    createAchievementNotification,
    createSampleNotifications,
  };
} 