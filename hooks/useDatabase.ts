import { useState, useEffect, useCallback, useRef } from 'react';
import { databaseService, Pet, Chat, ChatMessage, UserBadge, Subscription, SymptomAssessment } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useSnackbar, ErrorMessages, SuccessMessages } from '@/components/ui/SnackbarProvider';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Global cache for data with timestamp-based expiration
const dataCache = new Map<string, { data: any; timestamp: number }>();
const cacheTimeout = 5 * 60 * 1000; // 5 minutes

// Global pets state and subscription management
let globalPetsState = {
  pets: [] as Pet[],
  loading: true,
  error: null as string | null,
  refreshing: false,
};

let globalPetsSubscription: RealtimeChannel | null = null;
let globalPetsListeners = new Set<(state: typeof globalPetsState) => void>();
let currentUserId: string | null = null;

// Singleton pets manager
const petsManager = {
  subscribe: (listener: (state: typeof globalPetsState) => void) => {
    globalPetsListeners.add(listener);
    listener(globalPetsState); // Send current state immediately
    return () => globalPetsListeners.delete(listener);
  },

  updateState: (newState: Partial<typeof globalPetsState>) => {
    globalPetsState = { ...globalPetsState, ...newState };
    globalPetsListeners.forEach(listener => listener(globalPetsState));
  },

  setupSubscription: async (userId: string) => {
    if (currentUserId === userId && globalPetsSubscription) {
      return; // Already subscribed for this user
    }

    // Cleanup existing subscription
    if (globalPetsSubscription) {
      await globalPetsSubscription.unsubscribe();
      globalPetsSubscription = null;
    }

    currentUserId = userId;

    // Create unique channel
    const channelId = `pets-global-${userId}-${Date.now()}`;
    console.log('🔔 Setting up global pets subscription:', channelId);

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔄 Global pets update:', payload.eventType, 'on channel:', channelId);
          
          // Invalidate cache
          const cacheKey = `pets_${userId}`;
          dataCache.delete(cacheKey);
          
          // Refresh data
          petsManager.fetchPets(userId, true);
        }
      );

    // Subscribe with status callback
    await channel.subscribe((status) => {
      console.log('📡 Global pets subscription status:', status, 'for channel:', channelId);
    });

    globalPetsSubscription = channel;
  },

  fetchPets: async (userId: string, forceRefresh = false) => {
    const cacheKey = `pets_${userId}`;
    
    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = dataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTimeout) {
        console.log('📦 Using cached pets data');
        petsManager.updateState({
          pets: cached.data,
          loading: false,
          error: null,
        });
        return;
      }
    }

    try {
      petsManager.updateState({ 
        loading: !globalPetsState.pets.length, // Don't show loading if we have data
        refreshing: !!globalPetsState.pets.length,
        error: null 
      });

      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pets = data || [];
      
      // Cache the results
      dataCache.set(cacheKey, {
        data: pets,
        timestamp: Date.now(),
      });

      petsManager.updateState({
        pets,
        loading: false,
        refreshing: false,
        error: null,
      });

      console.log('✅ Global pets fetched successfully:', pets.length);
    } catch (error) {
      console.error('❌ Error fetching global pets:', error);
      petsManager.updateState({
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pets',
      });
    }
  },

  cleanup: async () => {
    if (globalPetsSubscription) {
      await globalPetsSubscription.unsubscribe();
      globalPetsSubscription = null;
    }
    currentUserId = null;
    globalPetsListeners.clear();
    globalPetsState = {
      pets: [],
      loading: true,
      error: null,
      refreshing: false,
    };
  }
};

interface DatabaseState {
  pets: Pet[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

// Hook that uses the singleton pets manager
export function usePets() {
  const { user } = useAuth();
  const [state, setState] = useState<DatabaseState>(globalPetsState);

  // Check cache first
  const getCachedData = useCallback((key: string) => {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      console.log('📦 Using cached data for:', key);
      return cached.data;
    }
    return null;
  }, []);

  // Set cache
  const setCachedData = useCallback((key: string, data: any) => {
    dataCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  // Subscribe to global state changes
  useEffect(() => {
    if (!user?.id) {
      setState({
        pets: [],
        loading: false,
        error: null,
        refreshing: false,
      });
      return;
    }

    // Subscribe to global pets state
    const unsubscribe = petsManager.subscribe(setState);

    // Setup subscription and fetch data
    petsManager.setupSubscription(user.id);
    petsManager.fetchPets(user.id);

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  const addPet = useCallback(async (petData: Omit<Pet, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('pets')
        .insert([
          {
            ...petData,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Pet added successfully');
      // Real-time subscription will handle the update
      return data;
    } catch (error) {
      console.error('❌ Error adding pet:', error);
      throw error;
    }
  }, [user?.id]);

  const updatePet = useCallback(async (petId: string, updates: Partial<Pet>) => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', petId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Pet updated successfully');
      // Real-time subscription will handle the update
      return data;
    } catch (error) {
      console.error('❌ Error updating pet:', error);
      throw error;
    }
  }, []);

  const deletePet = useCallback(async (petId: string) => {
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId);

      if (error) throw error;

      console.log('✅ Pet deleted successfully');
      // Real-time subscription will handle the update
    } catch (error) {
      console.error('❌ Error deleting pet:', error);
      throw error;
    }
  }, []);

  const refresh = useCallback(() => {
    if (user?.id) {
      petsManager.fetchPets(user.id, true);
    }
  }, [user?.id]);

  return {
    pets: state.pets,
    loading: state.loading,
    error: state.error,
    refreshing: state.refreshing,
    addPet,
    createPet: addPet,
    updatePet,
    deletePet,
    refetch: refresh,
  };
}

// Hook for managing user chats
export function useChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await databaseService.getUserChats(user.id);
    
    if (error) {
      setError(error);
    } else {
      setChats(data || []);
    }
    setLoading(false);
  }, [user?.id]);

  const createChat = async (title?: string) => {
    if (!user?.id) return { data: null, error: 'No user found' };
    
    const { data, error } = await databaseService.createChat(user.id, title);
    
    if (!error && data) {
      setChats(prev => [data, ...prev]);
    }
    
    return { data, error };
  };

  const updateChat = async (chatId: string, updates: Partial<Chat>) => {
    const { data, error } = await databaseService.updateChat(chatId, updates);
    
    if (!error && data) {
      setChats(prev => prev.map(chat => chat.id === chatId ? data : chat));
    }
    
    return { data, error };
  };

  const deleteChat = async (chatId: string) => {
    const { error } = await databaseService.deleteChat(chatId);
    
    if (!error) {
      setChats(prev => prev.filter(chat => chat.id !== chatId));
    }
    
    return { error };
  };

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Set up real-time subscription for chats with unique channel per hook instance
  useEffect(() => {
    if (!user?.id) return;

    // Create a unique channel name to avoid conflicts between multiple hook instances
    const channelId = `chats-${user.id}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('🔔 Setting up chats subscription:', channelId);
    
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('🔄 Chat change detected:', payload.eventType, 'on channel:', channelId);
          // Directly update state when chat changes occur
          databaseService.getUserChats(user.id).then(({ data, error }) => {
            if (!error && data) {
              setChats(data);
            }
          });
        }
      );

    // Subscribe to the channel
    const subscription = channel.subscribe((status: any) => {
      console.log('📡 Chats subscription status:', status, 'for channel:', channelId);
    });

    return () => {
      console.log('🔌 Unsubscribing from chats channel:', channelId);
      subscription?.unsubscribe();
    };
  }, [user?.id]); // Only depend on user.id

  return {
    chats,
    loading,
    error,
    createChat,
    updateChat,
    deleteChat,
    refetch: fetchChats
  };
}

// Hook for managing chat messages
export function useChatMessages(chatId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    
    setLoading(true);
    const { data, error } = await databaseService.getChatMessages(chatId);
    
    if (error) {
      setError(error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }, [chatId]);

  const createMessage = async (messageData: Omit<ChatMessage, 'id' | 'created_at'>) => {
    const { data, error } = await databaseService.createChatMessage(messageData);
    
    if (!error && data) {
      setMessages(prev => [...prev, data]);
    }
    
    return { data, error };
  };

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [chatId, fetchMessages]);

  // Set up real-time subscription for messages with unique channel per hook instance
  useEffect(() => {
    if (!chatId) return;

    // Create a unique channel name to avoid conflicts between multiple hook instances
    const channelId = `messages-${chatId}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('🔔 Setting up messages subscription:', channelId);
    
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload: any) => {
          console.log('🔄 Message change detected:', payload.eventType, 'on channel:', channelId);
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new]);
          }
        }
      );

    // Subscribe to the channel
    const subscription = channel.subscribe((status: any) => {
      console.log('📡 Messages subscription status:', status, 'for channel:', channelId);
    });

    return () => {
      console.log('🔌 Unsubscribing from messages channel:', channelId);
      subscription?.unsubscribe();
    };
  }, [chatId]); // Only depend on chatId

  return {
    messages,
    loading,
    error,
    createMessage,
    refetch: fetchMessages
  };
}

// Hook for managing user badges
export function useUserBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await databaseService.getUserBadges(user.id);
    
    if (error) {
      setError(error);
    } else {
      setBadges(data || []);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  return {
    badges,
    loading,
    error,
    refetch: fetchBadges
  };
}

// Hook for managing user subscription
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await databaseService.getUserSubscription(user.id);
    
    if (error) {
      setError(error);
    } else {
      setSubscription(data);
    }
    setLoading(false);
  }, [user?.id]);

  const updateSubscription = async (updates: Partial<Subscription>) => {
    if (!user?.id) return { data: null, error: 'No user found' };
    
    const { data, error } = await databaseService.updateSubscription(user.id, updates);
    
    if (!error && data) {
      setSubscription(data);
    }
    
    return { data, error };
  };

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    updateSubscription,
    refetch: fetchSubscription
  };
}

// Hook for managing symptom assessments
export function useSymptomAssessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<SymptomAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await databaseService.getUserSymptomAssessments(user.id);
    
    if (error) {
      setError(error);
    } else {
      setAssessments(data || []);
    }
    setLoading(false);
  }, [user?.id]);

  const createAssessment = async (assessmentData: Omit<SymptomAssessment, 'id' | 'created_at' | 'user_id'>) => {
    if (!user?.id) return { data: null, error: 'No user found' };
    
    const { data, error } = await databaseService.createSymptomAssessment({
      ...assessmentData,
      user_id: user.id
    });
    
    if (!error && data) {
      setAssessments(prev => [data, ...prev]);
    }
    
    return { data, error };
  };

  const deleteAssessment = async (assessmentId: string) => {
    const { error } = await databaseService.deleteSymptomAssessment(assessmentId);
    
    if (!error) {
      setAssessments(prev => prev.filter(assessment => assessment.id !== assessmentId));
    }
    
    return { error };
  };

  const getAssessmentStats = async () => {
    if (!user?.id) return { data: null, error: 'No user found' };
    
    const { data, error } = await databaseService.getUserAssessmentStats(user.id);
    return { data, error };
  };

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  return {
    assessments,
    loading,
    error,
    createAssessment,
    deleteAssessment,
    getAssessmentStats,
    refetch: fetchAssessments
  };
}

// Clear cache function for testing
export const clearDataCache = () => {
  dataCache.clear();
  console.log('🗑️ Data cache cleared');
};