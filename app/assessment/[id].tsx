import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { databaseService } from '@/lib/database';
import { useAuth } from '@/hooks/useAuth';
import { Heart, TriangleAlert, Clock, CheckCircle, ArrowLeft, MapPin, Phone, Search } from 'lucide-react-native';

export default function AssessmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasValidatedSession = useRef(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!id || typeof id !== 'string') {
        setError('Invalid assessment ID');
        setLoading(false);
        return;
      }

      if (!user) {
        setError('You must be logged in to view this assessment');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await databaseService.getSymptomAssessment(id);
        
        if (error) {
          throw new Error(error);
        }
        
        if (!data) {
          throw new Error('Assessment not found');
        }
        
        // Check if the assessment belongs to the current user
        // The user ID in the assessment could be either the auth_user_id or the database user id
        const currentUserId = user.id;
        const currentAuthUserId = user.auth_user_id;
        
        // Only log once to avoid console spam
        if (!hasValidatedSession.current) {
          console.log('Checking assessment access:', {
            assessmentUserId: data.user_id,
            currentUserId,
            currentAuthUserId
          });
        }
        
        if (data.user_id !== currentUserId && data.user_id !== currentAuthUserId) {
          throw new Error('You do not have permission to view this assessment');
        }
        
        setAssessment(data);
      } catch (err: any) {
        console.error('Error fetching assessment:', err);
        setError(err.message);
        
        // If permission error, navigate back after showing alert
        if (err.message.includes('permission')) {
          Alert.alert('Access Denied', err.message, [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      } finally {
        setLoading(false);
        hasValidatedSession.current = true;
      }
    };

    // Only fetch when auth is no longer loading
    if (!authLoading) {
      fetchAssessment();
    }
  }, [id, user?.id, user?.auth_user_id, authLoading]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'emergency':
        return <TriangleAlert size={24} color={Colors.white} />;
      case 'moderate':
        return <Clock size={24} color={Colors.white} />;
      case 'mild':
        return <CheckCircle size={24} color={Colors.white} />;
      default:
        return <Heart size={24} color={Colors.white} />;
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'emergency': return Colors.error;
      case 'moderate': return Colors.warning;
      case 'mild': return Colors.success;
      default: return Colors.primary;
    }
  };

  const findNearbyVets = () => {
    const query = assessment?.user_location 
      ? `veterinary emergency clinic near ${assessment.user_location}`
      : 'veterinary emergency clinic near me';
    
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    Linking.openURL(url);
  };

  const callEmergencyVet = () => {
    Alert.alert(
      'Emergency Veterinary Help',
      'Choose an option:',
      [
        { text: 'Call Local Emergency Vet', onPress: () => Linking.openURL('tel:') },
        { text: 'Pet Poison Helpline', onPress: () => Linking.openURL('tel:8557647661') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={Colors.backgroundGradient}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading assessment details...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error && !error.includes('permission')) {
    return (
      <LinearGradient
        colors={Colors.backgroundGradient}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assessment Details</Text>
        </View>
        <Card variant="elevated" style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button 
            title="Go Back" 
            onPress={() => router.back()} 
            style={styles.goBackButton} 
          />
        </Card>
      </LinearGradient>
    );
  }

  if (!assessment) return null;

  return (
    <LinearGradient
      colors={Colors.backgroundGradient}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assessment Details</Text>
        </View>

        {/* Assessment Date */}
        <Card variant="outlined" style={styles.dateCard}>
          <Text style={styles.dateText}>{formatDate(assessment.created_at)}</Text>
        </Card>

        {/* Urgency Level */}
        <View style={[
          styles.urgencyBanner,
          { backgroundColor: getUrgencyColor(assessment.urgency_level) }
        ]}>
          <View style={styles.urgencyIconContainer}>
            {getUrgencyIcon(assessment.urgency_level)}
          </View>
          <View style={styles.urgencyTextContainer}>
            <Text style={styles.urgencyTitle}>
              {assessment.urgency_level.toUpperCase()} PRIORITY
            </Text>
            <Text style={styles.urgencyDescription}>
              {assessment.urgency_level === 'emergency' && 'Requires immediate veterinary attention'}
              {assessment.urgency_level === 'moderate' && 'Requires veterinary attention soon'}
              {assessment.urgency_level === 'mild' && 'Monitor and consult vet if worsens'}
            </Text>
          </View>
        </View>

        {/* Symptoms */}
        <Card variant="elevated" style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Symptoms Assessed</Text>
          <View style={styles.symptomsContainer}>
            {assessment.symptoms_selected.map((symptom: string, index: number) => (
              <View key={index} style={styles.symptomTag}>
                <Text style={styles.symptomText}>{symptom}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* AI Analysis */}
        <Card variant="elevated" style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Professional Analysis</Text>
          <Text style={styles.analysisText}>{assessment.ai_analysis}</Text>
        </Card>

        {/* Immediate Actions */}
        <Card variant="elevated" style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Immediate Actions</Text>
          {assessment.immediate_actions.map((action: string, index: number) => (
            <Text key={index} style={styles.listItem}>• {action}</Text>
          ))}
        </Card>

        {/* Warnings */}
        {assessment.warnings.length > 0 && (
          <Card variant="elevated" style={[styles.contentCard, styles.warningCard]}>
            <Text style={styles.warningTitle}>Important Warnings</Text>
            {assessment.warnings.map((warning: string, index: number) => (
              <Text key={index} style={styles.warningItem}>• {warning}</Text>
            ))}
          </Card>
        )}

        {/* Vet Recommendation */}
        <Card variant="elevated" style={[styles.contentCard, { borderLeftWidth: 4, borderLeftColor: getUrgencyColor(assessment.urgency_level) }]}>
          <Text style={styles.sectionTitle}>Veterinary Recommendation</Text>
          <Text style={styles.recommendationText}>{assessment.vet_recommendation}</Text>
        </Card>

        {/* Possible Causes */}
        <Card variant="elevated" style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Possible Causes</Text>
          <Text style={styles.causesText}>
            {assessment.possible_causes.join(', ')}
          </Text>
        </Card>

        {/* Location */}
        {assessment.user_location && (
          <Card variant="elevated" style={styles.contentCard}>
            <View style={styles.locationHeader}>
              <MapPin size={18} color={Colors.primary} />
              <Text style={styles.locationTitle}>Assessment Location</Text>
            </View>
            <Text style={styles.locationText}>{assessment.user_location}</Text>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {assessment.urgency_level === 'emergency' && (
            <Button
              title="🚨 Call Emergency Vet"
              onPress={callEmergencyVet}
              style={[styles.emergencyButton, { backgroundColor: Colors.error }]}
            />
          )}
          <Button
            title="📍 Find Nearby Vets"
            onPress={findNearbyVets}
            variant="outline"
            style={styles.findVetsButton}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginLeft: 8,
  },
  dateCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    alignItems: 'center',
  },
  dateText: {
    fontFamily: Fonts.body.medium,
    fontSize: 14,
    color: Colors.disabled,
  },
  urgencyBanner: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  urgencyIconContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgencyTextContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  urgencyTitle: {
    fontFamily: Fonts.heading.bold,
    fontSize: 16,
    color: Colors.white,
    marginBottom: 4,
  },
  urgencyDescription: {
    fontFamily: Fonts.body.regular,
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
  },
  contentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontFamily: Fonts.heading.semiBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomTag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  symptomText: {
    fontFamily: Fonts.body.medium,
    fontSize: 12,
    color: Colors.text,
  },
  analysisText: {
    fontFamily: Fonts.body.regular,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  listItem: {
    fontFamily: Fonts.body.regular,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  warningCard: {
    backgroundColor: Colors.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningTitle: {
    fontFamily: Fonts.heading.semiBold,
    fontSize: 16,
    color: Colors.warning,
    marginBottom: 12,
  },
  warningItem: {
    fontFamily: Fonts.body.regular,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  recommendationText: {
    fontFamily: Fonts.body.medium,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  causesText: {
    fontFamily: Fonts.body.regular,
    fontSize: 14,
    color: Colors.text,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontFamily: Fonts.body.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  locationText: {
    fontFamily: Fonts.body.regular,
    fontSize: 14,
    color: Colors.text,
  },
  actionButtonsContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  emergencyButton: {
    marginBottom: 8,
  },
  findVetsButton: {
    borderColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.body.medium,
    fontSize: 14,
    color: Colors.text,
    marginTop: 12,
  },
  errorCard: {
    margin: 16,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.body.medium,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  goBackButton: {
    width: 120,
  },
}); 