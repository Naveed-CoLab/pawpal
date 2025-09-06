import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Video } from 'expo-av';
import { WebView } from 'react-native-webview';
import { CameraView } from '@/components/ui/CameraView';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/hooks/useAuth';
import { useTavusSession } from '@/hooks/useTavusSession';
import { useMediaAccess } from '@/hooks/useMediaAccess';
import { databaseService } from '@/lib/database';
import { 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  PhoneOff, 
  Clock,
  Wifi,
  WifiOff,
  ArrowLeft
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function CoachLiveScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { 
    sessionState, 
    currentSession,
    startSession,
    endSession,
    getFormattedDuration,
    isSessionActive,
    isConnected
  } = useTavusSession();
  
  const { 
    toggleVideo, 
    toggleAudio, 
    hasCamera, 
    hasMicrophone 
  } = useMediaAccess();

  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<Video>(null);

  // Session metadata from params
  const sessionMetadata = {
    pet_name: params.petName as string,
    pet_breed: params.petBreed as string,
    pet_age: params.petAge as string,
    pet_weight: params.petWeight as string,
    user_concern: params.concern as string,
    // Pass user full name for personalization (following judge's feedback)
    user_name: user?.name || user?.full_name || 'Pet Parent',
    user_full_name: user?.full_name || user?.name || 'Pet Parent',
    // Pass topic context for focused coaching
    topic_context: params.topicContext as string,
  };

  // Start Tavus session on mount
  useEffect(() => {
    initializeSession();
    
    return () => {
      // Cleanup on unmount
      if (isSessionActive) {
        endSession('User left screen');
      }
    };
  }, []);

  // Create database session when Tavus session starts
  useEffect(() => {
    if (currentSession && !dbSessionId) {
      createDatabaseSession();
    }
  }, [currentSession]);

  // Handle session completion
  useEffect(() => {
    if (sessionState.status === 'ended') {
      updateDatabaseSession();
      // Navigate to summary after a brief delay
      setTimeout(() => {
        // Always go to coach history - summaries will be available there via webhook
          router.replace('/coach/history');
      }, 2000);
    }
  }, [sessionState.status]);

  const initializeSession = async () => {
    try {
      const success = await startSession(sessionMetadata);
      if (!success) {
        Alert.alert(
          'Session Failed',
          'Unable to start the coaching session. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      Alert.alert(
        'Connection Error',
                  'Failed to connect to Luna. Please check your internet connection.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const createDatabaseSession = async () => {
    if (!user || !currentSession || !currentSession.session_id) return;

    try {
      // Debug: Log user info to understand foreign key issue
      console.log('🔍 User info for foreign key debugging:', {
        userId: user.id,
        authUserId: user.auth_user_id,
        email: user.email,
        fullUser: user
      });

      // First, let's check if this user exists in the users table
      console.log('🔍 Checking if user exists in database...');
      const { data: existingUser, error: userCheckError } = await databaseService.getUser(user.id);
      
      if (userCheckError || !existingUser) {
        console.error('❌ User not found in database:', userCheckError);
        console.log('🔍 This explains the foreign key constraint violation');
        console.log('⚠️ Skipping database session creation - user record missing');
        return;
      }

      console.log('✅ User exists in database:', existingUser.email);

      const sessionData = {
        conversation_id: currentSession.session_id,
        user_id: user.id, // Use database user ID
        transcript: '', // Will be populated by webhook
        session_title: `Coaching Session for ${params.petName}`,
        main_topic: sessionMetadata.user_concern || 'Dog Training',
        urgency_level: 'low' as const,
        key_points: [],
        recommendations: [],
        techniques_taught: [],
        next_steps: [],
        progress_notes: '',
        follow_up_timeline: '',
        status: 'pending' as const,
        duration_seconds: 0,
        raw_conversation_data: {
        pet_name: params.petName as string,
        pet_breed: params.petBreed as string,
        pet_age: params.petAge as string,
          user_concern: sessionMetadata.user_concern,
          session_started_at: new Date().toISOString()
        }
      };

      console.log('📤 Attempting to create session with verified user ID:', {
        conversation_id: sessionData.conversation_id,
        user_id: sessionData.user_id,
        session_title: sessionData.session_title
      });

      const { data, error } = await databaseService.createCoachingSession(sessionData);
      if (error) {
        console.error('❌ Database session creation failed:', error);
        console.error('🔍 This might still be an RLS policy issue');
      } else {
        console.log('✅ Database session created successfully:', data?.id);
        setDbSessionId(data?.id || null);
      }
    } catch (error) {
      console.error('💥 Database session creation error:', error);
    }
  };

  const updateDatabaseSession = async () => {
    if (!dbSessionId) return;

    try {
      await databaseService.updateCoachingSession(dbSessionId, {
        status: 'completed',
      });

      // Check for coaching milestone badges
      if (user?.id) {
        await checkCoachingBadges(user.id);
      }
    } catch (error) {
      console.error('Failed to update database session:', error);
    }
  };

  // Badge checking functionality for coaching sessions
  const checkCoachingBadges = async (userId: string) => {
    try {
      console.log('🏅 Checking coaching milestones for user:', userId);
      
      // Count user's coaching sessions from chats table with session_type = 'coaching'
      const { data: coachingSessions, error } = await databaseService.getCoachingSessions(userId);

      if (error) {
        console.error('❌ Error counting coaching sessions for badges:', error);
        return;
      }

      const coachingCount = coachingSessions?.length || 0;
      console.log(`🏅 User has ${coachingCount} coaching sessions, checking for badges...`);

      // Award badges based on milestones
      if (coachingCount === 1) {
        console.log('🎉 First coaching session badge earned!');
        // Note: Badge notifications can be added via snackbar when available
      } else if (coachingCount === 3) {
        console.log('🎉 Coaching enthusiast badge earned!');
      } else if (coachingCount === 5) {
        console.log('🎉 Coaching pro badge earned!');
      } else if (coachingCount === 10) {
        console.log('🎉 Coaching master badge earned!');
      }
    } catch (error) {
      console.error('❌ Error checking coaching badges:', error);
    }
  };

  const handleEndCall = async () => {
    Alert.alert(
      'End Session',
              'Are you sure you want to end your coaching session with Luna?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Session', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🏁 User manually ending session');
              
              // End the session using the hook function
              await endSession('User ended session');
              
              // Force navigation after a short delay if session doesn't auto-navigate
              const navigationTimeout = setTimeout(() => {
                console.log('📱 Force navigating to coach history');
                router.replace({
                  pathname: '/coach/history',
                  params: { refresh: 'true' }
                });
              }, 2000);
              
              // Clear the timeout if session ends properly
              if (sessionState.status === 'ended') {
                clearTimeout(navigationTimeout);
              }
              
            } catch (error) {
              console.error('❌ Error ending session:', error);
              
              // Always navigate back on error
              Alert.alert(
                'Session Ended',
                'Your session has been ended. Returning to coaching history.',
                [{ 
                  text: 'OK', 
                  onPress: () => router.replace({
                    pathname: '/coach/history',
                    params: { refresh: 'true' }
                  })
                }]
              );
            }
          }
        }
      ]
    );
  };

  const handleToggleMic = () => {
    const newState = !localAudioEnabled;
    setLocalAudioEnabled(newState);
    toggleAudio(newState);
  };

  const handleToggleCamera = () => {
    const newState = !localVideoEnabled;
    setLocalVideoEnabled(newState);
    toggleVideo(newState);
  };

  // Reconnection and live captions not needed with webhook-based processing

  // Connection status simplified - no reconnection needed with webhook processing

  const renderSessionStatus = () => {
    switch (sessionState.status) {
      case 'connecting':
        return (
          <View style={styles.statusOverlay}>
            <ActivityIndicator size="large" color="#ff9d00" />
            <Text style={styles.statusText}>Connecting to Luna...</Text>
            <Text style={styles.statusSubtext}>Setting up your live session</Text>
          </View>
        );

      case 'connected':
        return (
          <View style={styles.statusOverlay}>
            <ActivityIndicator size="large" color="#ff9d00" />
            <Text style={styles.statusText}>Starting session...</Text>
            <Text style={styles.statusSubtext}>Luna will be with you shortly</Text>
          </View>
        );

      case 'ending':
        return (
          <View style={styles.statusOverlay}>
            <ActivityIndicator size="large" color="#ff9d00" />
            <Text style={styles.statusText}>Ending session...</Text>
            <Text style={styles.statusSubtext}>Generating your summary</Text>
          </View>
        );

      case 'ended':
        return (
          <View style={styles.statusOverlay}>
            <Text style={styles.statusText}>Session Complete! 🎉</Text>
            <Text style={styles.statusSubtext}>Your coaching summary is being prepared</Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.statusOverlay}>
            <Text style={styles.errorText}>Session Error</Text>
            <Text style={styles.statusSubtext}>{sessionState.error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Main Video Area */}
      <View style={styles.videoContainer}>
        {currentSession && sessionState.status === 'live' && !videoError ? (
          (() => {
            // Debug: Log session URLs for better understanding
            console.log('🎥 Video rendering decision:', {
              conversation_url: currentSession.conversation_url,
              hls_url: currentSession.hls_url,
              isDailyCoConversation: currentSession.conversation_url?.includes('daily.co'),
              isDailyCoHls: currentSession.hls_url?.includes('daily.co'),
              willUseWebView: currentSession.conversation_url?.includes('daily.co')
            });

            // Check if this is a Daily.co URL (should use WebView) or regular HLS (use Video)
            if (currentSession.conversation_url?.includes('daily.co')) {
              console.log('📱 Using WebView for Daily.co URL:', currentSession.conversation_url);
              return (
                <WebView
                  style={styles.mainVideo}
                  source={{ uri: currentSession.conversation_url }}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  scalesPageToFit={false}
                  mixedContentMode="compatibility"
                  allowsFullscreenVideo={true}
                  allowsBackForwardNavigationGestures={false}
                  bounces={false}
                  scrollEnabled={false}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  // Inject CSS to optimize mobile experience
                  injectedJavaScript={`
                    // Hide Daily.co branding and optimize for mobile
                    const style = document.createElement('style');
                    style.textContent = \`
                      body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        overflow: hidden !important;
                        background: #000 !important;
                      }
                      .daily-iframe { 
                        width: 100vw !important; 
                        height: 100vh !important; 
                        border: none !important;
                      }
                      /* Hide unnecessary UI elements for cleaner experience */
                      [data-testid="prejoin-header"],
                      [data-testid="daily-watermark"],
                      .daily-header,
                      .daily-footer { 
                        display: none !important; 
                      }
                      /* Optimize button sizes for touch */
                      .daily-controls button {
                        min-height: 44px !important;
                        min-width: 44px !important;
                      }
                    \`;
                    document.head.appendChild(style);
                    
                    // Auto-focus and optimize for mobile
                    setTimeout(() => {
                      const iframe = document.querySelector('iframe');
                      if (iframe) {
                        iframe.style.width = '100vw';
                        iframe.style.height = '100vh';
                        iframe.style.border = 'none';
                      }
                    }, 1000);
                    
                    true; // Required for injected JS
                  `}
                  onLoadStart={() => {
                    console.log('🎥 WebView loading Daily.co session:', currentSession.conversation_url);
                    setVideoError(null);
                    setVideoLoaded(false);
                  }}
                  onLoad={() => {
                    console.log('✅ Daily.co session loaded in WebView');
                    setVideoLoaded(true);
                    setVideoError(null);
                  }}
                  onError={(error) => {
                    console.error('❌ WebView loading error:', error);
                    setVideoError('Failed to load video session');
                    setVideoLoaded(false);
                  }}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('❌ WebView HTTP error:', nativeEvent);
                    setVideoError(`HTTP Error: ${nativeEvent.statusCode}`);
                    setVideoLoaded(false);
                  }}
                  renderLoading={() => (
                    <View style={styles.webViewLoading}>
                      <ActivityIndicator size="large" color="#ff9d00" />
                      <Text style={styles.loadingText}>Connecting to Luna...</Text>
                      <Text style={styles.loadingSubtext}>Setting up your live session</Text>
                    </View>
                  )}
                />
              );
            } else {
              // Regular HLS stream - use Video component
              console.log('📺 Using Video component for HLS stream:', currentSession.hls_url);
              return (
          <Video
            ref={videoRef}
            style={styles.mainVideo}
                  source={{ uri: currentSession.hls_url || '' }}
            shouldPlay
            isLooping={false}
            resizeMode={'cover' as any}
            useNativeControls={false}
            onError={(error) => {
                    console.error('📹 Video playback error:', error);
                    const errorMessage = typeof error === 'string' ? error : 
                                         (error as any)?.error?.message || 
                                         (error as any)?.message || 
                                         'Video playback failed';
                    setVideoError(errorMessage);
                    setVideoLoaded(false);
                  }}
                  onLoadStart={() => {
                    console.log('📹 Video loading started for URL:', currentSession.hls_url);
                    setVideoError(null);
                    setVideoLoaded(false);
                  }}
                  onLoad={() => {
                    console.log('📹 Video loaded successfully');
                    setVideoLoaded(true);
                    setVideoError(null);
                  }}
                  onPlaybackStatusUpdate={(status) => {
                    if ('error' in status && status.error) {
                      console.error('📹 Video playback status error:', status.error);
                      setVideoError('Video stream unavailable');
                    }
                  }}
                />
              );
            }
          })()
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>🐾</Text>
            <Text style={styles.placeholderSubtext}>Luna</Text>
            <Text style={styles.videoStatusText}>
              {videoError ? 'Video temporarily unavailable' :
               sessionState.status === 'connecting' ? 'Connecting...' :
               sessionState.status === 'connected' ? 'Starting video...' :
               sessionState.status === 'ending' ? 'Ending session...' :
               'Live coaching session'}
            </Text>
            {videoError && (
              <Text style={styles.videoErrorText}>
                Connection error - please try again
              </Text>
            )}
            {sessionState.status === 'live' && !videoError && (
              <ActivityIndicator size="large" color="#ff9d00" style={{ marginTop: 16 }} />
            )}
          </View>
        )}

        {/* Self Camera Preview */}
        {localVideoEnabled && hasCamera && (
          <View style={styles.selfVideoContainer}>
            <CameraView 
              style={styles.selfVideo}
              isEnabled={localVideoEnabled}
              facing="front"
            />
          </View>
        )}

        {/* Session Header */}
        <View style={styles.sessionHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.sessionInfo}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <View style={styles.timerContainer}>
              <Clock size={14} color="#ffffff" />
              <Text style={styles.timerText}>{getFormattedDuration()}</Text>
            </View>
          </View>

          <View style={styles.connectionIndicator}>
            {isConnected ? (
              <Wifi size={20} color="#ffffff" />
            ) : (
              <WifiOff size={20} color="#ff4444" />
            )}
          </View>
        </View>

        {/* Status Overlays */}
        {renderSessionStatus()}
      </View>

      {/* Live Captions removed - using webhook processing */}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controls}>
          {/* Microphone Toggle */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              !localAudioEnabled && styles.controlButtonDisabled
            ]}
            onPress={handleToggleMic}
            disabled={!hasMicrophone}
          >
            {localAudioEnabled ? (
              <Mic size={24} color="#ffffff" />
            ) : (
              <MicOff size={24} color="#ffffff" />
            )}
          </TouchableOpacity>

          {/* End Call */}
          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <PhoneOff size={28} color="#ffffff" />
          </TouchableOpacity>

          {/* Camera Toggle */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              !localVideoEnabled && styles.controlButtonDisabled
            ]}
            onPress={handleToggleCamera}
            disabled={!hasCamera}
          >
            {localVideoEnabled ? (
              <Camera size={24} color="#ffffff" />
            ) : (
              <CameraOff size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Session Info */}
        <View style={styles.sessionMetadata}>
          <Text style={styles.sessionPetName}>Coaching {params.petName}</Text>
          <Text style={styles.sessionConcern}>{sessionMetadata.user_concern}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  mainVideo: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 72,
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  selfVideoContainer: {
    position: 'absolute',
    bottom: width > 400 ? 160 : 140, // Responsive positioning
    right: 16,
    width: width > 400 ? 120 : 100, // Responsive sizing
    height: width > 400 ? 160 : 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  selfVideo: {
    width: '100%',
    height: '100%',
  },
  sessionHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: height > 800 ? 60 : 50, // Responsive top padding
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sessionInfo: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 6,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: '#ffffff',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  connectionIndicator: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 28,
    fontFamily: Fonts.heading.bold,
    color: '#ffffff',
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 36,
  },
  statusSubtext: {
    fontSize: 18,
    fontFamily: Fonts.body.regular,
    color: '#cccccc',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 26,
    fontFamily: Fonts.heading.bold,
    color: '#ff4444',
    textAlign: 'center',
    lineHeight: 34,
  },
  retryButton: {
    backgroundColor: '#ff9d00',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#ff9d00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  retryButtonText: {
    fontSize: 18,
    fontFamily: Fonts.body.semiBold,
    color: '#ffffff',
  },
  connectionAlert: {
    position: 'absolute',
    top: height > 800 ? 120 : 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 5,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  connectionText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
  },
  reconnectButton: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
  captionsContainer: {
    position: 'absolute',
    bottom: width > 400 ? 140 : 120,
    left: 20,
    right: 20,
    maxHeight: 150,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captionsScroll: {
    maxHeight: 100,
  },
  captionItem: {
    marginBottom: 8,
  },
  captionSpeaker: {
    fontSize: 12,
    fontFamily: Fonts.body.semiBold,
    color: '#ff9d00',
    marginBottom: 2,
  },
  captionText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#ffffff',
    lineHeight: 18,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  speakingText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#ff9d00',
    marginLeft: 6,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  listeningText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#4CAF50',
    marginLeft: 6,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: height > 800 ? 50 : 40, // Safe area padding
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  controlButton: {
    width: width > 400 ? 64 : 60, // Responsive button size
    height: width > 400 ? 64 : 60,
    borderRadius: width > 400 ? 32 : 30,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: width > 400 ? 24 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(255,68,68,0.8)',
  },
  endCallButton: {
    width: width > 400 ? 80 : 72, // Larger end call button
    height: width > 400 ? 80 : 72,
    borderRadius: width > 400 ? 40 : 36,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: width > 400 ? 24 : 20,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  sessionMetadata: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sessionPetName: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  sessionConcern: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  videoStatusText: {
    fontSize: 18,
    fontFamily: Fonts.body.regular,
    color: '#ffffff',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  videoErrorText: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#ff9d00',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  webViewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: Fonts.body.bold,
    color: '#ffffff',
    marginTop: 12,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#cccccc',
    marginTop: 8,
    textAlign: 'center',
  },
});

