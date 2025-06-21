import * as Speech from 'expo-speech';
import { Alert, Platform } from 'react-native';

export interface SpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  voice?: string;
}

export interface SpeechToTextResult {
  text: string;
  confidence?: number;
  error?: string;
}

export class SpeechUtils {
  private static isListening = false;
  private static speechRecognition: any = null;

  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // For web, we'll use the Web Speech API
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          Alert.alert(
            'Speech Recognition Not Supported',
            'Your browser does not support speech recognition. Please use a supported browser like Chrome.',
            [{ text: 'OK' }]
          );
          return false;
        }
        return true;
      } else {
        // For mobile, permissions are handled automatically by expo-speech
        return true;
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  }

  static async startSpeechToText(
    onResult: (result: SpeechToTextResult) => void,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) return false;

      if (this.isListening) {
        console.warn('Speech recognition is already active');
        return false;
      }

      if (Platform.OS === 'web') {
        return this.startWebSpeechRecognition(onResult, onStart, onEnd);
      } else {
        // For mobile platforms, we'll show a message that this feature is coming soon
        Alert.alert(
          'Coming Soon',
          'Voice input will be available in our next update. We\'re working hard to bring this feature to you soon!',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      onResult({ text: '', error: 'Failed to start speech recognition' });
      return false;
    }
  }

  private static startWebSpeechRecognition(
    onResult: (result: SpeechToTextResult) => void,
    onStart?: () => void,
    onEnd?: () => void
  ): boolean {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        Alert.alert(
          'Speech Recognition Not Available',
          'Speech recognition is not supported in your browser.',
          [{ text: 'OK' }]
        );
        return false;
      }

      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';
      this.speechRecognition.maxAlternatives = 1;

      this.speechRecognition.onstart = () => {
        this.isListening = true;
        onStart?.();
        console.log('Speech recognition started');
      };

      this.speechRecognition.onresult = (event: any) => {
        const result = event.results[0];
        if (result.isFinal) {
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          onResult({ text: transcript, confidence });
        }
      };

      this.speechRecognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        
        let errorMessage = 'Speech recognition failed. Please try again.';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not available. Please check your microphone settings.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
        }
        
        onResult({ text: '', error: errorMessage });
        onEnd?.();
      };

      this.speechRecognition.onend = () => {
        this.isListening = false;
        onEnd?.();
        console.log('Speech recognition ended');
      };

      this.speechRecognition.start();
      return true;
    } catch (error) {
      console.error('Error setting up speech recognition:', error);
      return false;
    }
  }

  static stopSpeechToText(): void {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.isListening = false;
    }
  }

  static isCurrentlyListening(): boolean {
    return this.isListening;
  }

  static async speak(
    text: string,
    options: SpeechOptions = {}
  ): Promise<void> {
    try {
      const speakOptions = {
        language: options.language || 'en-US',
        pitch: options.pitch || 1.0,
        rate: options.rate || 0.9,
        voice: options.voice,
      };

      await Speech.speak(text, speakOptions);
    } catch (error) {
      console.error('Error speaking text:', error);
      // Fail silently for speech synthesis
    }
  }

  static async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices;
    } catch (error) {
      console.error('Error getting available voices:', error);
      return [];
    }
  }

  static isSpeaking(): boolean {
    return Speech.isSpeakingAsync();
  }

  static stop(): void {
    Speech.stop();
    this.stopSpeechToText();
  }

  static pause(): void {
    Speech.pause();
  }

  static resume(): void {
    Speech.resume();
  }

  // Utility method to clean text for better speech synthesis
  static cleanTextForSpeech(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/`(.*?)`/g, '$1') // Code
      .replace(/#{1,6}\s?/g, '') // Headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      // Remove excess emojis but keep some
      .replace(/[🐾💕✨🤔💭🏥📞🔄😅💡🌟❤️]{3,}/g, '')
      // Remove special characters that might cause issues
      .replace(/[^\w\s.,!?;:'"()\-🐾💕✨]/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
}