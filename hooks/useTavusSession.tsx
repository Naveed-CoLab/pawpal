import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { 
  tavusLiveService, 
  TavusLiveSession, 
  CoachingSessionMetadata, 
} from '@/lib/tavusLiveService';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export interface SessionState {
  status: 'idle' | 'connecting' | 'connected' | 'live' | 'ending' | 'ended' | 'error';
  duration: number;
  error: string | null;
}

export function useTavusSession() {
  const { showSnackbar } = useSnackbar();
  
  // Session state (simplified - no live audio/speaking states)
  const [sessionState, setSessionState] = useState<SessionState>({
    status: 'idle',
    duration: 0,
    error: null,
  });
  
  // Session data
  const [currentSession, setCurrentSession] = useState<TavusLiveSession | null>(null);
  
  // Refs for timers and cleanup
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // App state handler for background/foreground
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (nextAppState === 'background' && sessionState.status === 'live') {
      console.log('🔄 App backgrounded during live session - maintaining session');
      showSnackbar('Session continues in background', 'info');
    } else if (nextAppState === 'active' && sessionState.status === 'live') {
      console.log('🔄 App foregrounded during live session');
      showSnackbar('Welcome back to your session', 'success');
    }
  }, [sessionState.status, showSnackbar]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  // Session timer effect
  useEffect(() => {
    if (sessionState.status === 'live') {
      sessionTimer.current = setInterval(() => {
        setSessionState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);
    } else {
      if (sessionTimer.current) {
        clearInterval(sessionTimer.current);
        sessionTimer.current = null;
      }
    }

    return () => {
      if (sessionTimer.current) {
        clearInterval(sessionTimer.current);
      }
    };
  }, [sessionState.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  /**
   * Start a new Tavus LIVE coaching session
   */
  const startSession = useCallback(async (metadata: CoachingSessionMetadata): Promise<boolean> => {
    try {
      console.log('🎬 Starting new Tavus LIVE session...');
      
      setSessionState(prev => ({
        ...prev,
        status: 'connecting',
        error: null,
        duration: 0,
      }));
      
      // Create Tavus session
      const session = await tavusLiveService.createLiveSession(metadata);
      setCurrentSession(session);

      setSessionState(prev => ({
        ...prev,
        status: 'connected',
      }));

      // Set max duration timer (3 minutes hard cutoff)
      maxDurationTimer.current = setTimeout(() => {
        console.log('⏰ Max session duration reached - ending session');
        endSession('Maximum session duration reached');
      }, (session.max_duration_seconds || 180) * 1000);

      // Wait for connection to be established
      setTimeout(() => {
        setSessionState(prev => ({
          ...prev,
          status: 'live',
        }));
      }, 2000);

      console.log('✅ Tavus LIVE session started successfully');
      console.log('🎯 Transcript will be processed via webhook when session ends');
      showSnackbar('Live session with Luna started!', 'success');
      
      return true;
    } catch (error) {
      console.error('💥 Failed to start Tavus session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start session';
      
      setSessionState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
      
      showSnackbar(`Session failed: ${errorMessage}`, 'error');
      return false;
    }
  }, [showSnackbar]);

  /**
   * End the current session
   */
  const endSession = useCallback(async (reason?: string): Promise<void> => {
    if (!currentSession || sessionState.status === 'ending' || sessionState.status === 'ended') {
      return;
    }

    try {
      console.log('🏁 Ending Tavus session...', reason ? `Reason: ${reason}` : '');
      
      setSessionState(prev => ({
        ...prev,
        status: 'ending',
      }));

      // Clear timers
      if (maxDurationTimer.current) {
        clearTimeout(maxDurationTimer.current);
        maxDurationTimer.current = null;
      }

      // End Tavus session
      await tavusLiveService.endSession(currentSession.session_id || currentSession.conversation_id);

      setSessionState(prev => ({
        ...prev,
        status: 'ended',
      }));

      console.log('✅ Tavus session ended successfully');
      console.log('🎯 Transcript processing will happen automatically via webhook');
      showSnackbar(
        reason || 'Session completed successfully', 
        reason?.includes('Maximum') ? 'warning' : 'success'
      );

    } catch (error) {
      console.error('💥 Error ending session:', error);
      setSessionState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to end session properly',
      }));
    }
  }, [currentSession, sessionState.status, showSnackbar]);

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up Tavus session...');
    
    // Clear all timers
    if (sessionTimer.current) {
      clearInterval(sessionTimer.current);
      sessionTimer.current = null;
    }
    
    if (maxDurationTimer.current) {
      clearTimeout(maxDurationTimer.current);
      maxDurationTimer.current = null;
    }
  }, []);

  /**
   * Get formatted session duration
   */
  const getFormattedDuration = useCallback((): string => {
    const mins = Math.floor(sessionState.duration / 60);
    const secs = sessionState.duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [sessionState.duration]);

  return {
    // State
    sessionState,
    currentSession,
    
    // Actions
    startSession,
    endSession,
    cleanup,
    
    // Computed
    getFormattedDuration,
    isSessionActive: sessionState.status === 'live',
    isConnected: sessionState.status === 'live', // Simplified - no WebSocket to check
    
    // Legacy compatibility (removed)
    liveTranscript: [], // Empty - transcripts processed via webhook
    finalTranscript: null, // Will be available in Supabase after processing
    sessionSummary: null, // Will be available in Supabase after processing
    reconnect: async () => true, // No-op since no WebSocket
    generateSummary: async () => {}, // Handled by webhook
  };
}
