import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { ArrowLeft, Send, Star } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function FeedbackScreen() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: 'bug', label: 'Bug Report', emoji: '🐛' },
    { id: 'feature', label: 'Feature Request', emoji: '✨' },
    { id: 'improvement', label: 'Improvement', emoji: '📈' },
    { id: 'general', label: 'General Feedback', emoji: '💬' },
    { id: 'complaint', label: 'Complaint', emoji: '😔' },
    { id: 'compliment', label: 'Compliment', emoji: '🎉' },
  ];

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Missing Information', 'Please enter your feedback.');
      return;
    }

    if (!category) {
      Alert.alert('Missing Information', 'Please select a feedback category.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Missing Information', 'Please provide a rating (1-5 stars).');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('feedback')
        .insert([{
          user_id: user?.auth_user_id || user?.id,
          feedback_text: feedback.trim(),
          rating: rating,
          category: category,
          user_email: user?.email,
          user_name: user?.name || user?.full_name,
          created_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error('Feedback submission error:', error);
        Alert.alert(
          'Submission Failed',
          'Failed to submit your feedback. Please try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Thank You! 🎉',
          'Your feedback has been submitted successfully. We appreciate your input!',
          [
            {
              text: 'OK',
              onPress: () => {
                router.back();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      Alert.alert(
        'Submission Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#47463e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>We'd Love Your Feedback! 💬</Text>
            <Text style={styles.subtitle}>
              Help us improve VetPaw by sharing your thoughts, suggestions, or reporting issues.
            </Text>
          </View>

          {/* Rating Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>How would you rate your experience? *</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Star
                    size={32}
                    color={star <= rating ? '#ff9d00' : '#e0e0e0'}
                    fill={star <= rating ? '#ff9d00' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 && '😔 Poor'}
                {rating === 2 && '🙁 Fair'}
                {rating === 3 && '😐 Good'}
                {rating === 4 && '😊 Very Good'}
                {rating === 5 && '🤩 Excellent'}
              </Text>
            )}
          </View>

          {/* Category Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What type of feedback is this? *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    category === cat.id && styles.categoryButtonSelected
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryLabel,
                    category === cat.id && styles.categoryLabelSelected
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Feedback Text Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your feedback *</Text>
            <TextInput
              style={styles.textInput}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Tell us what you think, what could be improved, or report any issues you've encountered..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {feedback.length}/500 characters
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!feedback.trim() || !category || rating === 0 || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!feedback.trim() || !category || rating === 0 || isSubmitting}
          >
            <Send size={20} color={Colors.white} />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footer}>
            Your feedback is anonymous and helps us improve VetPaw for all pet parents! 🐾
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8e1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#fff8e1',
    borderBottomWidth: 1,
    borderBottomColor: '#e6d69a',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 25,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: '#47463e',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e6d69a',
    alignItems: 'center',
    width: (width - 60) / 2,
    minHeight: 80,
    justifyContent: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#fff4bb',
    borderColor: '#ff9d00',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    fontFamily: Fonts.body.bold,
    color: '#ff9d00',
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e6d69a',
    padding: 16,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    minHeight: 120,
    maxLength: 500,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#999',
    textAlign: 'right',
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#ff9d00',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ff9d00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  footer: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 