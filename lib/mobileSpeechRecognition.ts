import { Platform } from 'react-native';
import { 
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent 
} from 'expo-speech-recognition';

export interface MobileSpeechOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export class MobileSpeechRecognition {
  private isListening = false;
  private options: MobileSpeechOptions = {};

  constructor() {
    console.log('🎤 MobileSpeechRecognition initialized for', Platform.OS);
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      
      if (!result.granted) {
        console.warn('❌ Speech recognition permissions not granted:', result);
        this.options.onError?.('Microphone and speech recognition permissions are required for voice input. Please enable them in your device settings.');
        return false;
      }

      console.log('✅ Speech recognition permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      this.options.onError?.('Failed to request permissions. Please try again.');
      return false;
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const isAvailable = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      
      if (!isAvailable) {
        console.warn('❌ Speech recognition not available on this device');
        this.options.onError?.('Speech recognition is not available on this device. Please check your system settings.');
        return false;
      }

      console.log('✅ Speech recognition is available');
      return true;
    } catch (error) {
      console.error('❌ Error checking availability:', error);
      this.options.onError?.('Unable to check speech recognition availability.');
      return false;
    }
  }

  setupEventListeners() {
    // Start event
    ExpoSpeechRecognitionModule.addListener('start', () => {
      console.log('🎤 Speech recognition started');
      this.isListening = true;
      this.options.onStart?.();
    });

    // End event
    ExpoSpeechRecognitionModule.addListener('end', () => {
      console.log('🎤 Speech recognition ended');
      this.isListening = false;
      this.options.onEnd?.();
    });

    // Result event
    ExpoSpeechRecognitionModule.addListener('result', (event) => {
      const result = event.results[0];
      if (result?.transcript) {
        console.log('🎤 Speech result:', result.transcript, 'Final:', event.isFinal);
        this.options.onResult?.(result.transcript, event.isFinal || false);
      }
    });

    // Error event
    ExpoSpeechRecognitionModule.addListener('error', (event) => {
      console.error('🎤 Speech recognition error:', event.error, event.message);
      this.isListening = false;
      
      let errorMessage = 'Speech recognition failed. Please try again.';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please speak clearly and try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check your microphone settings.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please enable microphone access in your device settings.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not available. Please check your device settings.';
          break;
        case 'language-not-supported':
          errorMessage = 'Selected language not supported. Switching to English.';
          break;
      }
      
      this.options.onError?.(errorMessage);
    });

    // No match event
    ExpoSpeechRecognitionModule.addListener('nomatch', () => {
      console.log('🎤 No speech match found');
      this.options.onError?.('No speech was recognized. Please try speaking more clearly.');
    });

    console.log('✅ Speech recognition event listeners setup complete');
  }

  async start(options: MobileSpeechOptions = {}): Promise<boolean> {
    try {
      this.options = { ...this.options, ...options };

      // Check if already listening
      if (this.isListening) {
        console.warn('⚠️ Speech recognition already active');
        return false;
      }

      // Check availability
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) return false;

      // Request permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return false;

      // Setup event listeners
      this.setupEventListeners();

      // Start speech recognition
      const config = {
        lang: options.language || 'en-US',
        interimResults: options.interimResults !== false, // Default to true
        continuous: options.continuous || false,
        maxAlternatives: options.maxAlternatives || 1,
        // Enable on-device recognition when possible for better privacy
        requiresOnDeviceRecognition: Platform.OS === 'ios', // iOS supports this well
        // Add punctuation for better readability
        addsPunctuation: true,
        // Custom phrases for better pet-related recognition
        contextualStrings: [
          'veterinarian', 'symptoms', 'behavior', 'appetite', 'energy',
          'vomiting', 'diarrhea', 'lethargy', 'eating', 'drinking',
          'playful', 'aggressive', 'anxious', 'limping', 'scratching'
        ],
      };

      console.log('🎤 Starting speech recognition with config:', config);
      ExpoSpeechRecognitionModule.start(config);
      
      return true;
    } catch (error) {
      console.error('❌ Error starting speech recognition:', error);
      this.options.onError?.('Failed to start speech recognition. Please try again.');
      return false;
    }
  }

  stop(): void {
    if (!this.isListening) {
      console.warn('⚠️ Speech recognition not active');
      return;
    }

    try {
      console.log('🎤 Stopping speech recognition');
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('❌ Error stopping speech recognition:', error);
      this.options.onError?.('Error stopping speech recognition.');
    }
  }

  abort(): void {
    if (!this.isListening) {
      console.warn('⚠️ Speech recognition not active');
      return;
    }

    try {
      console.log('🎤 Aborting speech recognition');
      ExpoSpeechRecognitionModule.abort();
    } catch (error) {
      console.error('❌ Error aborting speech recognition:', error);
    }
  }

  isActive(): boolean {
    return this.isListening;
  }

  async getSupportedLanguages(): Promise<string[]> {
    try {
      const result = await ExpoSpeechRecognitionModule.getSupportedLocales();
      return result.locales || ['en-US'];
    } catch (error) {
      console.warn('⚠️ Could not get supported languages:', error);
      return ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE'];
    }
  }

  // Hook for React components
  static useSpeechRecognitionEvent = useSpeechRecognitionEvent;
}

export default MobileSpeechRecognition; 