import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  pet_id?: string;
  type: 'badge_awarded' | 'behavior_trend' | 'health_alert' | 'mood_reminder' | 'coaching_available' | 'data_sync' | 'welcome' | 'achievement';
  title: string;
  message: string;
  icon?: string;
  action_type?: 'navigate' | 'modal' | 'none';
  action_data?: string; // Route to navigate or modal data
  is_read: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  expires_at?: string;
}

export class NotificationService {
  // Get all notifications for a user
  static async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      return !error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      return !error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Create a new notification
  static async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<boolean> {
    try {
      console.log('🔥 NotificationService.createNotification called with:', notification);
      
      // Check if user exists and is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔥 Current auth user:', user?.id, 'Auth error:', authError);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          ...notification,
          created_at: new Date().toISOString(),
        }])
        .select(); // Add select to get the inserted data back
      
      console.log('🔥 Supabase insert result:', { data, error });
      
      if (error) {
        console.error('❌ Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return false;
      }
      
      console.log('✅ Notification created successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      return false;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      return !error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // Predefined notification creators
  static async createBadgeNotification(userId: string, petId: string | null, badgeName: string, badgeDescription: string) {
    return this.createNotification({
      user_id: userId,
      pet_id: petId,
      type: 'badge_awarded',
      title: 'New Badge Earned! 🏆',
      message: `Your pet earned the "${badgeName}" badge! ${badgeDescription}`,
      icon: 'trophy',
      action_type: 'navigate',
      action_data: '/(tabs)/profile',
      is_read: false,
      priority: 'high',
    });
  }

  static async createBehaviorTrendNotification(userId: string, petId: string | null, trendType: 'improving' | 'declining' | 'stable') {
    const messages = {
      improving: 'Great news! Your pet\'s behavior trends are improving! 📈',
      declining: 'Your pet\'s behavior trends need attention. Check the latest insights. 📉',
      stable: 'Your pet\'s behavior remains stable. Keep up the good work! 📊'
    };

    const priorities = {
      improving: 'high' as const,
      declining: 'high' as const,
      stable: 'medium' as const
    };

    return this.createNotification({
      user_id: userId,
      pet_id: petId,
      type: 'behavior_trend',
      title: 'Behavior Update 📊',
      message: messages[trendType],
      icon: 'trending-up',
      action_type: 'navigate',
      action_data: '/(tabs)/trends',
      is_read: false,
      priority: priorities[trendType],
    });
  }

  static async createHealthAlertNotification(userId: string, petId: string | null, alertMessage: string) {
    return this.createNotification({
      user_id: userId,
      pet_id: petId,
      type: 'health_alert',
      title: 'Health Alert ⚠️',
      message: alertMessage,
      icon: 'alert-triangle',
      action_type: 'navigate',
      action_data: '/(tabs)/health',
      is_read: false,
      priority: 'high',
    });
  }

  static async createMoodReminderNotification(userId: string, petId: string | null) {
    return this.createNotification({
      user_id: userId,
      pet_id: petId,
      type: 'mood_reminder',
      title: 'Time for Mood Check! 📸',
      message: 'It\'s been a while since you checked your pet\'s mood. Snap a photo to see how they\'re feeling!',
      icon: 'camera',
      action_type: 'navigate',
      action_data: '/(tabs)/mood',
      is_read: false,
      priority: 'medium',
    });
  }

  static async createCoachingAvailableNotification(userId: string) {
    return this.createNotification({
      user_id: userId,
      type: 'coaching_available',
      title: 'Luna is Ready! 🎯',
      message: 'Your personal dog mentor Luna is available for a live coaching session. Start your session now!',
      icon: 'video',
      action_type: 'navigate',
      action_data: '/(tabs)/coach',
      is_read: false,
      priority: 'medium',
    });
  }

  static async createWelcomeNotification(userId: string) {
    console.log('🔥 Creating welcome notification for user:', userId);
    
    const notificationData = {
      user_id: userId,
      type: 'welcome' as const,
      title: 'Welcome to VetPaw! 🐾',
      message: 'Start your journey by adding your first pet and exploring all the amazing features we have for you!',
      icon: 'heart',
      action_type: 'navigate' as const,
      action_data: '/pets/add',
      is_read: false,
      priority: 'high' as const,
    };
    
    console.log('🔥 Welcome notification data:', notificationData);
    
    return this.createNotification(notificationData);
  }

  static async createAchievementNotification(userId: string, achievementName: string, description: string) {
    return this.createNotification({
      user_id: userId,
      type: 'achievement',
      title: 'Achievement Unlocked! 🎉',
      message: `${achievementName}: ${description}`,
      icon: 'star',
      action_type: 'modal',
      action_data: 'achievement_modal',
      is_read: false,
      priority: 'high',
    });
  }

  // Get notification icon based on type
  static getNotificationIcon(type: Notification['type']): string {
    const iconMap = {
      badge_awarded: '🏆',
      behavior_trend: '📊',
      health_alert: '⚠️',
      mood_reminder: '📸',
      coaching_available: '🎯',
      data_sync: '💾',
      welcome: '🐾',
      achievement: '🎉',
    };
    return iconMap[type] || '🔔';
  }

  // Get notification priority color
  static getPriorityColor(priority: Notification['priority']): string {
    const colorMap = {
      low: '#4CAF50',
      medium: '#ff9d00',
      high: '#ff6b6b',
    };
    return colorMap[priority];
  }

  // Clean up expired notifications
  static async cleanupExpiredNotifications(userId: string): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('expires_at', now);

      return !error;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return false;
    }
  }
} 