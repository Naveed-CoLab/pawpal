import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { usePets } from '@/hooks/useDatabase';
import { Pet } from '@/lib/database';
import { PetCard } from '@/components/ui/PetCard';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { Plus, ArrowLeft } from 'lucide-react-native';

export default function PetsScreen() {
  const { pets, loading, deletePet } = usePets();

  const handleAddPet = () => {
    router.push('/pets/add');
  };

  const handleEditPet = (pet: Pet) => {
    router.push(`/pets/edit?id=${pet.id}`);
  };

  const handleDeletePet = (pet: Pet) => {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to remove ${pet.name} from your pets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deletePet(pet.id);
            if (error) {
              Alert.alert('Error', 'Failed to delete pet. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handlePetPress = (pet: Pet) => {
    router.push(`/pets/details?id=${pet.id}`);
  };

  return (
    <LinearGradient
      colors={Colors.backgroundGradient}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Pets</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPet}
        >
          <Plus size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your pets...</Text>
          </View>
        ) : pets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Pets Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first furry friend to get started with personalized care!
            </Text>
            <Button
              title="Add Your First Pet"
              onPress={handleAddPet}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <View style={styles.petsContainer}>
            {pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onEdit={handleEditPet}
                onDelete={handleDeletePet}
                onPress={handlePetPress}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
  petsContainer: {
    paddingTop: 20,
  },
});