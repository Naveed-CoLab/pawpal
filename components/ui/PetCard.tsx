import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Card } from './Card';
import { Pet } from '@/lib/database';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { CreditCard as Edit3, Trash2 } from 'lucide-react-native';

interface PetCardProps {
  pet: Pet;
  onEdit?: (pet: Pet) => void;
  onDelete?: (pet: Pet) => void;
  onPress?: (pet: Pet) => void;
}

export function PetCard({ pet, onEdit, onDelete, onPress }: PetCardProps) {
  const handleEdit = (e: any) => {
    e.stopPropagation();
    onEdit?.(pet);
  };

  const handleDelete = (e: any) => {
    e.stopPropagation();
    onDelete?.(pet);
  };

  return (
    <TouchableOpacity onPress={() => onPress?.(pet)} activeOpacity={0.7}>
      <Card variant="elevated" style={styles.container}>
        <View style={styles.header}>
          <Image
            source={
              pet.avatar_url 
                ? { uri: pet.avatar_url }
                : require('@/assets/images/login page icon.png')
            }
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.info}>
            <Text style={styles.name}>{pet.name}</Text>
            <Text style={styles.breed}>{pet.breed}</Text>
            <Text style={styles.details}>
              {pet.age} years • {pet.gender}
            </Text>
          </View>
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleEdit}
              >
                <Edit3 size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Trash2 size={16} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: 4,
  },
  breed: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    opacity: 0.8,
    marginBottom: 2,
  },
  details: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.error + '20',
  },
});