import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

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
          mimeType: (asset.mimeType as string) || 'image/jpeg',
          base64: (asset.base64 as string | undefined),
        };
      }
      return null;
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert('Error', 'Failed to pick image from library. Please try again.');
      return null;
    }
  }

  static async uploadImageToSupabase(bucket: string, pathPrefix: string, localUri: string): Promise<{ publicUrl: string | null; error?: string }> {
    try {
      // Ensure authenticated session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { publicUrl: null, error: 'Not authenticated' };
      }

      // Derive extension safely; default to jpg
      const rawExt = this.getFileExtension(localUri);
      const fileExt = rawExt && rawExt.length <= 5 ? rawExt : 'jpg';
      // Sanitize prefix and build object key
      const safePrefix = (pathPrefix || 'pet-avatars').replace(/^\/+|\/+$/g, '');
      const objectKey = `${safePrefix}_${Date.now()}.${fileExt}`;

      // Read file as base64 and convert to Uint8Array for reliable upload on native
      const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
      const byteArray = MediaUtils.base64ToUint8Array(base64);
      const arrayBuffer = byteArray.buffer;
      const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

      console.log('🆙 Uploading image to storage:', { bucket, objectKey, contentType, bytes: byteArray.byteLength });

      // Direct S3 presigned upload via Edge Function (preferred path)
      try {
        console.log('🔁 Using presigned S3 upload via Edge Function (preferred)...');
        // Include auth headers explicitly for React Native
        const { data: presign, error: presignErr } = await supabase.functions.invoke('s3-presign', {
          body: { bucket, key: objectKey, contentType },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            apikey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '') as string,
          },
        });
        if (presignErr || !presign?.uploadUrl) {
          console.warn('❌ Presign error:', presignErr || presign);
          // If presign failed, attempt direct storage as a fallback
          const { error: directErr } = await supabase.storage
            .from(bucket)
            .upload(objectKey, byteArray, { contentType, upsert: true, cacheControl: '3600' });
          if (directErr) {
            return { publicUrl: null, error: directErr.message };
          }
        } else {
          const blob: any = new Blob([byteArray], { type: contentType });
          const putRes = await fetch(presign.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: blob,
          });
          if (!putRes.ok) {
            const text = await putRes.text().catch(() => '');
            console.warn('❌ PUT to presigned URL failed:', putRes.status, text);
            return { publicUrl: null, error: `Presigned upload failed: ${putRes.status}` };
          }
        }
      } catch (pfErr: any) {
        console.warn('💥 Presign preferred path exception:', pfErr);
        return { publicUrl: null, error: pfErr?.message || 'Presign upload failed' };
      }

      // Ensure the file is public: if bucket is not public, fallback to signed URLs
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectKey);
      let url: string | null = pub?.publicUrl || null;
      if (!url || url.trim() === '') {
        // If presign flow returned a publicUrl, prefer that
        try {
          const { data: presigned } = await supabase.functions.invoke('s3-presign', {
            body: { bucket, key: objectKey, contentType },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              apikey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '') as string,
            },
          });
          if (presigned?.publicUrl) {
            url = presigned.publicUrl;
          }
        } catch {}
        if (!url) {
          // Fallback to signed URL if bucket is private
          const { data: signed, error: signedErr } = await supabase.storage
            .from(bucket)
            .createSignedUrl(objectKey, 60 * 60 * 24 * 365); // 1 year
          if (signedErr) {
            console.warn('⚠️ Signed URL error:', signedErr);
            return { publicUrl: null, error: signedErr.message };
          }
          url = signed?.signedUrl || null;
        }
      }
      console.log('✅ Upload completed. URL:', url);
      return { publicUrl: url };
    } catch (e: any) {
      console.warn('💥 Upload exception:', e);
      return { publicUrl: null, error: e?.message || 'Upload failed' };
    }
  }

  private static base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = globalThis.atob ? globalThis.atob(base64) : MediaUtils._polyfillAtob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Minimal atob polyfill for React Native without global atob
  private static _polyfillAtob(input: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';
    if (str.length % 4 === 1) {
      throw new Error('Invalid base64 string');
    }
    for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))) : 0) {
      buffer = chars.indexOf(buffer);
    }
    return output;
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
          mimeType: (asset.mimeType as string) || 'image/jpeg',
          base64: (asset.base64 as string | undefined),
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