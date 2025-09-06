import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Card } from './Card';
import { Pet } from '@/lib/database';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { CreditCard as Edit3, Trash2 } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Responsive sizing helpers
const responsiveWidth = (percentage: number) => (width * percentage) / 100;
const responsiveHeight = (percentage: number) => (height * percentage) / 100;
const responsiveFontSize = (size: number) => {
  const scale = width / 375; // Base on iPhone X width
  const newSize = size * scale;
  return Math.max(10, Math.min(newSize, size * 1.2)); // Min 10, max 120% of original
};

interface PetCardProps {
  pet: Pet;
  onEdit?: (pet: Pet) => void;
  onDelete?: (pet: Pet) => void;
  onPress?: (pet: Pet) => void;
}

export function PetCard({ pet, onEdit, onDelete, onPress }: PetCardProps) {
  const [avatarError, setAvatarError] = useState(false);

  const isValidImageUri = (uri?: string) => {
    if (!uri) return false;
    return /^https?:\/\/|^file:|^content:/.test(uri);
  };

  const petImageSource = useMemo(() => {
    if (!avatarError && isValidImageUri(pet.avatar_url)) {
      // Cache-bust with updated_at if present
      const version = (pet as any)?.updated_at || Date.now();
      const sep = (pet.avatar_url as string).includes('?') ? '&' : '?';
      return { uri: `${pet.avatar_url}${sep}v=${encodeURIComponent(version)}` } as const;
    }
    return require('@/assets/images/login page icon.png');
  }, [avatarError, pet.avatar_url, (pet as any)?.updated_at]);
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
            source={petImageSource}
            style={styles.avatar}
            resizeMode="cover"
            onError={() => setAvatarError(true)}
          />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{pet.name}</Text>
            <Text style={styles.breed} numberOfLines={1}>{pet.breed}</Text>
            <Text style={styles.details} numberOfLines={1}>
              {pet.age} years • {pet.gender}
            </Text>
          </View>
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleEdit}
              >
                <Edit3 size={responsiveFontSize(16)} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Trash2 size={responsiveFontSize(16)} color={Colors.error} />
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
    marginBottom: responsiveHeight(1.5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: responsiveHeight(8),
  },
  avatar: {
    width: responsiveWidth(15),
    height: responsiveWidth(15),
    borderRadius: responsiveWidth(7.5),
    marginRight: responsiveWidth(4),
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: responsiveWidth(2),
  },
  name: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: responsiveHeight(0.5),
    lineHeight: responsiveFontSize(22),
  },
  breed: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    opacity: 0.8,
    marginBottom: responsiveHeight(0.3),
    lineHeight: responsiveFontSize(16),
  },
  details: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    lineHeight: responsiveFontSize(14),
  },
  actions: {
    flexDirection: 'row',
    gap: responsiveWidth(2),
  },
  actionButton: {
    width: responsiveWidth(8),
    height: responsiveWidth(8),
    borderRadius: responsiveWidth(4),
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.error + '20',
  },
});