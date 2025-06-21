import React, { useRef, useEffect, useState, memo } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { CameraView as ExpoCameraView, CameraType } from 'expo-camera';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

interface CameraViewProps {
  isEnabled: boolean;
  facing?: CameraType;
  style?: any;
  onCameraReady?: () => void;
  onError?: (error: string) => void;
}

// Using memo to prevent unnecessary re-renders
export const CameraView = memo(({ 
  isEnabled, 
  facing = 'front', 
  style, 
  onCameraReady,
  onError 
}: CameraViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [webStream, setWebStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setupWebCamera();
    } else {
      setIsLoading(false);
      onCameraReady?.();
    }

    return () => {
      if (Platform.OS === 'web' && webStream) {
        webStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isEnabled]);

  const setupWebCamera = async () => {
    if (!isEnabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Stop existing stream
      if (webStream) {
        webStream.getTracks().forEach(track => track.stop());
      }

      // Request new stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: facing === 'front' ? 'user' : 'environment'
        },
        audio: false // Audio is handled separately
      });

      setWebStream(stream);

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
          onCameraReady?.();
        };
      }

      console.log('✅ Web camera setup complete');
    } catch (err: any) {
      console.error('❌ Web camera setup error:', err);
      const errorMessage = err.name === 'NotAllowedError' 
        ? 'Camera access denied. Please allow camera access in your browser.'
        : 'Failed to access camera. Please check your camera settings.';
      
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  };

  // Web implementation
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Starting camera...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {isEnabled && !error && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 12,
              transform: facing === 'front' ? 'scaleX(-1)' : 'none', // Mirror front camera
            }}
          />
        )}
        
        {!isEnabled && !isLoading && (
          <View style={styles.disabledContainer}>
            <Text style={styles.disabledText}>Camera Off</Text>
          </View>
        )}
      </View>
    );
  }

  // Native implementation
  return (
    <View style={[styles.container, style]}>
      {isEnabled ? (
        <ExpoCameraView
          style={styles.camera}
          facing={facing}
          onCameraReady={onCameraReady}
        />
      ) : (
        <View style={styles.disabledContainer}>
          <Text style={styles.disabledText}>Camera Off</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  loadingText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.body.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#666',
  },
  disabledText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: Fonts.body.medium,
  },
});