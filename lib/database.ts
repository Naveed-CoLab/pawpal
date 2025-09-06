import { supabase } from './supabase';
import { AuthUser } from './auth';

// Database Types
export interface Pet {
  id: string;
  user_id: string;
  name: string;
  breed: string;
  age: number;
  gender: 'male' | 'female' | 'unknown';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender: 'user' | 'ai';
  message: string;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  title: string;
  description?: string;
  icon?: string;
  category?: string;
  points?: number;
  image_url?: string;
  requirement_type?: string;
  requirement_value?: number;
  created_at: string;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  earned_at: string; // Fixed: changed from awarded_at to earned_at
  badge: Badge;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  plan: 'free' | 'premium' | 'enterprise';
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SymptomAssessment {
  id: string;
  user_id: string;
  symptoms_selected: string[];
  urgency_level: 'mild' | 'moderate' | 'emergency';
  ai_analysis: string;
  immediate_actions: string[];
  warnings: string[];
  vet_recommendation: string;
  possible_causes: string[];
  user_location?: string;
  assessment_data: any; // Full AI response JSON
  created_at: string;
}

// Coaching-related types
export interface CoachingSession {
  id: string;
  conversation_id: string;
  user_id?: string;
  transcript: string;
  summary?: string;
  session_title: string;
  main_topic: string;
  urgency_level: 'low' | 'moderate' | 'high';
  key_points: string[];
  recommendations: string[];
  techniques_taught: string[];
  next_steps: string[];
  progress_notes: string;
  follow_up_timeline: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration_seconds: number;
  raw_conversation_data?: any;
  raw_captions?: any;
  created_at: string;
  updated_at?: string;
}

export interface CoachingMessage {
  id: string;
  session_id: string;
  speaker_type: string;
  content: string;
  timestamp: string;
  confidence_score?: number;
}

export interface SessionSummary {
  session_id: string;
  urgency_level: string;
  primary_issue: string;
  recommendations: any;
  follow_up_steps: any;
  analysis_data: any;
  created_at: string;
}

// Database Service Class
class DatabaseService {
  // User Operations
  async getUser(userId: string): Promise<{ data: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updateUser(userId: string, updates: Partial<AuthUser>): Promise<{ data: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Pet Operations
  async getUserPets(userId: string): Promise<{ data: Pet[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async createPet(pet: Omit<Pet, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Pet | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pets')
        .insert(pet)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updatePet(petId: string, updates: Partial<Pet>): Promise<{ data: Pet | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pets')
        .update(updates)
        .eq('id', petId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async deletePet(petId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId);

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Chat Operations
  async getUserChats(userId: string): Promise<{ data: Chat[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async createChat(userId: string, title?: string): Promise<{ data: Chat | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: userId,
          title: title || `Chat ${new Date().toLocaleDateString()}`
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updateChat(chatId: string, updates: Partial<Chat>): Promise<{ data: Chat | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .update(updates)
        .eq('id', chatId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async deleteChat(chatId: string): Promise<{ error: string | null }> {
    try {
      // First, explicitly delete all chat messages for this chat
      // This ensures complete cleanup even if CASCADE doesn't work as expected
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('chat_id', chatId);

      if (messagesError) {
        console.error('Error deleting chat messages:', messagesError);
        throw messagesError;
      }

      // Then delete the chat itself
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (chatError) {
        console.error('Error deleting chat:', chatError);
        throw chatError;
      }

      console.log(`✅ Successfully deleted chat ${chatId} and all its messages`);
      return { error: null };
    } catch (error: any) {
      console.error('❌ Failed to delete chat:', error);
      return { error: error.message };
    }
  }

  async deleteAllUserChats(userId: string): Promise<{ error: string | null }> {
    try {
      // First get all chat IDs for this user
      const { data: chats, error: fetchError } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', userId);
      
      if (fetchError) {
        console.error('Error fetching user chats:', fetchError);
        throw fetchError;
      }
      
      if (!chats || chats.length === 0) {
        console.log('No chats found to delete');
        return { error: null };
      }
      
      const chatIds = chats.map(chat => chat.id);
      
      // Delete all messages for these chats
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .in('chat_id', chatIds);
      
      if (messagesError) {
        console.error('Error deleting chat messages:', messagesError);
        throw messagesError;
      }
      
      // Delete all chats
      const { error: chatsError } = await supabase
        .from('chats')
        .delete()
        .in('id', chatIds);
      
      if (chatsError) {
        console.error('Error deleting chats:', chatsError);
        throw chatsError;
      }
      
      console.log(`✅ Successfully deleted all chats and messages for user ${userId}`);
      return { error: null };
    } catch (error: any) {
      console.error('❌ Failed to delete all user chats:', error);
      return { error: error.message };
    }
  }

  // Chat Message Operations
  async getChatMessages(chatId: string): Promise<{ data: ChatMessage[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async createChatMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<{ data: ChatMessage | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Coaching Operations - Updated to use ai_coaching_sessions table
  async getCoachingSessions(userId: string): Promise<{ data: CoachingSession[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ai_coaching_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async createCoachingSession(session: Omit<CoachingSession, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: CoachingSession | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ai_coaching_sessions')
        .insert(session)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updateCoachingSession(sessionId: string, updates: Partial<CoachingSession>): Promise<{ data: CoachingSession | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ai_coaching_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getCoachingMessages(sessionId: string): Promise<{ data: CoachingMessage[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('coaching_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async createCoachingMessage(message: Omit<CoachingMessage, 'id' | 'timestamp'>): Promise<{ data: CoachingMessage | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('coaching_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async createSessionSummary(summary: Omit<SessionSummary, 'created_at'>): Promise<{ data: SessionSummary | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('session_summaries')
        .upsert(summary)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getSessionSummary(sessionId: string): Promise<{ data: SessionSummary | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('session_summaries')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Badge Operations - Fixed: Updated to use earned_at instead of awarded_at
  async getUserBadges(userId: string): Promise<{ data: UserBadge[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          user_id,
          badge_id,
          earned_at,
          badge:badges(*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getAllBadges(): Promise<{ data: Badge[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async awardBadge(userId: string, badgeId: string): Promise<{ data: UserBadge | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId
        })
        .select(`
          user_id,
          badge_id,
          earned_at,
          badge:badges(*)
        `)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Subscription Operations
  async getUserSubscription(userId: string): Promise<{ data: Subscription | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updateSubscription(userId: string, updates: Partial<Subscription>): Promise<{ data: Subscription | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Symptom Assessment Operations
  async getUserSymptomAssessments(userId: string): Promise<{ data: SymptomAssessment[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('symptom_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async createSymptomAssessment(assessment: Omit<SymptomAssessment, 'id' | 'created_at'>): Promise<{ data: SymptomAssessment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('symptom_assessments')
        .insert({
          user_id: assessment.user_id,
          symptoms_selected: assessment.symptoms_selected,
          urgency_level: assessment.urgency_level,
          ai_analysis: assessment.ai_analysis,
          immediate_actions: assessment.immediate_actions,
          warnings: assessment.warnings,
          vet_recommendation: assessment.vet_recommendation,
          possible_causes: assessment.possible_causes,
          user_location: assessment.user_location,
          assessment_data: assessment.assessment_data
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Successfully saved symptom assessment to database');
      return { data, error: null };
    } catch (error: any) {
      console.error('❌ Failed to save symptom assessment:', error);
      return { data: null, error: error.message };
    }
  }

  async getSymptomAssessment(assessmentId: string): Promise<{ data: SymptomAssessment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('symptom_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async deleteSymptomAssessment(assessmentId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('symptom_assessments')
        .delete()
        .eq('id', assessmentId);

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Get assessment statistics for a user
  async getUserAssessmentStats(userId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('symptom_assessments')
        .select('urgency_level, created_at')
        .eq('user_id', userId);

      if (error) throw error;

      // Process the data to get statistics
      const stats = {
        total_assessments: data?.length || 0,
        emergency_count: data?.filter(a => a.urgency_level === 'emergency').length || 0,
        moderate_count: data?.filter(a => a.urgency_level === 'moderate').length || 0,
        mild_count: data?.filter(a => a.urgency_level === 'mild').length || 0,
        last_assessment: data?.length > 0 ? data[0].created_at : null,
      };

      return { data: stats, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Real-time subscriptions - FIXED: Return channel without subscribing
  subscribeToUserChats(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`user-chats-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `user_id=eq.${userId}`
        },
        callback
      );
    // Note: Don't call .subscribe() here - let the hook handle it
  }

  subscribeToChatMessages(chatId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`chat-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        callback
      );
    // Note: Don't call .subscribe() here - let the hook handle it
  }

  // Real-time subscription for user pets
  subscribeToUserPets(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`pets-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pets',
          filter: `user_id=eq.${userId}`
        },
        callback
      );
    // Note: Don't call .subscribe() here - let the hook handle it
  }
}

export const databaseService = new DatabaseService();