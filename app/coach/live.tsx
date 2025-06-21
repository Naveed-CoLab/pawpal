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
  Volume2,
  VolumeX,
  ArrowLeft
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function CoachLiveScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { 
    sessionState, 
    currentSession,
    liveTranscript,
    sessionSummary,
    startSession,
    endSession,
    reconnect,
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
  const [showCaptions, setShowCaptions] = useState(true);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);

  // Session metadata from params
  const sessionMetadata = {
    pet_name: params.petName as string,
    pet_breed: params.petBreed as string,
    pet_age: params.petAge as string,
    pet_weight: params.petWeight as string,
    user_concern: params.concern as string,
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
        if (sessionSummary) {
          router.replace({
            pathname: '/coach/summary',
            params: {
              sessionId: dbSessionId,
              summary: JSON.stringify(sessionSummary),
            }
          });
        } else {
          router.replace('/coach/history');
        }
      }, 2000);
    }
  }, [sessionState.status, sessionSummary]);

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
        'Failed to connect to James. Please check your internet connection.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const createDatabaseSession = async () => {
    if (!user || !currentSession) return;

    try {
      const sessionData = {
        user_id: user.id,
        tavus_session_id: currentSession.session_id,
        primary_concern: sessionMetadata.user_concern,
        status: 'active' as const,
        start_time: new Date().toISOString(),
        pet_name: params.petName as string,
        pet_breed: params.petBreed as string,
        pet_age: params.petAge as string,
      };

      const { data, error } = await databaseService.createCoachingSession(sessionData);
      if (error) {
        console.error('Failed to create database session:', error);
      } else {
        setDbSessionId(data?.id || null);
      }
    } catch (error) {
      console.error('Database session creation error:', error);
    }
  };

  const updateDatabaseSession = async () => {
    if (!dbSessionId) return;

    try {
      await databaseService.updateCoachingSession(dbSessionId, {
        status: 'completed',
        end_time: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update database session:', error);
    }
  };

  const handleEndCall = async () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end your coaching session with James?',
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

  const handleReconnect = async () => {
    try {
      await reconnect();
    } catch (error) {
      Alert.alert('Reconnection Failed', 'Unable to reconnect to the session.');
    }
  };

  const getRecentCaptions = () => {
    return liveTranscript
      .filter(caption => caption.is_final)
      .slice(-3) // Show last 3 final captions
      .map(caption => ({
        ...caption,
        displayText: caption.text.length > 100 
          ? caption.text.substring(0, 100) + '...' 
          : caption.text
      }));
  };

  const renderConnectionStatus = () => {
    if (!isConnected && sessionState.status === 'live') {
      return (
        <View style={styles.connectionAlert}>
          <WifiOff size={16} color="#ff4444" />
          <Text style={styles.connectionText}>Connection lost</Text>
          <TouchableOpacity onPress={handleReconnect}>
            <Text style={styles.reconnectButton}>Reconnect</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderSessionStatus = () => {
    switch (sessionState.status) {
      case 'connecting':
        return (
          <View style={styles.statusOverlay}>
            <ActivityIndicator size="large" color="#ff9d00" />
            <Text style={styles.statusText}>Connecting to James...</Text>
            <Text style={styles.statusSubtext}>Setting up your live session</Text>
          </View>
        );

      case 'connected':
        return (
          <View style={styles.statusOverlay}>
            <ActivityIndicator size="large" color="#ff9d00" />
            <Text style={styles.statusText}>Starting session...</Text>
            <Text style={styles.statusSubtext}>James will be with you shortly</Text>
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
        {currentSession?.hls_url && sessionState.status === 'live' ? (
          <Video
            ref={videoRef}
            style={styles.mainVideo}
            source={{ uri: currentSession.hls_url }}
            shouldPlay
            isLooping={false}
            resizeMode={'cover' as any}
            useNativeControls={false}
            onError={(error) => {
              console.warn('📹 Video playback error:', error);
              // Continue with placeholder if video fails
            }}
            onLoadStart={() => console.log('📹 Video loading started')}
            onLoad={() => console.log('📹 Video loaded successfully')}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>🐾</Text>
            <Text style={styles.placeholderSubtext}>James</Text>
            <Text style={styles.videoStatusText}>
              {sessionState.status === 'connecting' ? 'Connecting...' :
               sessionState.status === 'connected' ? 'Starting video...' :
               sessionState.status === 'ending' ? 'Ending session...' :
               'Live coaching session'}
            </Text>
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
        {renderConnectionStatus()}
      </View>

      {/* Live Captions */}
      {showCaptions && sessionState.status === 'live' && (
        <View style={styles.captionsContainer}>
          <ScrollView 
            style={styles.captionsScroll}
            showsVerticalScrollIndicator={false}
          >
            {getRecentCaptions().map((caption, index) => (
              <View key={`${caption.timestamp}-${index}`} style={styles.captionItem}>
                <Text style={styles.captionSpeaker}>
                  {caption.speaker === 'user' ? 'You' : 'James'}:
                </Text>
                <Text style={styles.captionText}>{caption.displayText}</Text>
              </View>
            ))}
          </ScrollView>
          
          {/* Speaking Indicator */}
          {sessionState.isSpeaking && (
            <View style={styles.speakingIndicator}>
              <Volume2 size={16} color="#ff9d00" />
              <Text style={styles.speakingText}>James is speaking...</Text>
            </View>
          )}
          
          {sessionState.isListening && !sessionState.isSpeaking && (
            <View style={styles.listeningIndicator}>
              <Mic size={16} color="#4CAF50" />
              <Text style={styles.listeningText}>Listening...</Text>
            </View>
          )}
        </View>
      )}

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
  },
  placeholderText: {
    fontSize: 60,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 18,
    fontFamily: Fonts.heading.bold,
    color: '#ffffff',
  },
  selfVideoContainer: {
    position: 'absolute',
    bottom: 140,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
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
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: '#ffffff',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: '#ffffff',
    marginLeft: 4,
  },
  connectionIndicator: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  statusText: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#cccccc',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#ff4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ff9d00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: '#ffffff',
  },
  connectionAlert: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 5,
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
    bottom: 120,
    left: 20,
    right: 20,
    maxHeight: 150,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 12,
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(255,68,68,0.7)',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  sessionMetadata: {
    alignItems: 'center',
  },
  sessionPetName: {
    fontSize: 16,
    fontFamily: Fonts.heading.semiBold,
    color: '#ffffff',
    marginBottom: 4,
  },
  sessionConcern: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#cccccc',
  },
  videoStatusText: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#ffffff',
    marginTop: 8,
  },
});
