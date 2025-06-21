import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { CoachingSessionCard } from '@/components/ui/CoachingSessionCard';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/hooks/useAuth';
import { databaseService } from '@/lib/database';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Star, 
  TrendingUp, 
  Award,
  Search,
  Filter,
  Plus
} from 'lucide-react-native';

interface SessionSummary {
  session_id: string;
  urgency_level: 'low' | 'medium' | 'high';
  primary_issue: string;
  recommendations: string[];
  follow_up_steps: string[];
  analysis_data: any;
  created_at: string;
}

interface CoachingSession {
  id: string;
  user_id: string;
  pet_id?: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'cancelled';
  tavus_session_id?: string;
  primary_concern?: string;
  created_at: string;
  updated_at: string;
}

export default function CoachHistoryScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [summaries, setSummaries] = useState<{ [key: string]: SessionSummary }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'active'>('all');

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load coaching sessions
      const { data: sessionsData, error: sessionsError } = await databaseService.getCoachingSessions(user.id);
      
      if (sessionsError) {
        throw new Error(sessionsError);
      }

      setSessions(sessionsData || []);

      // Load summaries for completed sessions
      if (sessionsData && sessionsData.length > 0) {
        const completedSessions = sessionsData.filter(s => s.status === 'completed');
        const summaryPromises = completedSessions.map(async (session) => {
          try {
            const { data, error } = await databaseService.getSessionSummary(session.id);
            if (!error && data) {
              return { sessionId: session.id, summary: data };
            }
            return null;
          } catch (error) {
            console.error(`Failed to load summary for session ${session.id}:`, error);
            return null;
          }
        });

        const summaryResults = await Promise.all(summaryPromises);
        const summariesMap: { [key: string]: SessionSummary } = {};
        
        summaryResults.forEach(result => {
          if (result) {
            summariesMap[result.sessionId] = result.summary;
          }
        });

        setSummaries(summariesMap);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      Alert.alert('Error', 'Failed to load coaching history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleSessionPress = (session: CoachingSession) => {
    const summary = summaries[session.id];
    
    if (session.status === 'completed' && summary) {
      // Navigate to summary view
      router.push({
        pathname: '/coach/summary',
        params: {
          sessionId: session.id,
          summary: JSON.stringify(summary),
        }
      });
    } else if (session.status === 'active') {
      Alert.alert(
        'Active Session',
        'This session is currently active. Would you like to rejoin?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Rejoin', 
            onPress: () => {
              router.push({
                pathname: '/coach/live',
                params: {
                  sessionId: session.id,
                  rejoin: 'true'
                }
              });
            }
          }
        ]
      );
    } else {
      Alert.alert('Session Unavailable', 'This session cannot be viewed at this time.');
    }
  };

  const handleStartNewSession = () => {
    router.push('/coach/intro');
  };

  const getFilteredSessions = () => {
    switch (filterStatus) {
      case 'completed':
        return sessions.filter(s => s.status === 'completed');
      case 'active':
        return sessions.filter(s => s.status === 'active');
      default:
        return sessions;
    }
  };

  const getSessionStats = () => {
    const completed = sessions.filter(s => s.status === 'completed').length;
    const totalTime = sessions
      .filter(s => s.status === 'completed' && s.started_at && s.ended_at)
      .reduce((total, session) => {
        const start = new Date(session.started_at);
        const end = new Date(session.ended_at!);
        return total + (end.getTime() - start.getTime());
      }, 0);

    const avgRating = Object.values(summaries)
      .filter(s => s.analysis_data?.rating)
      .reduce((sum, s, _, arr) => sum + (s.analysis_data.rating / arr.length), 0);

    return {
      totalSessions: completed,
      totalTime: Math.floor(totalTime / (1000 * 60)), // Convert to minutes
      averageRating: avgRating || 0,
    };
  };

  const stats = getSessionStats();
  const filteredSessions = getFilteredSessions();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff9d00" />
        <Text style={styles.loadingText}>Loading your coaching history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF8E1', '#ffffff']}
        style={styles.backgroundGradient}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#544c3a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coaching History</Text>
        <TouchableOpacity 
          style={styles.newSessionButton}
          onPress={handleStartNewSession}
        >
          <Plus size={24} color="#ff9d00" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#ff9d00']}
          />
        }
      >
        {/* Stats Cards */}
        {sessions.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <Card variant="elevated" style={styles.statCard}>
                <Award size={20} color="#ff9d00" />
                <Text style={styles.statNumber}>{stats.totalSessions}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </Card>
              
              <Card variant="elevated" style={styles.statCard}>
                <Clock size={20} color="#ff9d00" />
                <Text style={styles.statNumber}>{stats.totalTime}</Text>
                <Text style={styles.statLabel}>Minutes</Text>
              </Card>
              
              <Card variant="elevated" style={styles.statCard}>
                <Star size={20} color="#ff9d00" />
                <Text style={styles.statNumber}>
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </Card>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        {sessions.length > 0 && (
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterTabs}>
                {[
                  { key: 'all', label: 'All Sessions', count: sessions.length },
                  { key: 'completed', label: 'Completed', count: sessions.filter(s => s.status === 'completed').length },
                  { key: 'active', label: 'Active', count: sessions.filter(s => s.status === 'active').length },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterTab,
                      filterStatus === filter.key && styles.filterTabActive
                    ]}
                    onPress={() => setFilterStatus(filter.key as any)}
                  >
                    <Text style={[
                      styles.filterTabText,
                      filterStatus === filter.key && styles.filterTabTextActive
                    ]}>
                      {filter.label} ({filter.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Sessions List */}
        {filteredSessions.length > 0 ? (
          <View style={styles.sessionsContainer}>
            <Text style={styles.sectionTitle}>
              {filterStatus === 'all' ? 'All Sessions' : 
               filterStatus === 'completed' ? 'Completed Sessions' : 'Active Sessions'}
            </Text>
            
            {filteredSessions.map((session) => (
              <CoachingSessionCard
                key={session.id}
                session={session}
                summary={summaries[session.id]}
                onPress={() => handleSessionPress(session)}
              />
            ))}
          </View>
        ) : sessions.length === 0 ? (
          /* Empty State */
          <Card variant="elevated" style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎯</Text>
            <Text style={styles.emptyStateTitle}>No Coaching Sessions Yet</Text>
            <Text style={styles.emptyStateText}>
              Start your first live coaching session with James to help you and your furry friend succeed together!
            </Text>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={handleStartNewSession}
            >
              <Text style={styles.startButtonText}>Start First Session</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          /* No sessions for current filter */
          <Card variant="elevated" style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateTitle}>
              No {filterStatus === 'completed' ? 'Completed' : 'Active'} Sessions
            </Text>
            <Text style={styles.emptyStateText}>
              {filterStatus === 'completed' 
                ? 'Complete a coaching session to see it here.'
                : 'You don\'t have any active sessions right now.'
              }
            </Text>
          </Card>
        )}

        {/* Coaching Tips */}
        {sessions.length > 0 && (
          <Card variant="elevated" style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Coaching Tips</Text>
            <Text style={styles.tipsText}>
              • Review your session summaries regularly to track progress{'\n'}
              • Practice the techniques James recommends between sessions{'\n'}
              • Book follow-up sessions to build on previous learnings{'\n'}
              • Share your successes with the VetPaw community
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
  },
  newSessionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#7a6f5d',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterTabActive: {
    backgroundColor: '#ff9d00',
    borderColor: '#ff9d00',
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  sessionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: '#544c3a',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#7a6f5d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#ff9d00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: '#ffffff',
  },
  tipsCard: {
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading.semiBold,
    color: '#544c3a',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#7a6f5d',
    lineHeight: 20,
  },
});
