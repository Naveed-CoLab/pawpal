import * as Speech from 'expo-speech';
import { Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';

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
  private static recording: Audio.Recording | null = null;

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
        // For mobile, request audio recording permission
        try {
          const permission = await Audio.requestPermissionsAsync();
          if (permission.status !== 'granted') {
            Alert.alert(
              'Microphone Permission Required',
              'Please allow microphone access to use voice input.',
              [{ text: 'OK' }]
            );
            return false;
          }
          return true;
        } catch (error) {
          console.error('Error requesting audio permission:', error);
          return false;
        }
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
        // For mobile platforms, use a simplified voice input approach
        return this.startMobileSpeechRecognition(onResult, onStart, onEnd);
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      onResult({ text: '', error: 'Failed to start speech recognition' });
      return false;
    }
  }

  private static async startMobileSpeechRecognition(
    onResult: (result: SpeechToTextResult) => void,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<boolean> {
    try {
      // Set up audio recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      };

      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(recordingOptions);
      
      this.isListening = true;
      onStart?.();
      
      await this.recording.startAsync();
      console.log('🎤 Mobile recording started');

      // Show user instructions
      Alert.alert(
        'Voice Input Active',
        'Speak now! Tap the mic again when finished.',
        [
          {
            text: 'Stop Recording',
            onPress: () => this.stopMobileSpeechRecognition(onResult, onEnd)
          }
        ]
      );

      return true;
    } catch (error) {
      console.error('Error starting mobile speech recognition:', error);
      this.isListening = false;
      onResult({ text: '', error: 'Failed to start voice recording' });
      onEnd?.();
      return false;
    }
  }

  private static async stopMobileSpeechRecognition(
    onResult: (result: SpeechToTextResult) => void,
    onEnd?: () => void
  ): Promise<void> {
    try {
      if (!this.recording) return;

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.isListening = false;
      this.recording = null;
      
      console.log('🎤 Mobile recording stopped, URI:', uri);
      
      // For now, we'll ask the user to type what they said
      // In a full implementation, you'd send the audio to a speech-to-text service
      Alert.alert(
        'Voice Input Complete',
        'Audio recorded! Please type your message in the text box for now. Full speech-to-text is coming in the next update.',
        [{ text: 'OK' }]
      );
      
      onResult({ text: '', confidence: 0 });
      onEnd?.();
    } catch (error) {
      console.error('Error stopping mobile recording:', error);
      this.isListening = false;
      onEnd?.();
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
          'Speech recognition is not supported in your browser. Please use Chrome or Edge.',
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
        console.log('🎤 Web speech recognition started');
      };

      this.speechRecognition.onresult = (event: any) => {
        const result = event.results[0];
        if (result.isFinal) {
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          console.log('🎤 Speech result:', transcript);
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
            errorMessage = 'Microphone permission denied. Please allow microphone access in your browser.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
        }
        
        onResult({ text: '', error: errorMessage });
        onEnd?.();
      };

      this.speechRecognition.onend = () => {
        this.isListening = false;
        onEnd?.();
        console.log('🎤 Web speech recognition ended');
      };

      this.speechRecognition.start();
      return true;
    } catch (error) {
      console.error('Error setting up web speech recognition:', error);
      return false;
    }
  }

  static stopSpeechToText(): void {
    if (Platform.OS === 'web') {
      if (this.speechRecognition && this.isListening) {
        this.speechRecognition.stop();
        this.isListening = false;
      }
    } else {
      if (this.recording && this.isListening) {
        // Call the async function but don't await it since this method is void
        this.stopMobileSpeechRecognition(
          () => {}, // empty onResult
          () => {}  // empty onEnd
        ).catch(error => {
          console.error('Error stopping mobile speech recognition:', error);
        });
      }
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