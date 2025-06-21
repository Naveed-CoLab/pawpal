import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';

export interface MediaResult {
  uri: string;
  type: 'image' | 'video';
  name?: string;
  size?: number;
  mimeType?: string;
  base64?: string;
}

export class MediaUtils {
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
          Alert.alert(
            'Permissions Required',
            'VetPaw needs camera and photo library permissions to analyze your pet images. Please enable them in your device settings.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  static async pickImageFromLibrary(): Promise<MediaResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          type: 'image',
          name: asset.fileName || 'pet_image.jpg',
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
          base64: asset.base64,
        };
      }
      return null;
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert('Error', 'Failed to pick image from library. Please try again.');
      return null;
    }
  }

  static async pickVideoFromLibrary(): Promise<MediaResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 30, // 30 seconds max for AI analysis
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          type: 'video',
          name: asset.fileName || 'pet_video.mp4',
          size: asset.fileSize,
          mimeType: asset.mimeType || 'video/mp4',
        };
      }
      return null;
    } catch (error) {
      console.error('Error picking video from library:', error);
      Alert.alert('Error', 'Failed to pick video from library. Please try again.');
      return null;
    }
  }

  static async captureImage(): Promise<MediaResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          type: 'image',
          name: `pet_photo_${Date.now()}.jpg`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
          base64: asset.base64,
        };
      }
      return null;
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
      return null;
    }
  }

  static async captureVideo(): Promise<MediaResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 30, // 30 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          type: 'video',
          name: `pet_video_${Date.now()}.mp4`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'video/mp4',
        };
      }
      return null;
    } catch (error) {
      console.error('Error capturing video:', error);
      Alert.alert('Error', 'Failed to capture video. Please try again.');
      return null;
    }
  }

  static async showMediaPicker(): Promise<MediaResult | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Media',
        'Choose how you want to add media for AI analysis',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await this.captureImage();
              resolve(result);
            },
          },
          {
            text: 'Take Video',
            onPress: async () => {
              const result = await this.captureVideo();
              resolve(result);
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await this.pickImageFromLibrary();
              resolve(result);
            },
          },
          {
            text: 'Video Library',
            onPress: async () => {
              const result = await this.pickVideoFromLibrary();
              resolve(result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ],
        { cancelable: true }
      );
    });
  }

  static getFileExtension(uri: string): string {
    return uri.split('.').pop()?.toLowerCase() || '';
  }

  static isValidImageType(mimeType?: string): boolean {
    if (!mimeType) return false;
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType.toLowerCase());
  }

  static isValidVideoType(mimeType?: string): boolean {
    if (!mimeType) return false;
    return ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'].includes(mimeType.toLowerCase());
  }

  static formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
} 