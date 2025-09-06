import { NotificationService } from './notificationService';
import { BehaviorTrendService } from './behaviorTrendService';

/**
 * Notification Triggers
 * 
 * This module contains functions that automatically create notifications
 * when certain events happen in the VetPaw app.
 */

export class NotificationTriggers {
  
  // Trigger when a new mood log is created
  static async onMoodLogCreated(userId: string, petId: string, mood: string, confidence: number) {
    try {
      // Create achievement notification for first mood log
      const isFirstMood = await this.isFirstMoodLog(userId, petId);
      if (isFirstMood) {
        await NotificationService.createAchievementNotification(
          userId,
          'First Mood Check! 📸',
          'You\'ve taken your first step in understanding your pet\'s emotional wellbeing!'
        );
      }

      // Create achievement for high confidence mood detection
      if (confidence > 0.9) {
        await NotificationService.createAchievementNotification(
          userId,
          'Perfect Mood Capture! 🎯',
          'Amazing! You captured a photo with 90%+ mood detection accuracy!'
        );
      }

      // Create health alert for concerning moods
      if (['anxious', 'fearful', 'in pain'].includes(mood) && confidence > 0.7) {
        await NotificationService.createHealthAlertNotification(
          userId,
          petId,
          `Your pet seems to be feeling ${mood.replace('_', ' ')}. Consider checking their wellbeing or consulting a vet if this continues.`
        );
      }

    } catch (error) {
      console.error('Error in onMoodLogCreated trigger:', error);
    }
  }

  // Trigger when behavior trends are updated
  static async onBehaviorTrendUpdated(userId: string, petId: string) {
    try {
      // Get the latest behavior trend
      const trendData = await BehaviorTrendService.getBehaviorTrend(userId, petId, 30);
      
      if (trendData.insights.totalEntries >= 5) { // Only trigger if enough data
        // Create notification based on trend
        await NotificationService.createBehaviorTrendNotification(
          userId,
          petId,
          trendData.insights.trend
        );

        // Create achievement for consistent tracking
        if (trendData.insights.totalEntries === 10) {
          await NotificationService.createAchievementNotification(
            userId,
            'Dedicated Pet Parent! 📊',
            'You\'ve tracked 10 behavior data points! Your dedication to your pet\'s wellbeing is amazing!'
          );
        }

        // Create achievement for 30-day streak
        if (trendData.insights.totalEntries >= 30) {
          await NotificationService.createAchievementNotification(
            userId,
            'Behavior Tracking Master! 🏆',
            'Incredible! You\'ve been consistently tracking your pet\'s behavior for 30 days!'
          );
        }
      }

    } catch (error) {
      console.error('Error in onBehaviorTrendUpdated trigger:', error);
    }
  }

  // Trigger when a pet is added
  static async onPetAdded(userId: string, petId: string, petName: string, isFirstPet: boolean) {
    try {
      if (isFirstPet) {
        // Welcome achievement for first pet
        await NotificationService.createAchievementNotification(
          userId,
          'Welcome to VetPaw! 🐾',
          `${petName} is now part of the VetPaw family! Start exploring features to keep them happy and healthy.`
        );

        // Create mood reminder for new pet
        await NotificationService.createMoodReminderNotification(userId, petId);
      } else {
        // Achievement for multiple pets
        await NotificationService.createAchievementNotification(
          userId,
          'Growing Family! 👨‍👩‍👧‍👦',
          `${petName} joins your VetPaw family! You\'re becoming quite the pet parent!`
        );
      }

    } catch (error) {
      console.error('Error in onPetAdded trigger:', error);
    }
  }

  // Trigger when health symptoms are submitted
  static async onHealthSymptomsSubmitted(userId: string, petId: string, urgency: string, symptoms: string[]) {
    try {
      // Create health alert for emergency symptoms
      if (urgency === 'emergency') {
        await NotificationService.createHealthAlertNotification(
          userId,
          petId,
          'Emergency symptoms detected! Please seek immediate veterinary care for your pet.'
        );
      }

      // Create achievement for being proactive about health
      const isFirstHealthCheck = await this.isFirstHealthCheck(userId, petId);
      if (isFirstHealthCheck) {
        await NotificationService.createAchievementNotification(
          userId,
          'Health-Conscious Pet Parent! 🏥',
          'Great job being proactive about your pet\'s health! Early detection is key to keeping them happy.'
        );
      }

    } catch (error) {
      console.error('Error in onHealthSymptomsSubmitted trigger:', error);
    }
  }

  // Trigger when a coaching session is completed
  static async onCoachingSessionCompleted(userId: string, sessionDuration: number, isFirstSession: boolean) {
    try {
      if (isFirstSession) {
        await NotificationService.createAchievementNotification(
          userId,
          'First Coaching Session! 🎯',
          'Congratulations on completing your first session with Luna! You\'re on the path to becoming an amazing pet parent.'
        );
      }

      // Achievement for long sessions
      if (sessionDuration > 300) { // 5 minutes
        await NotificationService.createAchievementNotification(
          userId,
          'Dedicated Learner! 📚',
          'You spent over 5 minutes learning from Luna! Your commitment to improvement is inspiring.'
        );
      }

    } catch (error) {
      console.error('Error in onCoachingSessionCompleted trigger:', error);
    }
  }

  // Trigger for weekly summary
  static async onWeeklySummary(userId: string, petId: string, weeklyStats: any) {
    try {
      const { moodLogsCount, healthChecksCount, coachingSessions } = weeklyStats;
      
      // Create weekly summary notification
      if (moodLogsCount > 0 || healthChecksCount > 0 || coachingSessions > 0) {
        const message = `This week: ${moodLogsCount} mood checks, ${healthChecksCount} health assessments, ${coachingSessions} coaching sessions. Keep up the great work!`;
        
        await NotificationService.createNotification({
          user_id: userId,
          pet_id: petId,
          type: 'achievement',
          title: 'Weekly Summary 📈',
          message,
          icon: 'calendar',
          action_type: 'navigate',
          action_data: '/(tabs)/trends',
          is_read: false,
          priority: 'medium',
        });
      }

      // Achievement for active week
      if (moodLogsCount >= 7) {
        await NotificationService.createAchievementNotification(
          userId,
          'Daily Mood Master! 🌟',
          'Amazing! You checked your pet\'s mood every day this week! Your dedication shows how much you care.'
        );
      }

    } catch (error) {
      console.error('Error in onWeeklySummary trigger:', error);
    }
  }

  // Trigger for milestone achievements
  static async onMilestoneReached(userId: string, milestone: string, count: number) {
    try {
      const milestoneMessages = {
        'mood_logs': {
          5: 'Mood Tracking Beginner! 📸',
          20: 'Mood Detective! 🔍', 
          50: 'Emotion Expert! 🎭',
          100: 'Mood Master! 👑'
        },
        'health_checks': {
          3: 'Health-Conscious! 🏥',
          10: 'Wellness Warrior! ⚔️',
          25: 'Health Guardian! 🛡️'
        },
        'coaching_sessions': {
          3: 'Learning Enthusiast! 📚',
          10: 'Coaching Devotee! 🎯',
          25: 'Training Expert! 🏆'
        }
      };

      const messages = milestoneMessages[milestone as keyof typeof milestoneMessages];
      if (messages && messages[count as keyof typeof messages]) {
        await NotificationService.createAchievementNotification(
          userId,
          messages[count as keyof typeof messages],
          `Congratulations! You've reached ${count} ${milestone.replace('_', ' ')}!`
        );
      }

    } catch (error) {
      console.error('Error in onMilestoneReached trigger:', error);
    }
  }

  // Helper functions
  private static async isFirstMoodLog(userId: string, petId: string): Promise<boolean> {
    // This would check if this is the first mood log for this pet
    // Implementation depends on your database structure
    return true; // Placeholder
  }

  private static async isFirstHealthCheck(userId: string, petId: string): Promise<boolean> {
    // This would check if this is the first health check for this pet
    // Implementation depends on your database structure
    return true; // Placeholder
  }

  // Trigger reminders
  static async createDailyReminders(userId: string, petId: string) {
    try {
      // Check if mood was logged today
      const today = new Date().toDateString();
      // Implementation would check last mood log date
      
      // Create reminder if no mood logged today
      await NotificationService.createMoodReminderNotification(userId, petId);

    } catch (error) {
      console.error('Error creating daily reminders:', error);
    }
  }

  // Trigger coaching availability
  static async triggerCoachingAvailability(userId: string) {
    try {
      // Random chance to suggest coaching (can be based on usage patterns)
      if (Math.random() < 0.3) { // 30% chance
        await NotificationService.createCoachingAvailableNotification(userId);
      }

    } catch (error) {
      console.error('Error triggering coaching availability:', error);
    }
  }
} 