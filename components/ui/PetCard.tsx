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
  const [pressed, setPressed] = useState(false);

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
    <TouchableOpacity
      onPress={() => onPress?.(pet)}
      activeOpacity={0.9}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <Card
        variant="elevated"
        style={[
          styles.container,
          pressed && { transform: [{ translateY: 1 }], opacity: 0.98 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Image
              source={petImageSource}
              style={styles.avatar}
              resizeMode="cover"
              onError={() => setAvatarError(true)}
            />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{pet.name}</Text>
            <Text style={styles.breed} numberOfLines={1}>{pet.breed}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.details} numberOfLines={1}>
                {pet.age} yrs • {pet.gender}
              </Text>
              {!!(pet as any)?.weight && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{(pet as any).weight} kg</Text>
                </View>
              )}
            </View>
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingVertical: responsiveHeight(1.6),
    paddingHorizontal: responsiveWidth(3.5),
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: responsiveHeight(8),
  },
  avatarWrap: {
    width: responsiveWidth(16),
    height: responsiveWidth(16),
    borderRadius: responsiveWidth(8),
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsiveWidth(3.5),
  },
  avatar: {
    width: responsiveWidth(14),
    height: responsiveWidth(14),
    borderRadius: responsiveWidth(7),
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
    marginBottom: responsiveHeight(0.4),
    lineHeight: responsiveFontSize(22),
  },
  breed: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    opacity: 0.85,
    marginBottom: responsiveHeight(0.3),
    lineHeight: responsiveFontSize(16),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(2),
  },
  details: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    lineHeight: responsiveFontSize(14),
  },
  chip: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: responsiveFontSize(10),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: responsiveWidth(2),
    marginLeft: responsiveWidth(1),
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