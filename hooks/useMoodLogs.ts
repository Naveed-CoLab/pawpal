import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { MoodAnalysisResult } from '@/lib/moodAnalysisAPI';
import { Pet } from '@/lib/database';

export interface MoodLog {
  id: string;
  user_id: string;
  pet_id: string;
  mood: string;
  confidence: number;
  cues: string[];
  advice: string;
  context?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MoodStreak {
  id: string;
  user_id: string;
  pet_id: string;
  streak_type: string;
  current_count: number;
  best_count: number;
  last_date: string;
  created_at: string;
  updated_at: string;
}

// Badge checking functionality
const checkMoodBadges = async (
  userId: string, 
  showSnackbar?: (message: string, type?: string) => void,
  currentMoodCount?: number
) => {
  try {
    let moodCount = currentMoodCount;
    
    // If mood count not provided, fetch it
    if (moodCount === undefined) {
      const { data: moodLogs, error } = await supabase
        .from('mood_logs')
        .select('id')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error counting mood logs for badges:', error);
        return;
      }
      moodCount = moodLogs?.length || 0;
    }

    console.log(`🏅 User has ${moodCount} mood logs, checking for badges...`);

    // Award badges based on milestones
    if (moodCount === 1) {
      console.log('🎉 First mood tracking badge earned!');
      showSnackbar?.('🏅 Badge Earned: Mood Detective! You\'re helping us understand your pet better! (+15 points)', 'success');
    } else if (moodCount === 5) {
      console.log('🎉 Emotion expert badge earned!');
      showSnackbar?.('🏅 Badge Earned: Emotion Expert! You really care about their emotional wellbeing! (+30 points)', 'success');
    } else if (moodCount === 10) {
      console.log('🎉 Mood master badge earned!');
      showSnackbar?.('🏅 Badge Earned: Mood Master! You\'re becoming a pet emotion expert! (+60 points)', 'success');
    }
  } catch (error) {
    console.error('❌ Error checking mood badges:', error);
  }
};

export const useMoodLogs = (showSnackbar?: (message: string, type?: string) => void) => {
  const { user } = useAuth();
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [moodStreaks, setMoodStreaks] = useState<MoodStreak[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Test database connection and table existence
  const testDatabaseConnection = async () => {
    console.log('🧪 Testing database connection...');
    
    try {
      // Test basic connection
      const { count: userCount, error: connectionError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });
      
      console.log('🔗 Connection test:', { userCount, connectionError });
      
      // Test mood_logs table existence
      const { count: moodLogCount, error: tableError } = await supabase
        .from('mood_logs')
        .select('id', { count: 'exact', head: true });
      
      console.log('📊 Mood logs table test:', { moodLogCount, tableError });
      
      if (tableError) {
        console.error('❌ mood_logs table error:', tableError);
        if (tableError.message && (tableError.message.includes('relation "mood_logs" does not exist') || 
            tableError.message.includes('Bad Request'))) {
          console.error('🚨 CRITICAL: mood_logs table does not exist! Migration may not have been applied.');
          setError('Database migration needed. Please apply the migration script.');
          return { needsMigration: true };
        }
      }
      
      return { needsMigration: false };
      
    } catch (err) {
      console.error('❌ Database test failed:', err);
    }
  };

  // Fetch mood logs for current user
  const fetchMoodLogs = useCallback(async (petId?: string) => {
    console.log('📖 fetchMoodLogs called:', { userId: user?.id, petId });
    
    if (!user?.id) {
      console.warn('❌ No user ID, skipping fetch');
      setMoodLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (petId) {
        query = query.eq('pet_id', petId);
      }

      console.log('🔍 Executing mood logs query...');
      const { data, error } = await query;

      console.log('📋 Mood logs query result:', { data, error, count: data?.length });

      if (error) {
        if (error.message && (error.message.includes('relation "mood_logs" does not exist') || 
            error.message.includes('Bad Request'))) {
          console.warn('⚠️ mood_logs table not found - migration needed');
          setError('Database migration needed. Please apply the migration script.');
          setMoodLogs([]);
          return;
        }
        throw error;
      }

      setMoodLogs(data || []);
    } catch (err) {
      console.error('❌ Error fetching mood logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch mood logs');
      setMoodLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch mood streaks for current user
  const fetchMoodStreaks = async (petId?: string) => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('mood_streaks')
        .select('*')
        .eq('user_id', user.id);

      if (petId) {
        query = query.eq('pet_id', petId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMoodStreaks(data || []);
    } catch (err) {
      console.error('Error fetching mood streaks:', err);
    }
  };

  // Save a new mood log
  const saveMoodLog = useCallback(async (
    petId: string,
    moodResult: MoodAnalysisResult,
    context?: string,
    imageUrl?: string
  ): Promise<MoodLog | null> => {
    console.log('🏁 saveMoodLog started:', { petId, moodResult, context, imageUrl, userId: user?.id });
    
    if (!user?.id) {
      console.error('❌ User not authenticated:', user);
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📝 Inserting mood log into database...');
      
      // Insert mood log
      const insertData = {
        user_id: user.id,
        pet_id: petId,
        mood: moodResult.mood,
        confidence: moodResult.confidence,
        cues: moodResult.cues,
        advice: moodResult.advice,
        context: context || null,
        image_url: imageUrl || null,
      };
      
      console.log('📊 Insert data:', insertData);
      
      const { data: moodLogData, error: moodLogError } = await supabase
        .from('mood_logs')
        .insert(insertData)
        .select()
        .single();

      console.log('📋 Database response:', { data: moodLogData, error: moodLogError });

      if (moodLogError) {
        if (moodLogError.message && (moodLogError.message.includes('relation "mood_logs" does not exist') || 
            moodLogError.message.includes('Bad Request'))) {
          throw new Error('Database migration needed. Please apply the migration script first.');
        }
        throw moodLogError;
      }

      // Update mood streaks
      const { error: streakError } = await supabase.rpc('update_mood_streak', {
        p_user_id: user.id,
        p_pet_id: petId,
        p_mood: moodResult.mood,
        p_log_date: new Date().toISOString().split('T')[0] // Current date in YYYY-MM-DD format
      });

      if (streakError) {
        console.warn('Error updating mood streak:', streakError);
        // Don't fail the whole operation for streak update errors
      }

      // Refresh data
      await Promise.all([
        fetchMoodLogs(),
        fetchMoodStreaks()
      ]);

      // Check for mood tracking badges
      const newMoodCount = moodLogs.length + 1;
      await checkMoodBadges(user.id, showSnackbar, newMoodCount);

      return moodLogData;
    } catch (err) {
      console.error('Error saving mood log:', err);
      setError(err instanceof Error ? err.message : 'Failed to save mood log');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, moodLogs.length, showSnackbar]);

  // Delete a mood log
  const deleteMoodLog = async (moodLogId: string): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('mood_logs')
        .delete()
        .eq('id', moodLogId)
        .eq('user_id', user.id); // Ensure user can only delete their own logs

      if (error) throw error;

      // Remove from local state
      setMoodLogs(prev => prev.filter(log => log.id !== moodLogId));
      
      return true;
    } catch (err) {
      console.error('Error deleting mood log:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete mood log');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get mood statistics
  const getMoodStats = (logs: MoodLog[] = moodLogs) => {
    if (logs.length === 0) {
      return {
        totalLogs: 0,
        mostCommonMood: null,
        averageConfidence: 0,
        moodCounts: {},
        recentMoods: []
      };
    }

    const moodCounts = logs.reduce((acc, log) => {
      acc[log.mood] = (acc[log.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonMood = Object.entries(moodCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    const averageConfidence = logs.reduce((sum, log) => sum + log.confidence, 0) / logs.length;

    const recentMoods = logs.slice(0, 7); // Last 7 moods

    return {
      totalLogs: logs.length,
      mostCommonMood,
      averageConfidence,
      moodCounts,
      recentMoods
    };
  };

  // Get current streaks for a pet
  const getCurrentStreaks = (petId: string) => {
    return moodStreaks.filter(streak => streak.pet_id === petId);
  };

  // Check if user has achieved any new badges
  const checkForBadges = (newMoodLog: MoodLog) => {
    const achievements = [];
    
    // First mood analysis badge
    if (moodLogs.length === 0) {
      achievements.push('mood_detective');
    }

    // Happy streak badge
    const happyStreak = moodStreaks.find(
      s => s.pet_id === newMoodLog.pet_id && s.streak_type === 'happy'
    );
    if (happyStreak && happyStreak.current_count >= 3) {
      achievements.push('happy_streak');
    }

    // Mood master badge (10 analyses)
    if (moodLogs.length >= 9) { // Will be 10 after adding this one
      achievements.push('mood_master');
    }

    // Daily checker badge (7 day streak)
    const dailyStreak = moodStreaks.find(
      s => s.pet_id === newMoodLog.pet_id && s.streak_type === 'daily_check'
    );
    if (dailyStreak && dailyStreak.current_count >= 7) {
      achievements.push('daily_checker');
    }

    return achievements;
  };

  // Load initial data when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('👤 User authenticated, fetching mood data for user:', user.id);
      testDatabaseConnection(); // Test database first
      fetchMoodLogs();
      fetchMoodStreaks();

      // Ensure only a single subscription exists per mount
      const channelName = `realtime-mood-logs-${user.id}`;
      if (!channelRef.current) {
        // Reuse existing channel if already present on the client
        const existing = (supabase as any).getChannels?.().find((c: any) => c.topic === channelName);
        if (existing) {
          channelRef.current = existing as RealtimeChannel;
        } else {
          const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mood_logs', filter: `user_id=eq.${user.id}` }, () => {
              fetchMoodLogs();
              fetchMoodStreaks();
            });
          channelRef.current = channel;
        }
      }

      // Subscribe only if not already subscribed/joining
      if (channelRef.current && !['joining', 'joined'].includes((channelRef.current as any).state)) {
        channelRef.current.subscribe();
      }

      return () => {
        try {
          if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
          }
        } catch {}
      };
    } else {
      console.log('❌ No user authenticated, clearing mood data');
      setMoodLogs([]);
      setMoodStreaks([]);
    }
  }, [user?.id]);

  return {
    moodLogs,
    moodStreaks,
    loading,
    error,
    saveMoodLog,
    deleteMoodLog,
    fetchMoodLogs,
    fetchMoodStreaks,
    getMoodStats,
    getCurrentStreaks,
    checkForBadges,
    testDatabaseConnection, // Expose for manual testing
  };
};