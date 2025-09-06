import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera, Upload, Sparkles, Heart } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { MoodAnalysisAPI, MoodAnalysisResult } from '@/lib/moodAnalysisAPI';
import { MediaUtils, MediaResult } from '@/lib/mediaUtils';

const { width } = Dimensions.get('window');

interface SnapMoodCardProps {
  onAnalysisComplete?: (result: MoodAnalysisResult, imageUri?: string) => void;
  onSaveMoodLog?: (result: MoodAnalysisResult, context?: string, imageUri?: string) => void;
}

export const SnapMoodCard: React.FC<SnapMoodCardProps> = ({
  onAnalysisComplete,
  onSaveMoodLog
}) => {
  const [step, setStep] = useState<'capture' | 'preview' | 'loading' | 'result'>('capture');
  const [capturedMedia, setCapturedMedia] = useState<MediaResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [moodResult, setMoodResult] = useState<MoodAnalysisResult | null>(null);
  const [saveToHistory, setSaveToHistory] = useState(false);

  const handleCameraCapture = async () => {
    try {
      const media = await MediaUtils.captureImage();
      if (media) {
        setCapturedMedia(media);
        setImageUri(media.uri || null);
        setStep('preview');
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      Alert.alert('Camera Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handleGalleryPick = async () => {
    try {
      const media = await MediaUtils.pickImageFromLibrary();
      if (media) {
        setCapturedMedia(media);
        setImageUri(media.uri || null);
        setStep('preview');
      }
    } catch (error) {
      console.error('Gallery pick error:', error);
      Alert.alert('Gallery Error', 'Failed to select photo. Please try again.');
    }
  };

  const analyzeImage = async () => {
    if (!capturedMedia) return;

    setStep('loading');
    
    try {
      const result = await MoodAnalysisAPI.analyzePetMood(capturedMedia, context);
      setMoodResult(result);
      setStep('result');
      onAnalysisComplete?.(result, imageUri || undefined);
    } catch (error) {
      console.error('Mood analysis error:', error);
      Alert.alert('Analysis Error', 'Failed to analyze your pet\'s mood. Please try again.');
      setStep('preview');
    }
  };

  const saveMoodLog = () => {
    if (!moodResult) return;
    
    onSaveMoodLog?.(moodResult, context || undefined, saveToHistory ? imageUri || undefined : undefined);
    resetCapture();
  };

  const resetCapture = () => {
    setStep('capture');
    setCapturedMedia(null);
    setImageUri(null);
    setContext('');
    setMoodResult(null);
    setSaveToHistory(false);
  };

  const renderCaptureStep = () => (
    <View style={styles.captureContainer}>
      <View style={styles.iconContainer}>
        <Sparkles size={32} color={Colors.primary} />
      </View>
      
      <Text style={styles.title}>Snap My Mood</Text>
      <Text style={styles.subtitle}>
        Take or upload a photo of your pet to analyze their emotional state
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCameraCapture}>
          <Camera size={24} color={Colors.white} />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleGalleryPick}>
          <Upload size={24} color={Colors.primary} />
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Upload Photo</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.privacyText}>
        📷 Photos are processed securely for mood detection, then deleted immediately.
      </Text>
    </View>
  );

  const renderPreviewStep = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.title}>Ready to Analyze</Text>
      
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
      )}
      
      <Text style={styles.inputLabel}>Context (Optional)</Text>
      <TextInput
        style={styles.contextInput}
        placeholder="e.g., 'Fireworks going off outside and my pup keeps pacing'"
        value={context}
        onChangeText={setContext}
        multiline
        maxLength={200}
      />
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.actionButton, styles.smallButton]} onPress={resetCapture}>
          <Text style={styles.buttonText}>Retake</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={analyzeImage}>
          <Sparkles size={20} color={Colors.white} />
          <Text style={styles.buttonText}>Analyze Mood</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLoadingStep = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>🐾 Sniffing emotions...</Text>
      <Text style={styles.loadingSubtext}>Our AI is analyzing your pet's mood</Text>
    </View>
  );

  const renderResultStep = () => {
    if (!moodResult) return null;

    const moodEmoji = MoodAnalysisAPI.getMoodEmoji(moodResult.mood || 'unknown');
    const moodColor = MoodAnalysisAPI.getMoodColor(moodResult.mood || 'unknown');
    const confidencePercent = Math.round((moodResult.confidence || 0) * 100);

    return (
      <View style={styles.resultContainer}>
        <View style={[styles.moodHeader, { backgroundColor: moodColor }]}>
          <Text style={styles.moodEmoji}>{moodEmoji}</Text>
          <Text style={styles.moodLabel}>{(moodResult.mood || 'unknown').replace('_', ' ').toUpperCase()}</Text>
        </View>
        
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confidence</Text>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { 
                  width: `${confidencePercent}%`,
                  backgroundColor: moodColor 
                }
              ]} 
            />
          </View>
          <Text style={styles.confidenceText}>{confidencePercent}%</Text>
        </View>
        
        {(moodResult.cues || []).length > 0 && (
          <View style={styles.cuesContainer}>
            <Text style={styles.sectionTitle}>Visual Cues Observed:</Text>
            {(moodResult.cues || []).map((cue, index) => (
              <Text key={index} style={styles.cueItem}>• {cue || 'No cue data'}</Text>
            ))}
          </View>
        )}
        
        <View style={styles.adviceContainer}>
          <Text style={styles.sectionTitle}>Recommendation:</Text>
          <Text style={styles.adviceText}>{moodResult.advice || 'No advice available'}</Text>
        </View>
        
        <View style={styles.saveSection}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setSaveToHistory(!saveToHistory)}
          >
            <View style={[styles.checkbox, saveToHistory && styles.checkboxChecked]}>
              {saveToHistory && <Heart size={12} color={Colors.white} />}
            </View>
            <Text style={styles.checkboxLabel}>Save to MoodLog</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.actionButton, styles.smallButton]} onPress={resetCapture}>
            <Text style={styles.buttonText}>New Analysis</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={saveMoodLog}>
            <Text style={styles.buttonText}>Save & Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {step === 'capture' && renderCaptureStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'loading' && renderLoadingStep()}
      {step === 'result' && renderResultStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  captureContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  primaryButton: {
    flex: 1,
  },
  smallButton: {
    flex: 0.4,
    backgroundColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  secondaryButtonText: {
    color: Colors.primary,
  },
  privacyText: {
    fontSize: 11,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    textAlign: 'center',
    lineHeight: 16,
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: width - 72,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  contextInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.primary,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    marginTop: 4,
  },
  resultContainer: {
    alignItems: 'center',
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  confidenceContainer: {
    width: '100%',
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginBottom: 4,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    textAlign: 'right',
  },
  cuesContainer: {
    width: '100%',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    marginBottom: 8,
  },
  cueItem: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    marginBottom: 2,
  },
  adviceContainer: {
    width: '100%',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  adviceText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    lineHeight: 18,
  },
  saveSection: {
    width: '100%',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
  },
}); 