import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Calendar, TrendingUp, Crown, Lock } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { SnapMoodCard } from '@/components/ui/SnapMoodCard';
import { useMoodLogs, MoodLog } from '@/hooks/useMoodLogs';
import { usePets } from '@/hooks/useDatabase';
import { useSnackbar, ErrorMessages } from '@/components/ui/SnackbarProvider';
import { MoodAnalysisAPI, MoodAnalysisResult } from '@/lib/moodAnalysisAPI';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { PaywallModal } from '@/components/ui/PaywallModal';

export default function MoodScreen() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'history' | 'stats'>('analyze');
  const [showPaywall, setShowPaywall] = useState(false);
  const { pets, refetch: refetchPets } = usePets();
  const { moodLogs, moodStreaks, saveMoodLog, getMoodStats, getCurrentStreaks } = useMoodLogs();
  const { showError, showSuccess, showWarning } = useSnackbar();
  const { isSubscribed, isLoading: subscriptionLoading } = useSubscriptionStatus();
  
  const primaryPet = pets.length > 0 ? pets[0] : null;

  // Refresh pets data when screen is focused
  useFocusEffect(
    useCallback(() => {
      refetchPets();
    }, [refetchPets])
  );

  const handleAnalysisComplete = (result: MoodAnalysisResult, imageUri?: string) => {
    console.log('🎯 Mood analysis completed:', result);
  };

  const handleAnalysisAttempt = () => {
    if (!isSubscribed) {
      setShowPaywall(true);
      return false; // Prevent analysis
    }
    return true; // Allow analysis
  };

  const handlePaywallSuccess = () => {
    setShowPaywall(false);
    showSuccess('Welcome to Premium! 🎉 You can now analyze your pet\'s mood.');
  };

  const handlePaywallClose = () => {
    setShowPaywall(false);
  };

  // Render premium upgrade prompt for analyze tab
  const renderPremiumPrompt = () => (
    <View style={styles.premiumPrompt}>
      <View style={styles.premiumIcon}>
        <Crown size={40} color="#ff9d00" />
      </View>
      <Text style={styles.premiumTitle}>Premium Feature</Text>
      <Text style={styles.premiumDescription}>
        Mood analysis is a premium feature. Upgrade to unlock AI-powered mood insights for your pet!
      </Text>
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={() => setShowPaywall(true)}
      >
        <Crown size={16} color={Colors.white} />
        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
      </TouchableOpacity>
      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>✨</Text>
          <Text style={styles.featureText}>AI-powered mood analysis</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>📊</Text>
          <Text style={styles.featureText}>Detailed mood history & statistics</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>🎯</Text>
          <Text style={styles.featureText}>Personalized care recommendations</Text>
        </View>
      </View>
    </View>
  );

  const handleSaveMoodLog = async (
    result: MoodAnalysisResult, 
    context?: string, 
    imageUri?: string
  ) => {
    if (!primaryPet) {
      showWarning(
        'You need to add a pet to save mood logs. Would you like to add one now?',
        'Add Pet',
        () => router.push('/pets/add')
      );
      return;
    }

    try {
      const savedLog = await saveMoodLog(primaryPet.id, result, context, imageUri);
      
      if (savedLog) {
        showSuccess(
          `Your pet's ${result.mood} mood has been saved to their history! 🎉`,
          'View History',
          () => setActiveTab('history')
        );
      } else {
        showWarning('Mood analysis completed but may not have been saved. Check your connection.');
      }
    } catch (error) {
      console.error('Error saving mood log:', error);
      showError(ErrorMessages.MOOD_SAVE_FAILED, 'Retry', () => handleSaveMoodLog(result, context, imageUri));
    }
  };

  const renderMoodLogItem = ({ item }: { item: MoodLog }) => {
    const moodEmoji = MoodAnalysisAPI.getMoodEmoji(item.mood);
    const moodColor = MoodAnalysisAPI.getMoodColor(item.mood);
    const date = new Date(item.created_at).toLocaleDateString();
    const time = new Date(item.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <View style={styles.moodLogItem}>
        <View style={[styles.moodIndicator, { backgroundColor: moodColor }]}>
          <Text style={styles.moodLogEmoji}>{moodEmoji}</Text>
        </View>
        
        <View style={styles.moodLogContent}>
          <View style={styles.moodLogHeader}>
            <Text style={styles.moodLogMood}>
              {item.mood.charAt(0).toUpperCase() + item.mood.slice(1).replace('_', ' ')}
            </Text>
            <Text style={styles.moodLogDate}>{date}</Text>
          </View>
          
          <Text style={styles.moodLogAdvice}>{item.advice}</Text>
          
          {item.context && (
            <Text style={styles.moodLogContext}>Context: {item.context}</Text>
          )}
          
          <View style={styles.moodLogFooter}>
            <Text style={styles.moodLogConfidence}>
              {Math.round(item.confidence * 100)}% confidence
            </Text>
            <Text style={styles.moodLogTime}>{time}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStatsTab = () => {
    if (!primaryPet) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Add a pet to view mood statistics</Text>
        </View>
      );
    }

    const stats = getMoodStats();
    const streaks = getCurrentStreaks(primaryPet.id);

    return (
      <ScrollView style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Mood Overview</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Analyses:</Text>
            <Text style={styles.statValue}>{stats.totalLogs}</Text>
          </View>
          
          {stats.mostCommonMood && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Most Common Mood:</Text>
              <Text style={styles.statValue}>
                {MoodAnalysisAPI.getMoodEmoji(stats.mostCommonMood)} {stats.mostCommonMood}
              </Text>
            </View>
          )}
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Average Confidence:</Text>
            <Text style={styles.statValue}>
              {Math.round(stats.averageConfidence * 100)}%
            </Text>
          </View>
        </View>

        {streaks.length > 0 && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>🔥 Current Streaks</Text>
            {streaks.map((streak) => (
              <View key={streak.id} style={styles.streakItem}>
                <Text style={styles.streakType}>
                  {streak.streak_type === 'happy' ? '😊 Happy Streak' : '📅 Daily Check Streak'}
                </Text>
                <Text style={styles.streakCount}>
                  {streak.current_count} days (Best: {streak.best_count})
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#544c3a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Snap My Mood</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analyze' && styles.activeTab]}
          onPress={() => setActiveTab('analyze')}
        >
          <Text style={[styles.tabText, activeTab === 'analyze' && styles.activeTabText]}>
            📸 Analyze
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Calendar size={16} color={activeTab === 'history' ? Colors.white : Colors.text} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <TrendingUp size={16} color={activeTab === 'stats' ? Colors.white : Colors.text} />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'analyze' && (
          <>
            {!subscriptionLoading && !isSubscribed ? (
              renderPremiumPrompt()
            ) : (
              <SnapMoodCard
                onAnalysisComplete={handleAnalysisComplete}
                onSaveMoodLog={handleSaveMoodLog}
                onAnalysisAttempt={handleAnalysisAttempt}
              />
            )}
          </>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            {moodLogs.length > 0 ? (
              <FlatList
                data={moodLogs}
                renderItem={renderMoodLogItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No mood logs yet</Text>
                <Text style={styles.emptySubtext}>
                  Take your first mood analysis to start building your pet's emotional profile
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setActiveTab('analyze')}
                >
                  <Text style={styles.emptyButtonText}>Start Analyzing</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeTab === 'stats' && renderStatsTab()}
      </ScrollView>

      {/* Premium Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={handlePaywallClose}
        onPurchaseSuccess={handlePaywallSuccess}
        requiredEntitlement="premium"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFF8E1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    marginHorizontal: 4,
    borderRadius: 12,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#ff9d00',
  },
  tabText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
  },
  activeTabText: {
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  historyContainer: {
    padding: 16,
  },
  moodLogItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  moodIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moodLogEmoji: {
    fontSize: 20,
  },
  moodLogContent: {
    flex: 1,
  },
  moodLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  moodLogMood: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
  },
  moodLogDate: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
  },
  moodLogAdvice: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    marginBottom: 8,
    lineHeight: 18,
  },
  moodLogContext: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  moodLogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodLogConfidence: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
  },
  moodLogTime: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#ff9d00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  statsContainer: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
  },
  statValue: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
  },
  streakItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakType: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
  },
  streakCount: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#ff9d00',
  },
  debugSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFE0B2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff9d00',
  },
  debugTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#E65100',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#E65100',
    marginBottom: 4,
  },
  debugButton: {
    backgroundColor: '#ff9d00',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8,
  },
  debugButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: Colors.white,
    textAlign: 'center',
  },
  premiumPrompt: {
    margin: 16,
    padding: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff8e3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  premiumTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumDescription: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9d00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.white,
  },
  featureList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureBullet: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
  },
}); 