import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { BehaviorTrendChart } from '@/components/ui/BehaviorTrendChart';
import { usePets } from '@/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';
import { BehaviorTrendData } from '@/lib/behaviorTrendService';
import { 
  Activity, 
  ArrowLeft, 
  Heart, 
  Brain,
  Calendar,
  TrendingUp,
  Info,
  Plus
} from 'lucide-react-native';

export default function TrendsScreen() {
  const { user, isLoading } = useAuth();
  const { pets, loading: petsLoading } = usePets();
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>();
  const [trendData, setTrendData] = useState<BehaviorTrendData | null>(null);

  // Get primary pet or first pet
  const primaryPet = pets.find(p => p.is_primary) || pets[0];
  const currentPetId = selectedPetId || primaryPet?.id;
  const currentPet = pets.find(p => p.id === currentPetId);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (!selectedPetId && primaryPet) {
        setSelectedPetId(primaryPet.id);
      }
    }, [primaryPet, selectedPetId])
  );

  const handleTrendDataChange = (data: BehaviorTrendData) => {
    setTrendData(data);
  };

  const handleAddData = () => {
    Alert.alert(
      'Add Behavior Data',
      'Choose how to add behavior data for your pet:',
      [
        {
          text: 'Snap My Mood',
          onPress: () => router.push('/(tabs)/mood')
        },
        {
          text: 'Health Check',
          onPress: () => router.push('/(tabs)/health')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleInfoPress = () => {
    Alert.alert(
      'About Behavior Trends',
      'This graph shows your pet\'s behavior patterns over time by combining:\n\n' +
      '• Mood analysis from Snap My Mood photos\n' +
      '• Health assessments from symptom checker\n\n' +
      'Higher scores indicate better mood and health. Use this to track your pet\'s wellbeing and identify patterns.',
      [{ text: 'Got it!' }]
    );
  };

  // Show loading state while auth is initializing OR while pets are loading
  if (isLoading || petsLoading) {
    return (
      <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {isLoading ? 'Checking authentication...' : 'Loading pets...'}
        </Text>
      </LinearGradient>
    );
  }

  // Only show "sign in" message after auth has finished loading and no user found
  if (!user) {
    return (
      <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Please sign in</Text>
        <Text style={styles.errorText}>You need to be signed in to view behavior trends.</Text>
      </LinearGradient>
    );
  }

  if (pets.length === 0) {
    return (
      <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.emptyContainer}>
        <Heart size={60} color="#ffcc80" />
        <Text style={styles.emptyTitle}>No Pets Found</Text>
        <Text style={styles.emptySubtitle}>
          Add your pet to start tracking their behavior trends
        </Text>
        <TouchableOpacity
          style={styles.addPetButton}
          onPress={() => router.push('/pets/add')}
        >
          <Plus size={20} color="#fff8e1" />
          <Text style={styles.addPetButtonText}>Add Your Pet</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#fff8e1', '#fff8e1']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#47463e" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Behavior Trends</Text>
            <Text style={styles.headerSubtitle}>
              {currentPet?.name || 'Your Pet'}'s Wellbeing Journey
            </Text>
          </View>

          <TouchableOpacity
            style={styles.infoButton}
            onPress={handleInfoPress}
          >
            <Info size={20} color="#ff9d00" />
          </TouchableOpacity>
        </View>

        {/* Pet Selector */}
        {pets.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.petSelector}
            contentContainerStyle={styles.petSelectorContent}
          >
            {pets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petChip,
                  currentPetId === pet.id && styles.petChipActive
                ]}
                onPress={() => setSelectedPetId(pet.id)}
              >
                <Text style={[
                  styles.petChipText,
                  currentPetId === pet.id && styles.petChipTextActive
                ]}>
                  {pet.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.content}>
        {currentPetId ? (
          <BehaviorTrendChart
            petId={currentPetId}
            timeRange={30}
            onDataChange={handleTrendDataChange}
            hideHeader={true}
          />
        ) : (
          <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.noPetContainer}>
            <Activity size={40} color="#ffcc80" />
            <Text style={styles.noPetText}>Select a pet to view trends</Text>
          </LinearGradient>
        )}
      </View>

      {/* Quick Actions */}
      {trendData?.insights.totalEntries === 0 && (
        <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Get Started</Text>
          <Text style={styles.quickActionsSubtitle}>
            Add some behavior data to see your pet's trends
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.moodButton]}
              onPress={() => router.push('/(tabs)/mood')}
            >
              <Brain size={20} color="#fff8e1" />
              <Text style={styles.actionButtonText}>Snap My Mood</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.healthButton]}
              onPress={() => router.push('/(tabs)/health')}
            >
              <Heart size={20} color="#fff8e1" />
              <Text style={styles.actionButtonText}>Health Check</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      {/* Floating Add Button */}
      {trendData?.insights.totalEntries > 0 && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleAddData}
        >
          <Plus size={24} color="#fff8e1" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8e1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addPetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9d00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#8d6e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addPetButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: '#fff8e1',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffecb3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8d6e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    marginTop: 2,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffecb3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8d6e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  petSelector: {
    marginTop: 10,
  },
  petSelectorContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  petChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffecb3',
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  petChipActive: {
    backgroundColor: '#ff9d00',
    borderColor: '#ff9d00',
  },
  petChipText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
  },
  petChipTextActive: {
    color: '#fff8e1',
  },
  content: {
    flex: 1,
  },
  noPetContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noPetText: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    marginTop: 12,
  },
  quickActions: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#8d6e63',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionsSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  moodButton: {
    backgroundColor: '#ff9d00',
  },
  healthButton: {
    backgroundColor: '#66bb6a',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: '#fff8e1',
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff9d00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8d6e63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
}); 