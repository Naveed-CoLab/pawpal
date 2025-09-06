import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { Notification, NotificationService } from '@/lib/notificationService';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  X, 
  Bell, 
  Trophy, 
  TrendingUp, 
  AlertTriangle, 
  Camera, 
  Video, 
  Heart, 
  Star,
  Trash2,
  CheckCheck,
  MoreVertical
} from 'lucide-react-native';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function NotificationModal({ visible, onClose }: NotificationModalProps) {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    fetchNotifications 
  } = useNotifications();
  
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Handle action
    if (notification.action_type === 'navigate' && notification.action_data) {
      onClose();
      router.push(notification.action_data as any);
    } else if (notification.action_type === 'modal') {
      // Handle modal actions (can be expanded later)
      Alert.alert('Achievement!', notification.message);
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteNotification(notificationId)
        },
      ]
    );
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      Alert.alert(
        'Mark All as Read',
        `Mark all ${unreadCount} notifications as read?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Mark All Read', 
            onPress: () => markAllAsRead()
          },
        ]
      );
    }
  };

  const toggleExpanded = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const getNotificationIcon = (type: Notification['type']) => {
    const iconProps = { size: 24, color: '#47463e' };
    
    switch (type) {
      case 'badge_awarded':
        return <Trophy {...iconProps} color="#ff9d00" />;
      case 'behavior_trend':
        return <TrendingUp {...iconProps} color="#4CAF50" />;
      case 'health_alert':
        return <AlertTriangle {...iconProps} color="#ff6b6b" />;
      case 'mood_reminder':
        return <Camera {...iconProps} color="#2196F3" />;
      case 'coaching_available':
        return <Video {...iconProps} color="#9C27B0" />;
      case 'welcome':
        return <Heart {...iconProps} color="#E91E63" />;
      case 'achievement':
        return <Star {...iconProps} color="#ff9d00" />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = (notification: Notification) => {
    const isExpanded = expandedNotifications.has(notification.id);
    const isUnread = !notification.is_read;

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationItem,
          isUnread && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.notificationContainer,
            { backgroundColor: isUnread ? '#fff8e1' : '#f8f8f8' }
          ]}
        >
          <View style={styles.notificationContent}>
            {/* Icon and Priority Indicator */}
            <View style={styles.iconSection}>
              <View style={[
                styles.iconContainer,
                { borderColor: NotificationService.getPriorityColor(notification.priority) }
              ]}>
                {getNotificationIcon(notification.type)}
              </View>
              {isUnread && <View style={styles.unreadDot} />}
            </View>

            {/* Content Section */}
            <View style={styles.contentSection}>
              <View style={styles.headerRow}>
                <Text style={[styles.title, isUnread && styles.unreadTitle]}>
                  {notification.title}
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => toggleExpanded(notification.id)}
                    style={styles.actionButton}
                  >
                    <MoreVertical size={16} color="#47463e" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text 
                style={styles.message}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {notification.message}
              </Text>

              <View style={styles.metaRow}>
                <Text style={styles.timeStamp}>
                  {formatTimeAgo(notification.created_at)}
                </Text>
                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: NotificationService.getPriorityColor(notification.priority) }
                ]}>
                  <Text style={styles.priorityText}>
                    {notification.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Expanded Actions */}
              {isExpanded && (
                <View style={styles.expandedActions}>
                  {isUnread && (
                    <TouchableOpacity
                      onPress={() => markAsRead(notification.id)}
                      style={[styles.expandedActionButton, styles.markReadButton]}
                    >
                      <CheckCheck size={16} color="#4CAF50" />
                      <Text style={styles.markReadButtonText}>Mark as Read</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteNotification(notification.id)}
                    style={[styles.expandedActionButton, styles.deleteButton]}
                  >
                    <Trash2 size={16} color="#ff6b6b" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Bell size={24} color="#47463e" />
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#47463e" />
            </TouchableOpacity>
          </View>

          {/* Action Bar */}
          {notifications.length > 0 && (
            <View style={styles.actionBar}>
              <TouchableOpacity
                onPress={handleMarkAllRead}
                style={[
                  styles.actionBarButton,
                  unreadCount === 0 && styles.disabledButton
                ]}
                disabled={unreadCount === 0}
              >
                <CheckCheck size={18} color={unreadCount > 0 ? "#4CAF50" : "#a0a0a0"} />
                <Text style={[
                  styles.actionBarButtonText,
                  unreadCount === 0 && styles.disabledButtonText
                ]}>
                  Mark All Read
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={fetchNotifications}
                style={styles.actionBarButton}
              >
                <Text style={styles.actionBarButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={60} color="#cccccc" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              You're all caught up! Check back later for updates about your pets.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notificationsContent}
          >
            {notifications.map(renderNotificationItem)}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: '#fff8e1',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
  },
  headerBadge: {
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    color: '#fff8e1',
    fontSize: 8,
    fontFamily: Fonts.body.bold,
    lineHeight: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffecb3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffecb3',
    gap: 6,
  },
  actionBarButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
  },
  disabledButtonText: {
    color: '#a0a0a0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textAlign: 'center',
    lineHeight: 24,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    padding: 16,
    paddingBottom: 100,
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadNotification: {
    shadowOpacity: 0.15,
    elevation: 4,
  },
  notificationContainer: {
    padding: 16,
  },
  notificationContent: {
    flexDirection: 'row',
    gap: 12,
  },
  iconSection: {
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff8e1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff6b6b',
    borderWidth: 2,
    borderColor: '#fff8e1',
  },
  contentSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: '#47463e',
    flex: 1,
  },
  unreadTitle: {
    color: '#47463e',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeStamp: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#666',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: '#fff8e1',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  expandedActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  markReadButton: {
    backgroundColor: '#e8f5e8',
  },
  markReadButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  deleteButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#ff6b6b',
  },
}); 