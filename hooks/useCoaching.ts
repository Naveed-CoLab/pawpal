import { useState, useEffect } from 'react';
import { databaseService } from '@/lib/database';
import { tavusService, TavusSession, TavusMessage, CoachingSessionData, SessionSummary } from '@/lib/tavusService';
import { useAuth } from './useAuth';

export interface CoachingSession {
  id: string;
  user_id: string;
  pet_id?: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'cancelled';
  tavus_session_id?: string;
  primary_concern?: string;
  session_data?: CoachingSessionData;
  created_at: string;
  updated_at: string;
}

export function useCoaching() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<TavusSession | null>(null);
  const [sessionMessages, setSessionMessages] = useState<TavusMessage[]>([]);

  const fetchSessions = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await databaseService.getCoachingSessions(user.id);
      
      if (error) {
        setError(error);
      } else {
        setSessions(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (
    sessionData: CoachingSessionData
  ): Promise<{ data: CoachingSession | null; error: string | null }> => {
    if (!user?.id) return { data: null, error: 'No user found' };
    
    try {
      console.log('🎬 Starting new coaching session with Luna...');
      
      // Create Tavus session with Luna
      const tavusSession = await tavusService.createCoachingSession(sessionData);
      setCurrentSession(tavusSession);
      setSessionMessages([]);
      
      // Store session in database
      const dbSessionData = {
        user_id: user.id,
        tavus_session_id: tavusSession.session_id,
        primary_concern: sessionData.user_concern,
        status: 'active' as const,
        start_time: new Date().toISOString(),
        session_data: sessionData
      };

      const { data, error } = await databaseService.createCoachingSession(dbSessionData);
      
      if (error) {
        return { data: null, error };
      }
      
      const newSession = data;
      setSessions(prev => [newSession, ...prev]);
      
      console.log('✅ Coaching session created and stored');
      return { data: newSession, error: null };
    } catch (err) {
      console.error('💥 Error creating coaching session:', err);
      return { data: null, error: err instanceof Error ? err.message : 'Failed to create session' };
    }
  };

  const sendMessage = async (
    sessionId: string, 
    message: string
  ): Promise<{ data: TavusMessage | null; error: string | null }> => {
    try {
      if (!currentSession) {
        return { data: null, error: 'No active session' };
      }

      console.log('💬 Sending message to Luna...');
      
      // Add user message to local state immediately
      const userMessage: TavusMessage = {
        id: `user_${Date.now()}`,
        session_id: currentSession.session_id,
        speaker_type: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      
      setSessionMessages(prev => [...prev, userMessage]);

      // Send to Tavus and get Luna's response
      const aiResponse = await tavusService.sendMessage(currentSession.session_id, message);
      
      // Add AI response to local state
      setSessionMessages(prev => [...prev, aiResponse]);
      
      // Store both messages in database
      await databaseService.createCoachingMessage({
        session_id: sessionId,
        speaker_type: 'user',
        content: message
      });
      
      await databaseService.createCoachingMessage({
        session_id: sessionId,
        speaker_type: 'ai',
        content: aiResponse.content,
        confidence_score: aiResponse.confidence_score
      });
      
      console.log('✅ Message exchange completed');
      return { data: aiResponse, error: null };
    } catch (err) {
      console.error('💥 Error in message exchange:', err);
      return { data: null, error: err instanceof Error ? err.message : 'Failed to send message' };
    }
  };

  const endSession = async (sessionId: string): Promise<{ error: string | null }> => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session?.tavus_session_id || !currentSession) {
        return { error: 'Session not found' };
      }

      console.log('🏁 Ending coaching session with Luna...');

      // End Tavus session
      await tavusService.endSession(currentSession.session_id);
      
      // Update database
      const { error } = await databaseService.updateCoachingSession(sessionId, {
        status: 'completed',
        end_time: new Date().toISOString()
      });
      
      if (error) {
        return { error };
      }
      
      // Update local state
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, status: 'completed', ended_at: new Date().toISOString() }
          : s
      ));
      
      // Clear current session
      setCurrentSession(null);
      setSessionMessages([]);
      
      console.log('✅ Coaching session ended successfully');
      return { error: null };
    } catch (err) {
      console.error('💥 Error ending session:', err);
      return { error: err instanceof Error ? err.message : 'Failed to end session' };
    }
  };

  const generateSummary = async (sessionId: string): Promise<{ data: SessionSummary | null; error: string | null }> => {
    try {
      console.log('📋 Generating session summary...');
      
      // Get session transcript
      const session = sessions.find(s => s.id === sessionId);
      if (!session?.tavus_session_id) {
        return { data: null, error: 'Session not found' };
      }

      const transcript = await tavusService.getSessionTranscript(session.tavus_session_id);
      
      // Generate summary using AI
      const summary = await tavusService.generateSessionSummary(transcript);
      
      // Store summary in database
      const summaryData = {
        session_id: sessionId,
        urgency_level: summary.urgency_level,
        primary_issue: summary.main_topic,
        recommendations: summary.recommendations,
        follow_up_steps: summary.next_steps,
        analysis_data: {
          ...summary,
          transcript_length: transcript.length,
          session_duration: tavusService.getSessionDuration()
        }
      };

      const { error: summaryError } = await databaseService.createSessionSummary(summaryData);
      
      if (summaryError) {
        return { data: null, error: summaryError };
      }
      
      console.log('✅ Session summary generated and stored');
      return { data: summary, error: null };
    } catch (err) {
      console.error('💥 Error generating summary:', err);
      return { data: null, error: err instanceof Error ? err.message : 'Failed to generate summary' };
    }
  };

  const getSessionTranscript = async (sessionId: string): Promise<TavusMessage[]> => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session?.tavus_session_id) {
        return [];
      }

      return await tavusService.getSessionTranscript(session.tavus_session_id);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user?.id]);

  return {
    sessions,
    loading,
    error,
    currentSession,
    sessionMessages,
    createSession,
    sendMessage,
    endSession,
    generateSummary,
    getSessionTranscript,
    refetch: fetchSessions,
    isSessionActive: !!currentSession && tavusService.isSessionActive(),
  };
}