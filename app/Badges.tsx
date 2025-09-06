import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Award, Filter } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useBadges } from '@/hooks/useBadges';
import { BadgeCard } from '@/components/ui/BadgeCard';

export default function BadgesScreen() {
  const { allBadges, badgesByCategory, badgeStats, loading } = useBadges();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Get unique categories
  const categories = Object.keys(badgesByCategory).sort();
  
  // Filter badges by selected category
  const filteredBadges = selectedCategory 
    ? badgesByCategory[selectedCategory] || []
    : allBadges;
  
  // Get earned vs. total badge counts
  const earnedCount = allBadges.filter(badge => badge.earned).length;
  const totalCount = allBadges.length;
  
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
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Progress Summary */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Award size={24} color="#ff9d00" />
          <Text style={styles.progressTitle}>Your Badge Collection</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnedCount}/{totalCount}</Text>
            <Text style={styles.statLabel}>Badges Earned</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{badgeStats.totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Level {badgeStats.userLevel}</Text>
            <Text style={styles.statLabel}>Current Level</Text>
          </View>
        </View>
        
        <View style={styles.progressBarContainer}>
          <Text style={styles.progressText}>
            Next: {badgeStats.nextMilestone.title} ({badgeStats.totalPoints}/{badgeStats.nextMilestone.points} pts)
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(100, (badgeStats.totalPoints / badgeStats.nextMilestone.points) * 100)}%` }
              ]} 
            />
          </View>
        </View>
      </View>
      
      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCategory === null && styles.filterButtonActive
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text 
              style={[
                styles.filterButtonText,
                selectedCategory === null && styles.filterButtonTextActive
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                selectedCategory === category && styles.filterButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text 
                style={[
                  styles.filterButtonText,
                  selectedCategory === category && styles.filterButtonTextActive
                ]}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Badges List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff9d00" />
          <Text style={styles.loadingText}>Loading badges...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.badgesList}
          contentContainerStyle={styles.badgesContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredBadges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No badges found in this category</Text>
            </View>
          ) : (
            filteredBadges.map(badge => (
              <BadgeCard
                key={badge.id}
                title={badge.title}
                description={badge.description}
                icon={badge.icon}
                imageUrl={badge.image_url}
                points={badge.points}
                earned={badge.earned}
                earnedAt={badge.earned_at}
                category={badge.category}
              />
            ))
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 20,
    paddingTop: 50,
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
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: Fonts.heading.bold,
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: Colors.disabled,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  progressBarContainer: {
    width: '100%',
  },
  progressText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: Colors.secondary,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
  filterContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  badgesList: {
    flex: 1,
  },
  badgesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.disabled,
    textAlign: 'center',
  },
});