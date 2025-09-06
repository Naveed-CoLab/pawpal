// Badge Service for VetPaw
import { supabase } from './supabase';

export interface BadgeAward {
  title: string;
  description: string;
  icon: string;
  points: number;
  category: string;
}

export class BadgeService {
  // Define available badges - using exact names from database
  private static BADGES = {
    FIRST_CHAT: {
      title: 'First Conversation',
      description: 'Started your first chat with VetPaw AI! Welcome to the family! 🎉',
      icon: '💬',
      points: 10,
      category: 'chat'
    },
    CHAT_ENTHUSIAST: {
      title: 'Chat Enthusiast',
      description: 'Had 5 conversations with VetPaw AI! You\'re getting the hang of it! 🌟',
      icon: '🌟',
      points: 25,
      category: 'chat'
    },
    CHAT_MASTER: {
      title: 'Chat Master',
      description: 'Completed 10 chat sessions! You\'re a VetPaw AI conversation pro! 🏆',
      icon: '🏆',
      points: 50,
      category: 'chat'
    },
    MOOD_DETECTIVE: {
      title: 'Mood Detective',
      description: 'Used Snap My Mood for the first time! You\'re helping us understand your pet better! 🔍',
      icon: '🔍',
      points: 15,
      category: 'mood'
    },
    EMOTION_EXPERT: {
      title: 'Emotion Expert',
      description: 'Tracked your pet\'s mood 5 times! You really care about their emotional wellbeing! 💝',
      icon: '💝',
      points: 30,
      category: 'mood'
    },
    MOOD_MASTER: {
      title: 'Mood Master',
      description: 'Used Snap My Mood 10 times! You\'re becoming a pet emotion expert! 🧠',
      icon: '🧠',
      points: 60,
      category: 'mood'
    },
    COACHING_ROOKIE: {
      title: 'Coaching Rookie',
      description: 'Completed your first live coaching session with Luna! Great start! 🎯',
      icon: '🎯',
      points: 20,
      category: 'coaching'
    },
    COACHING_ENTHUSIAST: {
      title: 'Coaching Enthusiast',
      description: 'Completed 3 coaching sessions! You\'re committed to learning! 📚',
      icon: '📚',
      points: 40,
      category: 'coaching'
    },
    COACHING_PRO: {
      title: 'Coaching Pro',
      description: 'Completed 5 coaching sessions! You\'re getting really good at this! 🏅',
      icon: '🏅',
      points: 75,
      category: 'coaching'
    },
    COACHING_MASTER: {
      title: 'Coaching Master',
      description: 'Completed 10 coaching sessions! You\'re a true pet parenting champion! 👑',
      icon: '👑',
      points: 150,
      category: 'coaching'
    },
    PET_PARENT: {
      title: 'Pet Parent',
      description: 'Added your first pet to VetPaw! Your furry friend is lucky to have you! 🐕',
      icon: '🐕',
      points: 15,
      category: 'pets'
    },
    PACK_LEADER: {
      title: 'Pack Leader',
      description: 'Added 3 pets to your VetPaw family! You\'re managing a whole pack! 🐾',
      icon: '🐾',
      points: 35,
      category: 'pets'
    }
  };

  // Helper function to call database function
  private static async awardBadge(userId: string, badgeName: string): Promise<boolean> {
    try {
      console.log(`🏅 Attempting to award badge: ${badgeName} to user: ${userId}`);
      
      // Call the database function that uses badge name
      const { data, error } = await supabase.rpc('award_user_badge', {
        p_user_id: userId,
        p_badge_name: badgeName  // Using badge name, not title
      });

      if (error) {
        console.error('❌ Error awarding badge:', error);
        return false;
      }

      console.log(`✅ Badge awarded successfully: ${badgeName}`);
      return data;
    } catch (error) {
      console.error('❌ Exception awarding badge:', error);
      return false;
    }
  }

  // Check and award chat milestone badges
  static async checkChatMilestones(userId: string): Promise<BadgeAward[]> {
    const awardedBadges: BadgeAward[] = [];
    
    try {
      console.log('🏅 Checking chat milestones for user:', userId);
      
      // Count user's chats
      const { data: chats, error } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error counting chats:', error);
        return awardedBadges;
      }

      const chatCount = chats?.length || 0;
      console.log(`📊 User has ${chatCount} chats`);

      // Award badges based on milestones
      if (chatCount === 1) {
        const awarded = await this.awardBadge(userId, 'First Conversation');
        if (awarded) awardedBadges.push(this.BADGES.FIRST_CHAT);
      } else if (chatCount === 5) {
        const awarded = await this.awardBadge(userId, 'Chat Enthusiast');
        if (awarded) awardedBadges.push(this.BADGES.CHAT_ENTHUSIAST);
      } else if (chatCount === 10) {
        const awarded = await this.awardBadge(userId, 'Chat Master');
        if (awarded) awardedBadges.push(this.BADGES.CHAT_MASTER);
      }

    } catch (error) {
      console.error('❌ Error in checkChatMilestones:', error);
    }

    return awardedBadges;
  }

  // Check and award mood milestone badges
  static async checkMoodMilestones(userId: string): Promise<BadgeAward[]> {
    const awardedBadges: BadgeAward[] = [];
    
    try {
      console.log('🔍 Checking mood milestones for user:', userId);
      
      // Count user's mood logs
      const { data: moodLogs, error } = await supabase
        .from('mood_logs')
        .select('id')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error counting mood logs:', error);
        return awardedBadges;
      }

      const moodCount = moodLogs?.length || 0;
      console.log(`📊 User has ${moodCount} mood logs`);

      // Award badges based on milestones
      if (moodCount === 1) {
        const awarded = await this.awardBadge(userId, 'Mood Detective');
        if (awarded) awardedBadges.push(this.BADGES.MOOD_DETECTIVE);
      } else if (moodCount === 5) {
        const awarded = await this.awardBadge(userId, 'Emotion Expert');
        if (awarded) awardedBadges.push(this.BADGES.EMOTION_EXPERT);
      } else if (moodCount === 10) {
        const awarded = await this.awardBadge(userId, 'Mood Master');
        if (awarded) awardedBadges.push(this.BADGES.MOOD_MASTER);
      }

    } catch (error) {
      console.error('❌ Error in checkMoodMilestones:', error);
    }

    return awardedBadges;
  }

  // Check and award coaching milestone badges
  static async checkCoachingMilestones(userId: string): Promise<BadgeAward[]> {
    const awardedBadges: BadgeAward[] = [];
    
    try {
      console.log('🎯 Checking coaching milestones for user:', userId);
      
      // Count user's coaching sessions
      const { data: coachingSessions, error } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', userId)
        .eq('session_type', 'coaching');

      if (error) {
        console.error('❌ Error counting coaching sessions:', error);
        return awardedBadges;
      }

      const coachingCount = coachingSessions?.length || 0;
      console.log(`📊 User has ${coachingCount} coaching sessions`);

      // Award badges based on milestones
      if (coachingCount === 1) {
        const awarded = await this.awardBadge(userId, 'Coaching Rookie');
        if (awarded) awardedBadges.push(this.BADGES.COACHING_ROOKIE);
      } else if (coachingCount === 3) {
        const awarded = await this.awardBadge(userId, 'Coaching Enthusiast');
        if (awarded) awardedBadges.push(this.BADGES.COACHING_ENTHUSIAST);
      } else if (coachingCount === 5) {
        const awarded = await this.awardBadge(userId, 'Coaching Pro');
        if (awarded) awardedBadges.push(this.BADGES.COACHING_PRO);
      } else if (coachingCount === 10) {
        const awarded = await this.awardBadge(userId, 'Coaching Master');
        if (awarded) awardedBadges.push(this.BADGES.COACHING_MASTER);
      }

    } catch (error) {
      console.error('❌ Error in checkCoachingMilestones:', error);
    }

    return awardedBadges;
  }

  // Check and award pet milestone badges
  static async checkPetMilestones(userId: string): Promise<BadgeAward[]> {
    const awardedBadges: BadgeAward[] = [];
    
    try {
      console.log('🐕 Checking pet milestones for user:', userId);
      
      // Count user's pets
      const { data: pets, error } = await supabase
        .from('pets')
        .select('id')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error counting pets:', error);
        return awardedBadges;
      }

      const petCount = pets?.length || 0;
      console.log(`📊 User has ${petCount} pets`);

      // Award badges based on milestones
      if (petCount === 1) {
        const awarded = await this.awardBadge(userId, 'Pet Parent');
        if (awarded) awardedBadges.push(this.BADGES.PET_PARENT);
      } else if (petCount === 3) {
        const awarded = await this.awardBadge(userId, 'Pack Leader');
        if (awarded) awardedBadges.push(this.BADGES.PACK_LEADER);
      }

    } catch (error) {
      console.error('❌ Error in checkPetMilestones:', error);
    }

    return awardedBadges;
  }

  // Main badge checking function
  static async checkAndAwardBadges(userId: string, activityType: 'chat' | 'mood' | 'coaching' | 'pet'): Promise<BadgeAward[]> {
    let badges: BadgeAward[] = [];
    
    try {
      switch (activityType) {
        case 'chat':
          badges = await this.checkChatMilestones(userId);
          break;
        case 'mood':
          badges = await this.checkMoodMilestones(userId);
          break;
        case 'coaching':
          badges = await this.checkCoachingMilestones(userId);
          break;
        case 'pet':
          badges = await this.checkPetMilestones(userId);
          break;
      }
    } catch (error) {
      console.error('❌ Error in checkAndAwardBadges:', error);
    }
    
    return badges;
  }

  // Show badge notification
  static showBadgeNotification(badge: BadgeAward, showSnackbar: (message: string, type?: string) => void) {
    console.log(`🎉 Badge earned: ${badge.title}`);
    showSnackbar(`🏅 Badge Earned: ${badge.title}! (+${badge.points} points)`, 'success');
  }

  // Get all available badges
  static getAllBadges(): BadgeAward[] {
    return Object.values(this.BADGES);
  }

  // Get badge by title
  static getBadgeByTitle(title: string): BadgeAward | undefined {
    return Object.values(this.BADGES).find(badge => badge.title === title);
  }
}
