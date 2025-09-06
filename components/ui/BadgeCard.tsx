import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

interface BadgeCardProps {
  title: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  points?: number;
  earned?: boolean;
  earnedAt?: string;
  category?: string;
  onPress?: () => void;
}

export function BadgeCard({
  title,
  description,
  icon,
  imageUrl,
  points = 0,
  earned = false,
  earnedAt,
  category,
  onPress
}: BadgeCardProps) {
  const formattedDate = earnedAt ? new Date(earnedAt).toLocaleDateString() : undefined;
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        earned ? styles.earnedContainer : styles.unearnedContainer
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.content}>
        {/* Badge Icon/Image */}
        <View style={[
          styles.iconContainer,
          earned ? styles.earnedIconContainer : styles.unearnedIconContainer
        ]}>
          {icon ? (
            <Text style={styles.iconText}>{icon}</Text>
          ) : imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.image} 
              resizeMode="contain" 
            />
          ) : (
            <Text style={styles.placeholderIcon}>🏅</Text>
          )}
        </View>
        
        {/* Badge Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          
          {description && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
          
          {/* Points and Status */}
          <View style={styles.detailsRow}>
            {points > 0 && (
              <Text style={styles.points}>+{points} pts</Text>
            )}
            
            {earned ? (
              <View style={styles.earnedBadge}>
                <Text style={styles.earnedText}>Earned</Text>
                {formattedDate && (
                  <Text style={styles.dateText}>{formattedDate}</Text>
                )}
              </View>
            ) : (
              <View style={styles.lockedBadge}>
                <Text style={styles.lockedText}>Locked</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      {/* Category Tag */}
      {category && (
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  earnedContainer: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#ff9d00',
  },
  unearnedContainer: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  earnedIconContainer: {
    backgroundColor: '#fff8e1',
    borderWidth: 2,
    borderColor: '#ff9d00',
  },
  unearnedIconContainer: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  iconText: {
    fontSize: 32,
  },
  image: {
    width: 40,
    height: 40,
  },
  placeholderIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    marginBottom: 8,
    lineHeight: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  points: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#ff9d00',
  },
  earnedBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  earnedText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: '#4CAF50',
    textAlign: 'center',
  },
  dateText: {
    fontSize: 8,
    fontFamily: Fonts.body.regular,
    color: '#4CAF50',
    opacity: 0.8,
    textAlign: 'center',
  },
  lockedBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lockedText: {
    fontSize: 10,
    fontFamily: Fonts.body.medium,
    color: '#9e9e9e',
  },
  categoryContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 8,
    fontFamily: Fonts.body.medium,
    color: '#9e9e9e',
    textTransform: 'uppercase',
  },
});