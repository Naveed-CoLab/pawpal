import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { mediaAccessService, MediaPermissions } from '@/lib/mediaAccess';

export function useMediaAccess() {
  const [permissions, setPermissions] = useState<MediaPermissions>({
    camera: false,
    microphone: false,
    mediaLibrary: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const perms = await mediaAccessService.requestPermissions();
      setPermissions(perms);
      
      console.log('📋 Media permissions:', perms);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permissions';
      setError(errorMessage);
      console.error('❌ Permission request error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startStream = useCallback(async (options: { video: boolean; audio: boolean }) => {
    try {
      setError(null);
      
      if (!permissions.camera && options.video) {
        throw new Error('Camera permission not granted');
      }
      
      if (!permissions.microphone && options.audio) {
        throw new Error('Microphone permission not granted');
      }

      const success = await mediaAccessService.startMediaStream(options);
      
      if (success) {
        setIsStreamActive(true);
        console.log('✅ Media stream started');
      } else {
        throw new Error('Failed to start media stream');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start stream';
      setError(errorMessage);
      console.error('❌ Stream start error:', err);
      return false;
    }
  }, [permissions]);

  const stopStream = useCallback(() => {
    try {
      mediaAccessService.stopMediaStream();
      setIsStreamActive(false);
      console.log('🛑 Media stream stopped');
    } catch (err) {
      console.error('❌ Stream stop error:', err);
    }
  }, []);

  const toggleVideo = useCallback((enabled: boolean) => {
    try {
      const success = mediaAccessService.toggleVideo(enabled);
      if (!success) {
        setError('Failed to toggle video');
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle video';
      setError(errorMessage);
      return false;
    }
  }, []);

  const toggleAudio = useCallback((enabled: boolean) => {
    try {
      const success = mediaAccessService.toggleAudio(enabled);
      if (!success) {
        setError('Failed to toggle audio');
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle audio';
      setError(errorMessage);
      return false;
    }
  }, []);

  const getWebStream = useCallback(() => {
    if (Platform.OS === 'web') {
      return mediaAccessService.getWebStream();
    }
    return null;
  }, []);

  return {
    permissions,
    isLoading,
    error,
    isStreamActive,
    requestPermissions,
    startStream,
    stopStream,
    toggleVideo,
    toggleAudio,
    getWebStream,
    hasCamera: permissions.camera,
    hasMicrophone: permissions.microphone,
  };
}