import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card } from './Card';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { Video, Clock, Star, CircleCheck as CheckCircle } from 'lucide-react-native';

interface CoachingSessionCardProps {
  session: {
    id: string;
    primary_concern?: string;
    started_at: string;
    ended_at?: string;
    status: 'active' | 'completed' | 'cancelled';
  };
  summary?: {
    urgency_level: 'low' | 'medium' | 'high';
    primary_issue: string;
    recommendations: string[];
  };
  rating?: number;
  onPress?: () => void;
}

export function CoachingSessionCard({ 
  session, 
  summary, 
  rating, 
  onPress 
}: CoachingSessionCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'In progress...';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    
    return `${minutes} min`;
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return Colors.error;
      case 'medium': return Colors.warning;
      case 'low': return Colors.success;
      default: return Colors.primary;
    }
  };

  const getStatusIcon = () => {
    switch (session.status) {
      case 'completed':
        return <CheckCircle size={20} color={Colors.success} />;
      case 'active':
        return <Video size={20} color={Colors.primary} />;
      default:
        return <Clock size={20} color={Colors.disabled} />;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card variant="elevated" style={styles.container}>
        <View style={styles.header}>
          <View style={styles.statusContainer}>
            {getStatusIcon()}
            <Text style={styles.statusText}>
              {session.status === 'completed' ? 'Completed' : 
               session.status === 'active' ? 'Live' : 'Cancelled'}
            </Text>
          </View>
          
          {summary && (
            <View style={[
              styles.urgencyBadge,
              { backgroundColor: getUrgencyColor(summary.urgency_level) }
            ]}>
              <Text style={styles.urgencyText}>
                {summary.urgency_level.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>
            {session.primary_concern || summary?.primary_issue || 'Coaching Session'}
          </Text>
          
          <View style={styles.metadata}>
            <View style={styles.metaItem}>
              <Clock size={14} color={Colors.disabled} />
              <Text style={styles.metaText}>
                {formatDate(session.started_at)}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Video size={14} color={Colors.disabled} />
              <Text style={styles.metaText}>
                {formatDuration(session.started_at, session.ended_at)}
              </Text>
            </View>
          </View>
          
          {summary && summary.recommendations.length > 0 && (
            <View style={styles.recommendations}>
              <Text style={styles.recommendationsTitle}>Key Recommendations:</Text>
              <Text style={styles.recommendationPreview} numberOfLines={2}>
                • {summary.recommendations[0]}
                {summary.recommendations.length > 1 && ` +${summary.recommendations.length - 1} more`}
              </Text>
            </View>
          )}
          
          {rating && (
            <View style={styles.rating}>
              <Text style={styles.ratingLabel}>Your Rating:</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    color={star <= rating ? Colors.warning : Colors.disabled}
                    fill={star <= rating ? Colors.warning : 'transparent'}
                  />
                ))}
              </View>
            </View>
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: Colors.primary,
    marginLeft: 4,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.text,
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    marginLeft: 4,
  },
  recommendations: {
    marginBottom: 8,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontFamily: Fonts.body.semiBold,
    color: Colors.text,
    marginBottom: 4,
  },
  recommendationPreview: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.8,
    lineHeight: 16,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingLabel: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
});