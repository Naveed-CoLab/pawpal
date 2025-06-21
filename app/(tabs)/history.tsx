import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useSymptomAssessments, useChats } from '@/hooks/useDatabase';
import { Heart, TriangleAlert, Clock, CircleCheck as CheckCircle, Calendar, Video, MessageCircle } from 'lucide-react-native';

type HistoryItemType = 'assessment' | 'coaching' | 'chat';

interface HistoryItem {
  id: string;
  type: HistoryItemType;
  title: string;
  date: string;
  urgency?: string;
  summary?: string;
  data: any;
}

export default function HistoryScreen() {
  const { assessments, loading: assessmentsLoading, error: assessmentsError } = useSymptomAssessments();
  const { chats, loading: chatsLoading, error: chatsError } = useChats();
  const [selectedFilter, setSelectedFilter] = useState<'all' | HistoryItemType>('all');

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getUrgencyIcon = useCallback((level: string) => {
    switch (level) {
      case 'emergency':
        return <TriangleAlert size={20} color={Colors.error} />;
      case 'moderate':
        return <Clock size={20} color={Colors.warning} />;
      case 'mild':
        return <CheckCircle size={20} color={Colors.success} />;
      default:
        return <Heart size={20} color={Colors.primary} />;
    }
  }, []);

  const getUrgencyColor = useCallback((level: string) => {
    switch (level) {
      case 'emergency': return Colors.error;
      case 'moderate': return Colors.warning;
      case 'mild': return Colors.success;
      default: return Colors.primary;
    }
  }, []);

  const getTypeIcon = useCallback((type: HistoryItemType) => {
    switch (type) {
      case 'coaching':
        return <Video size={20} color={Colors.primary} />;
      case 'chat':
        return <MessageCircle size={20} color={Colors.primary} />;
      case 'assessment':
        return <Heart size={20} color={Colors.primary} />;
      default:
        return <Heart size={20} color={Colors.primary} />;
    }
  }, []);

  // Memoize history items to prevent recalculation on each render
  const allHistoryItems = useMemo(() => {
    const items: HistoryItem[] = [];

    // Add assessments
    assessments.forEach(assessment => {
      items.push({
        id: assessment.id,
        type: 'assessment',
        title: 'Health Assessment',
        date: assessment.created_at,
        urgency: assessment.urgency_level,
        summary: assessment.vet_recommendation,
        data: assessment,
      });
    });

    // Add chats (both regular and coaching)
    chats.forEach(chat => {
      // Determine if this is a coaching session based on title or other indicators
      const isCoaching = chat.title.toLowerCase().includes('coaching') || 
                        chat.title.toLowerCase().includes('coach') ||
                        chat.title.toLowerCase().includes('james');
      
      items.push({
        id: chat.id,
        type: isCoaching ? 'coaching' : 'chat',
        title: chat.title,
        date: chat.updated_at,
        summary: isCoaching ? 'Live coaching session with James' : 'AI chat conversation',
        data: chat,
      });
    });

    // Sort by date (newest first)
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [assessments, chats]);

  // Memoize filtered items to prevent recalculation on each render
  const filteredItems = useMemo(() => {
    return selectedFilter === 'all' 
      ? allHistoryItems 
      : allHistoryItems.filter(item => item.type === selectedFilter);
  }, [allHistoryItems, selectedFilter]);

  const navigateToDetail = useCallback((item: HistoryItem) => {
    try {
      switch (item.type) {
        case 'assessment':
          router.push(`/assessment/${item.id}`);
          break;
        case 'coaching':
          // For now, show an alert - in the future, you could create a coaching detail view
          Alert.alert(
            'Coaching Session',
            `Session: ${item.title}\nDate: ${formatDate(item.date)}\n\nCoaching session details and replay will be available soon!`,
            [{ text: 'OK' }]
          );
          break;
        case 'chat':
          // For now, show an alert - in the future, you could create a chat detail view
          Alert.alert(
            'Chat Session',
            `Chat: ${item.title}\nDate: ${formatDate(item.date)}\n\nChat history details will be available soon!`,
            [{ text: 'OK' }]
          );
          break;
        default:
          Alert.alert('Coming Soon', 'Detailed view for this item is coming soon!');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert(
        'Navigation Error',
        'Unable to open details. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [formatDate]);

  const renderFilterButton = useCallback((filter: 'all' | HistoryItemType, label: string, icon?: React.ReactNode) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      {icon}
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  ), [selectedFilter]);

  const renderHistoryItem = useCallback(({ item }: { item: HistoryItem }) => (
    <TouchableOpacity onPress={() => navigateToDetail(item)}>
      <Card variant="elevated" style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={styles.typeIndicator}>
            {getTypeIcon(item.type)}
            <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
          </View>
          
          {item.urgency && (
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) }]}>
              {getUrgencyIcon(item.urgency)}
              <Text style={styles.urgencyText}>{item.urgency.toUpperCase()}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.dateContainer}>
          <Calendar size={14} color={Colors.disabled} />
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
        
        <Text style={styles.itemTitle}>{item.title}</Text>
        
        {item.summary && (
          <Text style={styles.itemSummary} numberOfLines={2}>
            {item.summary}
          </Text>
        )}
        
        {item.type === 'assessment' && item.data.symptoms_selected && (
          <View style={styles.symptomsContainer}>
            <Text style={styles.symptomsTitle}>Symptoms:</Text>
            <View style={styles.symptomsTagsContainer}>
              {item.data.symptoms_selected.slice(0, 3).map((symptom: string, index: number) => (
                <View key={index} style={styles.symptomTag}>
                  <Text style={styles.symptomText}>{symptom}</Text>
                </View>
              ))}
              {item.data.symptoms_selected.length > 3 && (
                <View style={styles.symptomTag}>
                  <Text style={styles.symptomText}>+{item.data.symptoms_selected.length - 3} more</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.viewDetailsContainer}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </View>
      </Card>
    </TouchableOpacity>
  ), [formatDate, getTypeIcon, getUrgencyColor, getUrgencyIcon, navigateToDetail]);

  const loading = assessmentsLoading || chatsLoading;
  const error = assessmentsError || chatsError;

  return (
    <LinearGradient
      colors={Colors.backgroundGradient}
      style={styles.container}
    >
      <View style={styles.header}>
        <Heart size={32} color={Colors.primary} />
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerSubtitle}>
          Your health assessments and coaching sessions
        </Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('assessment', 'Health', <Heart size={16} color={selectedFilter === 'assessment' ? Colors.white : Colors.primary} />)}
        {renderFilterButton('coaching', 'Coaching', <Video size={16} color={selectedFilter === 'coaching' ? Colors.white : Colors.primary} />)}
        {renderFilterButton('chat', 'Chat', <MessageCircle size={16} color={selectedFilter === 'chat' ? Colors.white : Colors.primary} />)}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your history...</Text>
        </View>
      ) : error ? (
        <Card variant="elevated" style={styles.errorCard}>
          <Text style={styles.errorText}>
            Unable to load history. Please try again later.
          </Text>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card variant="elevated" style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {selectedFilter === 'all' 
              ? 'No history found. Start using VetPaw to see your activity here!'
              : `No ${selectedFilter} history found.`
            }
          </Text>
        </Card>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: Colors.primary,
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  historyCard: {
    marginBottom: 16,
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: Colors.primary,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  urgencyText: {
    color: Colors.white,
    fontFamily: Fonts.body.bold,
    fontSize: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontFamily: Fonts.body.regular,
    fontSize: 12,
    color: Colors.disabled,
    marginLeft: 4,
  },
  itemTitle: {
    fontFamily: Fonts.body.semiBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  itemSummary: {
    fontFamily: Fonts.body.regular,
    fontSize: 13,
    color: Colors.text,
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: 8,
  },
  symptomsContainer: {
    marginBottom: 8,
  },
  symptomsTitle: {
    fontFamily: Fonts.body.semiBold,
    fontSize: 12,
    color: Colors.text,
    marginBottom: 4,
  },
  symptomsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  symptomTag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  symptomText: {
    fontFamily: Fonts.body.regular,
    fontSize: 10,
    color: Colors.text,
  },
  viewDetailsContainer: {
    alignItems: 'flex-end',
  },
  viewDetailsText: {
    fontFamily: Fonts.body.medium,
    fontSize: 12,
    color: Colors.primary,
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
  },
  errorText: {
    fontFamily: Fonts.body.medium,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  emptyCard: {
    margin: 16,
    padding: 16,
  },
  emptyText: {
    fontFamily: Fonts.body.medium,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
});