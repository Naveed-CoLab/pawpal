import { Platform, Alert } from 'react-native';
import { Camera, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

export interface MediaPermissions {
  camera: boolean;
  microphone: boolean;
  mediaLibrary: boolean;
}

export interface MediaStream {
  id: string;
  active: boolean;
  video?: boolean;
  audio?: boolean;
}

class MediaAccessService {
  private static instance: MediaAccessService;
  private currentStream: MediaStream | null = null;
  private webStream: MediaStream | null = null;

  public static getInstance(): MediaAccessService {
    if (!MediaAccessService.instance) {
      MediaAccessService.instance = new MediaAccessService();
    }
    return MediaAccessService.instance;
  }

  // Request all necessary permissions
  async requestPermissions(): Promise<MediaPermissions> {
    try {
      if (Platform.OS === 'web') {
        return await this.requestWebPermissions();
      } else {
        return await this.requestNativePermissions();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return { camera: false, microphone: false, mediaLibrary: false };
    }
  }

  // Web permissions using getUserMedia
  private async requestWebPermissions(): Promise<MediaPermissions> {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        Alert.alert(
          'Not Supported',
          'Your browser does not support camera and microphone access. Please use a modern browser like Chrome, Firefox, or Safari.',
          [{ text: 'OK' }]
        );
        return { camera: false, microphone: false, mediaLibrary: false };
      }

      console.log('🎥 Requesting web camera and microphone access...');

      // Try with longer timeout and fallback options
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Media access timeout, aborting...');
        controller.abort();
      }, 10000); // 10 second timeout instead of default

      try {
        // Request camera and microphone access with fallback constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 1280 }, // Lower resolution for better compatibility
            height: { ideal: 480, max: 720 },
            facingMode: 'user', // Front camera for coaching
            frameRate: { ideal: 15, max: 30 } // Lower framerate to reduce load
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 44100 }
          }
        });

        clearTimeout(timeoutId);

        // Store the stream for later use
        this.webStream = stream;

        console.log('✅ Web camera and microphone access granted');
        console.log('📹 Video tracks:', stream.getVideoTracks().length);
        console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
        
        return { camera: true, microphone: true, mediaLibrary: true };

      } catch (constraintError: any) {
        clearTimeout(timeoutId);
        
        if (constraintError.name === 'AbortError') {
          console.warn('⏰ Camera access timed out, trying audio only...');
          
          // Fallback: Try audio only first
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ Audio access granted, trying camera separately...');
            
            // Try camera with minimal constraints
            try {
              const videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' } // Minimal constraints
              });
              
              // Combine streams
              const combinedStream = new MediaStream([
                ...audioStream.getTracks(),
                ...videoStream.getTracks()
              ]);
              
              this.webStream = combinedStream;
              
              console.log('✅ Combined audio and video access granted');
              return { camera: true, microphone: true, mediaLibrary: true };
              
            } catch (videoError) {
              console.warn('❌ Camera failed, keeping audio only:', videoError);
              this.webStream = audioStream;
              return { camera: false, microphone: true, mediaLibrary: true };
            }
            
          } catch (audioError) {
            console.error('❌ Audio also failed:', audioError);
            throw constraintError; // Re-throw original error
          }
        } else {
          throw constraintError; // Re-throw non-timeout errors
        }
      }

    } catch (error: any) {
      console.error('❌ Web media access error:', error);
      
      let errorMessage = 'Failed to access camera and microphone.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera and microphone access denied. Please click "Allow" when prompted, or check your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please check your devices are connected.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera or microphone is already in use by another application. Please close other apps and try again.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Camera access timed out. This might happen if your camera is slow to start or in use by another app.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera settings not supported. Please try with a different camera.';
      }

      Alert.alert('Media Access Error', errorMessage, [{ text: 'OK' }]);
      return { camera: false, microphone: false, mediaLibrary: false };
    }
  }

  // Native permissions using Expo Camera
  private async requestNativePermissions(): Promise<MediaPermissions> {
    try {
      // Request camera permissions
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      
      // Request microphone permissions
      const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
      
      // Request media library permissions
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();

      const permissions = {
        camera: cameraStatus === 'granted',
        microphone: micStatus === 'granted',
        mediaLibrary: mediaStatus === 'granted'
      };

      if (!permissions.camera || !permissions.microphone) {
        Alert.alert(
          'Permissions Required',
          'VetPaw needs camera and microphone access for live coaching sessions. Please enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On mobile, you might want to open app settings
              // This would require additional native modules
            }}
          ]
        );
      }

      console.log('📱 Native permissions:', permissions);
      return permissions;
    } catch (error) {
      console.error('❌ Native permissions error:', error);
      return { camera: false, microphone: false, mediaLibrary: false };
    }
  }

  // Start media stream
  async startMediaStream(options: { video: boolean; audio: boolean }): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return await this.startWebStream(options);
      } else {
        return await this.startNativeStream(options);
      }
    } catch (error) {
      console.error('Error starting media stream:', error);
      return false;
    }
  }

  private async startWebStream(options: { video: boolean; audio: boolean }): Promise<boolean> {
    try {
      if (this.webStream) {
        // Stop existing stream
        this.webStream.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: options.video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: options.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });

      this.webStream = stream;
      this.currentStream = {
        id: 'web-stream',
        active: true,
        video: options.video,
        audio: options.audio
      };

      console.log('✅ Web media stream started');
      return true;
    } catch (error) {
      console.error('❌ Error starting web stream:', error);
      return false;
    }
  }

  private async startNativeStream(options: { video: boolean; audio: boolean }): Promise<boolean> {
    try {
      // For native, we'll use the Camera component directly
      // The actual stream handling is done by the Camera component
      this.currentStream = {
        id: 'native-stream',
        active: true,
        video: options.video,
        audio: options.audio
      };

      console.log('✅ Native media stream configured');
      return true;
    } catch (error) {
      console.error('❌ Error starting native stream:', error);
      return false;
    }
  }

  // Stop media stream
  stopMediaStream(): void {
    try {
      if (Platform.OS === 'web' && this.webStream) {
        this.webStream.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track`);
        });
        this.webStream = null;
      }

      this.currentStream = null;
      console.log('✅ Media stream stopped');
    } catch (error) {
      console.error('❌ Error stopping media stream:', error);
    }
  }

  // Toggle video track
  toggleVideo(enabled: boolean): boolean {
    try {
      if (Platform.OS === 'web' && this.webStream) {
        const videoTracks = this.webStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.enabled = enabled;
        });
        
        if (this.currentStream) {
          this.currentStream.video = enabled;
        }
        
        console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'}`);
        return true;
      }
      
      // For native, this will be handled by the Camera component
      if (this.currentStream) {
        this.currentStream.video = enabled;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error toggling video:', error);
      return false;
    }
  }

  // Toggle audio track
  toggleAudio(enabled: boolean): boolean {
    try {
      if (Platform.OS === 'web' && this.webStream) {
        const audioTracks = this.webStream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = enabled;
        });
        
        if (this.currentStream) {
          this.currentStream.audio = enabled;
        }
        
        console.log(`🎤 Audio ${enabled ? 'enabled' : 'disabled'}`);
        return true;
      }
      
      // For native, this will be handled by the Camera component
      if (this.currentStream) {
        this.currentStream.audio = enabled;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error toggling audio:', error);
      return false;
    }
  }

  // Get current stream
  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  // Get web stream for video element
  getWebStream(): MediaStream | null {
    return Platform.OS === 'web' ? this.webStream : null;
  }

  // Check if stream is active
  isStreamActive(): boolean {
    return this.currentStream?.active || false;
  }

  // Get available devices (web only)
  async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    if (Platform.OS !== 'web' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => 
        device.kind === 'videoinput' || device.kind === 'audioinput'
      );
    } catch (error) {
      console.error('❌ Error getting devices:', error);
      return [];
    }
  }

  // Check current permissions without requesting
  async checkPermissions(): Promise<MediaPermissions> {
    try {
      if (Platform.OS === 'web') {
        return await this.checkWebPermissions();
      } else {
        return await this.checkNativePermissions();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      return { camera: false, microphone: false, mediaLibrary: false };
    }
  }

  // Check web permissions using Permissions API
  private async checkWebPermissions(): Promise<MediaPermissions> {
    try {
      // Check if Permissions API is supported
      if (!navigator.permissions) {
        console.warn('Permissions API not supported, falling back to getUserMedia test');
        return await this.testWebPermissions();
      }

      // Check camera permission
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      const permissions = {
        camera: cameraPermission.state === 'granted',
        microphone: micPermission.state === 'granted',
        mediaLibrary: true // Always true for web
      };

      console.log('🔍 Web permissions check:', {
        camera: cameraPermission.state,
        microphone: micPermission.state
      });

      return permissions;
    } catch (error) {
      console.warn('Permissions API check failed, using fallback:', error);
      return await this.testWebPermissions();
    }
  }

  // Fallback: Test web permissions by attempting getUserMedia
  private async testWebPermissions(): Promise<MediaPermissions> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        return { camera: false, microphone: false, mediaLibrary: false };
      }

      // Test if we can get media devices
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Immediately stop the test stream
      stream.getTracks().forEach(track => track.stop());

      return { camera: true, microphone: true, mediaLibrary: true };
    } catch (error: any) {
      console.log('🧪 Test permission result:', error.name);
      
      if (error.name === 'NotAllowedError') {
        return { camera: false, microphone: false, mediaLibrary: false };
      } else if (error.name === 'NotFoundError') {
        return { camera: false, microphone: false, mediaLibrary: false };
      }
      
      // For other errors, assume permissions might be available
      return { camera: false, microphone: false, mediaLibrary: false };
    }
  }

  // Check native permissions using Expo Camera
  private async checkNativePermissions(): Promise<MediaPermissions> {
    try {
      const { status: cameraStatus } = await Camera.getCameraPermissionsAsync();
      const { status: micStatus } = await Camera.getMicrophonePermissionsAsync();
      const { status: mediaStatus } = await MediaLibrary.getPermissionsAsync();

      const permissions = {
        camera: cameraStatus === 'granted',
        microphone: micStatus === 'granted',
        mediaLibrary: mediaStatus === 'granted'
      };

      console.log('📱 Native permissions check:', {
        camera: cameraStatus,
        microphone: micStatus,
        mediaLibrary: mediaStatus
      });

      return permissions;
    } catch (error) {
      console.error('❌ Native permissions check error:', error);
      return { camera: false, microphone: false, mediaLibrary: false };
    }
  }
}

export const mediaAccessService = MediaAccessService.getInstance();