import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { 
  tavusLiveService, 
  TavusLiveSession, 
  TavusWebSocketMessage, 
  TavusCaption, 
  TavusTranscript, 
  CoachingSessionMetadata, 
  SessionSummary 
} from '@/lib/tavusLiveService';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export interface SessionState {
  status: 'idle' | 'connecting' | 'connected' | 'live' | 'ending' | 'ended' | 'error';
  duration: number;
  isListening: boolean;
  isSpeaking: boolean;
  error: string | null;
}

export interface SessionMetrics {
  startTime: number;
  endTime?: number;
  totalDuration: number;
  messageCount: number;
  captionCount: number;
}

export function useTavusSession() {
  const { showSnackbar } = useSnackbar();
  
  // Session state
  const [sessionState, setSessionState] = useState<SessionState>({
    status: 'idle',
    duration: 0,
    isListening: false,
    isSpeaking: false,
    error: null,
  });
  
  // Session data
  const [currentSession, setCurrentSession] = useState<TavusLiveSession | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<TavusCaption[]>([]);
  const [finalTranscript, setFinalTranscript] = useState<TavusTranscript | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  
  // Refs for timers and cleanup
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metricsRef = useRef<SessionMetrics>({
    startTime: 0,
    totalDuration: 0,
    messageCount: 0,
    captionCount: 0,
  });

  // App state handler for background/foreground
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (nextAppState === 'background' && sessionState.status === 'live') {
      console.log('🔄 App backgrounded during live session - maintaining connection');
      // Keep session alive but show notification
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
      
      setLiveTranscript([]);
      setFinalTranscript(null);
      setSessionSummary(null);
      
      // Initialize metrics
      metricsRef.current = {
        startTime: Date.now(),
        totalDuration: 0,
        messageCount: 0,
        captionCount: 0,
      };

      // Create Tavus session
      const session = await tavusLiveService.createLiveSession(metadata);
      setCurrentSession(session);

      // Connect WebSocket
      tavusLiveService.connectWebSocket(
        session.ws_url,
        handleWebSocketMessage,
        handleLiveCaption,
        handleWebSocketError
      );

      // Set max duration timer (3 minutes hard cutoff)
      maxDurationTimer.current = setTimeout(() => {
        console.log('⏰ Max session duration reached - ending session');
        endSession('Maximum session duration reached');
      }, session.max_duration_seconds * 1000);

      setSessionState(prev => ({
        ...prev,
        status: 'connected',
      }));

      // Wait for connection to be established
      setTimeout(() => {
        setSessionState(prev => ({
          ...prev,
          status: 'live',
          isListening: true,
        }));
      }, 2000);

      console.log('✅ Tavus LIVE session started successfully');
      showSnackbar('Live session with James started!', 'success');
      
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
        isListening: false,
        isSpeaking: false,
      }));

      // Clear timers
      if (maxDurationTimer.current) {
        clearTimeout(maxDurationTimer.current);
        maxDurationTimer.current = null;
      }
      
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
        silenceTimer.current = null;
      }

      // End Tavus session
      await tavusLiveService.endSession(currentSession.session_id);

      // Update metrics
      metricsRef.current.endTime = Date.now();
      metricsRef.current.totalDuration = Math.floor(
        (metricsRef.current.endTime - metricsRef.current.startTime) / 1000
      );

      setSessionState(prev => ({
        ...prev,
        status: 'ended',
      }));

      // Generate summary after a brief delay
      setTimeout(() => {
        generateSummary();
      }, 2000);

      console.log('✅ Tavus session ended successfully');
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
   * Handle WebSocket messages
   */
  const handleWebSocketMessage = useCallback((message: TavusWebSocketMessage) => {
    console.log('📨 WebSocket message:', message.type);
    
    switch (message.type) {
      case 'conversation.started':
        console.log('🎙️ Conversation started');
        setSessionState(prev => ({ ...prev, status: 'live' }));
        break;

      case 'application.ended':
        console.log('🔚 Application ended by Tavus');
        endSession('Session ended by system');
        break;

      case 'transcription_ready':
        console.log('📝 Transcription ready - fetching final transcript');
        fetchFinalTranscript();
        break;

      case 'error':
        console.error('❌ WebSocket error:', message.data);
        setSessionState(prev => ({
          ...prev,
          status: 'error',
          error: message.data.message || 'WebSocket error',
        }));
        break;
    }

    metricsRef.current.messageCount++;
  }, [endSession]);

  /**
   * Handle live captions
   */
  const handleLiveCaption = useCallback((caption: TavusCaption) => {
    console.log(`💬 Live caption [${caption.speaker}]:`, caption.text);
    
    setLiveTranscript(prev => [...prev, caption]);
    metricsRef.current.captionCount++;

    // Update speaking/listening state
    if (caption.speaker === 'ai' && caption.is_final) {
      setSessionState(prev => ({
        ...prev,
        isSpeaking: true,
        isListening: false,
      }));
      
      // Reset to listening after AI finishes speaking
      setTimeout(() => {
        setSessionState(prev => ({
          ...prev,
          isSpeaking: false,
          isListening: true,
        }));
      }, 2000);
    } else if (caption.speaker === 'user') {
      // Reset silence timer when user speaks
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
      
      setSessionState(prev => ({
        ...prev,
        isListening: true,
        isSpeaking: false,
      }));

      // Start silence timer for participant left timeout
      if (caption.is_final) {
        silenceTimer.current = setTimeout(() => {
          console.log('🔇 User silence timeout reached');
          endSession('User inactive for too long');
        }, 15000); // 15 seconds
      }
    }
  }, [endSession]);

  /**
   * Handle WebSocket errors
   */
  const handleWebSocketError = useCallback((error: string) => {
    console.error('🚨 WebSocket error:', error);
    
    setSessionState(prev => ({
      ...prev,
      status: 'error',
      error: error,
    }));

    showSnackbar(`Connection error: ${error}`, 'error');
  }, [showSnackbar]);

  /**
   * Fetch final transcript
   */
  const fetchFinalTranscript = useCallback(async () => {
    if (!currentSession) return;

    try {
      console.log('📄 Fetching final transcript...');
      const transcript = await tavusLiveService.getFinalTranscript(currentSession.session_id);
      setFinalTranscript(transcript);
      
      console.log('✅ Final transcript received');
      showSnackbar('Session transcript ready', 'success');
    } catch (error) {
      console.error('💥 Failed to fetch transcript:', error);
      showSnackbar('Failed to fetch transcript', 'error');
    }
  }, [currentSession, showSnackbar]);

  /**
   * Generate session summary
   */
  const generateSummary = useCallback(async () => {
    if (!currentSession || !finalTranscript) {
      // Use live transcript as fallback
      const fallbackTranscript = {
        session_id: currentSession?.session_id || '',
        captions: liveTranscript,
        full_text: liveTranscript
          .filter(c => c.is_final)
          .map(c => `${c.speaker.toUpperCase()}: ${c.text}`)
          .join('\n'),
        duration_seconds: sessionState.duration,
      };
      
      try {
        console.log('🤖 Generating session summary...');
        showSnackbar('Generating session summary...', 'info');
        
        const summary = await tavusLiveService.generateSessionSummary(fallbackTranscript);
        setSessionSummary(summary);
        
        console.log('✅ Session summary generated');
        showSnackbar('✅ Your coaching summary is ready!', 'success');
      } catch (error) {
        console.error('💥 Failed to generate summary:', error);
        showSnackbar('Failed to generate summary', 'error');
      }
      return;
    }

    try {
      console.log('🤖 Generating session summary...');
      showSnackbar('Generating session summary...', 'info');
      
      const summary = await tavusLiveService.generateSessionSummary(finalTranscript);
      setSessionSummary(summary);
      
      console.log('✅ Session summary generated');
      showSnackbar('✅ Your coaching summary is ready!', 'success');
    } catch (error) {
      console.error('💥 Failed to generate summary:', error);
      showSnackbar('Failed to generate summary', 'error');
    }
  }, [currentSession, finalTranscript, liveTranscript, sessionState.duration, showSnackbar]);

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
    
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }

    // Disconnect WebSocket
    tavusLiveService.disconnect();
    
    // Clear caption buffer
    tavusLiveService.clearCaptionBuffer();
  }, []);

  /**
   * Reconnect to session (for network interruptions)
   */
  const reconnect = useCallback(async (): Promise<boolean> => {
    if (!currentSession) return false;

    try {
      console.log('🔄 Attempting to reconnect...');
      showSnackbar('Reconnecting...', 'info');

      // Reconnect WebSocket
      tavusLiveService.connectWebSocket(
        currentSession.ws_url,
        handleWebSocketMessage,
        handleLiveCaption,
        handleWebSocketError
      );

      // Wait for connection
      setTimeout(() => {
        if (tavusLiveService.isConnected()) {
          setSessionState(prev => ({
            ...prev,
            status: 'live',
            error: null,
          }));
          showSnackbar('Reconnected successfully!', 'success');
        }
      }, 2000);

      return true;
    } catch (error) {
      console.error('💥 Reconnection failed:', error);
      showSnackbar('Reconnection failed', 'error');
      return false;
    }
  }, [currentSession, handleWebSocketMessage, handleLiveCaption, handleWebSocketError, showSnackbar]);

  /**
   * Get formatted session duration
   */
  const getFormattedDuration = useCallback((): string => {
    const mins = Math.floor(sessionState.duration / 60);
    const secs = sessionState.duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [sessionState.duration]);

  /**
   * Get session metrics
   */
  const getSessionMetrics = useCallback((): SessionMetrics => {
    return {
      ...metricsRef.current,
      totalDuration: sessionState.duration,
    };
  }, [sessionState.duration]);

  return {
    // State
    sessionState,
    currentSession,
    liveTranscript,
    finalTranscript,
    sessionSummary,
    
    // Actions
    startSession,
    endSession,
    reconnect,
    generateSummary,
    cleanup,
    
    // Computed
    getFormattedDuration,
    getSessionMetrics,
    isSessionActive: sessionState.status === 'live',
    isConnected: tavusLiveService.isConnected(),
  };
}
