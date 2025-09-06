import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Card } from './Card';
import { Button } from './Button';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { transcriptService } from '@/lib/tavusTranscriptService';
import { Clock, User, Bot, Calendar, Star } from 'lucide-react-native';

interface TranscriptViewerProps {
  sessionId?: string;
  showRecent?: boolean;
}

interface CoachingSession {
  id: string;
  conversation_id: string;
  transcript: string;
  session_title: string;
  main_topic: string;
  urgency_level: 'low' | 'moderate' | 'high';
  key_points: string[];
  recommendations: string[];
  status: string;
  duration_seconds: number;
  created_at: string;
}

export function TranscriptViewer({ sessionId, showRecent = false }: TranscriptViewerProps) {
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await transcriptService.getRecentSessions(10);
      setSessions(data);
      
      if (sessionId) {
        const session = data.find(s => s.id === sessionId);
        setSelectedSession(session || null);
      } else if (data.length > 0 && showRecent) {
        setSelectedSession(data[0]);
      }
      
      console.log('📄 Loaded coaching sessions:', data.length);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load coaching sessions');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return Colors.error;
      case 'moderate': return Colors.warning;
      case 'low': return Colors.success;
      default: return Colors.primary;
    }
  };

  const parseTranscript = (transcript: string) => {
    return transcript.split('\n').filter(line => line.trim()).map(line => {
      const [speaker, ...contentParts] = line.split(': ');
      return {
        speaker: speaker.trim(),
        content: contentParts.join(': ').trim(),
        isUser: speaker.includes('USER')
      };
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading transcripts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <Card variant="elevated" style={styles.errorCard}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={loadSessions} style={styles.retryButton} />
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card variant="elevated" style={styles.emptyCard}>
        <Bot size={48} color={Colors.disabled} />
        <Text style={styles.emptyTitle}>No Coaching Sessions Yet</Text>
        <Text style={styles.emptyText}>
          Start a live coaching session with Luna to see transcripts here!
        </Text>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Session List */}
      {!selectedSession && (
        <View>
          <Text style={styles.sectionTitle}>Recent Coaching Sessions</Text>
          {sessions.map((session) => (
            <Card key={session.id} variant="elevated" style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>{session.session_title}</Text>
                  <Text style={styles.sessionTopic}>{session.main_topic}</Text>
                </View>
                <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(session.urgency_level) }]}>
                  <Text style={styles.urgencyText}>{session.urgency_level.toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.sessionMeta}>
                <View style={styles.metaItem}>
                  <Calendar size={14} color={Colors.disabled} />
                  <Text style={styles.metaText}>{formatDate(session.created_at)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={14} color={Colors.disabled} />
                  <Text style={styles.metaText}>{formatDuration(session.duration_seconds)}</Text>
                </View>
              </View>
              
              <Button
                title="View Transcript"
                onPress={() => setSelectedSession(session)}
                style={styles.viewButton}
                variant="outline"
              />
            </Card>
          ))}
        </View>
      )}

      {/* Transcript View */}
      {selectedSession && (
        <View>
          <Card variant="elevated" style={styles.transcriptHeader}>
            <View style={styles.headerRow}>
              <View style={styles.headerInfo}>
                <Text style={styles.transcriptTitle}>{selectedSession.session_title}</Text>
                <Text style={styles.transcriptMeta}>
                  {formatDate(selectedSession.created_at)} • {formatDuration(selectedSession.duration_seconds)}
                </Text>
              </View>
              {!sessionId && (
                <Button
                  title="← Back"
                  onPress={() => setSelectedSession(null)}
                  style={styles.backButton}
                  variant="outline"
                />
              )}
            </View>
            
            {/* Key Points */}
            {selectedSession.key_points && selectedSession.key_points.length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Key Points:</Text>
                {selectedSession.key_points.map((point, index) => (
                  <Text key={index} style={styles.summaryPoint}>• {point}</Text>
                ))}
              </View>
            )}
            
            {/* Recommendations */}
            {selectedSession.recommendations && selectedSession.recommendations.length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Recommendations:</Text>
                {selectedSession.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.summaryPoint}>• {rec}</Text>
                ))}
              </View>
            )}
          </Card>

          {/* Transcript Messages */}
          <Card variant="elevated" style={styles.transcriptCard}>
            <Text style={styles.transcriptSectionTitle}>Full Transcript</Text>
            <View style={styles.messagesContainer}>
              {parseTranscript(selectedSession.transcript).map((message, index) => (
                <View key={index} style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.aiMessage
                ]}>
                  <View style={styles.messageHeader}>
                    {message.isUser ? 
                      <User size={16} color={Colors.primary} /> : 
                      <Bot size={16} color={Colors.secondary} />
                    }
                    <Text style={styles.speakerName}>
                      {message.isUser ? 'You' : 'Luna'}
                    </Text>
                  </View>
                  <Text style={styles.messageContent}>{message.content}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.body.medium,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    width: 100,
  },
  emptyCard: {
    margin: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.heading.semiBold,
    fontSize: 18,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: Fonts.body.regular,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    opacity: 0.7,
  },
  sectionTitle: {
    fontFamily: Fonts.heading.semiBold,
    fontSize: 20,
    color: Colors.text,
    margin: 16,
    marginBottom: 8,
  },
  sessionCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontFamily: Fonts.body.semiBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  sessionTopic: {
    fontFamily: Fonts.body.regular,
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontFamily: Fonts.body.bold,
    fontSize: 10,
    color: Colors.white,
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: Fonts.body.regular,
    fontSize: 12,
    color: Colors.disabled,
  },
  viewButton: {
    marginTop: 8,
  },
  transcriptHeader: {
    margin: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  transcriptTitle: {
    fontFamily: Fonts.heading.semiBold,
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  transcriptMeta: {
    fontFamily: Fonts.body.regular,
    fontSize: 12,
    color: Colors.disabled,
  },
  backButton: {
    marginLeft: 16,
  },
  summarySection: {
    marginTop: 16,
  },
  summaryTitle: {
    fontFamily: Fonts.body.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  summaryPoint: {
    fontFamily: Fonts.body.regular,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  transcriptCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  transcriptSectionTitle: {
    fontFamily: Fonts.body.semiBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  messagesContainer: {
    gap: 12,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  userMessage: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary + '20',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  aiMessage: {
    backgroundColor: Colors.secondary + '20',
    borderColor: Colors.secondary + '40',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  speakerName: {
    fontFamily: Fonts.body.semiBold,
    fontSize: 12,
    color: Colors.text,
  },
  messageContent: {
    fontFamily: Fonts.body.regular,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
}); 
