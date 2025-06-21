import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { Card } from './Card';
import { X, Plus, Trash2, MessageCircle, CreditCard as Edit3, Check } from 'lucide-react-native';
import { Chat } from '@/lib/database';

interface ChatHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onUpdateChatTitle: (chatId: string, title: string) => void;
  onDeleteAllChats?: () => void;
}

// Memoize the ChatItem component to prevent unnecessary re-renders
const ChatItem = memo(({ 
  chat, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete,
  editingChatId,
  editTitle,
  setEditTitle,
  handleSaveTitle,
  handleCancelEdit
}: {
  chat: Chat;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  editingChatId: string | null;
  editTitle: string;
  setEditTitle: (text: string) => void;
  handleSaveTitle: () => void;
  handleCancelEdit: () => void;
}) => {
  const isEditing = editingChatId === chat.id;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.chatItem, isSelected && styles.selectedChatItem]}
      onPress={onSelect}
      activeOpacity={0.7}
      disabled={isEditing}
    >
      <Card
        variant={isSelected ? 'default' : 'elevated'}
        style={[styles.chatCard, isSelected && styles.selectedChatCard]}
      >
        <View style={styles.chatContent}>
          <View style={styles.chatIcon}>
            <MessageCircle 
              size={20} 
              color={isSelected ? Colors.white : Colors.primary} 
            />
          </View>
          
          <View style={styles.chatInfo}>
            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.editInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Chat title..."
                  placeholderTextColor={Colors.disabled}
                  autoFocus
                  multiline={false}
                  maxLength={50}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleSaveTitle}
                  >
                    <Check size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleCancelEdit}
                  >
                    <X size={16} color={Colors.disabled} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    styles.chatTitle,
                    isSelected && styles.selectedChatTitle
                  ]}
                  numberOfLines={2}
                >
                  {chat.title}
                </Text>
                <Text
                  style={[
                    styles.chatDate,
                    isSelected && styles.selectedChatDate
                  ]}
                >
                  {formatDate(chat.updated_at)}
                </Text>
              </>
            )}
          </View>

          {!isEditing && (
            <View style={styles.chatActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onEdit}
              >
                <Edit3 
                  size={16} 
                  color={isSelected ? Colors.white : Colors.disabled} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onDelete}
              >
                <Trash2
                  size={16}
                  color={isSelected ? Colors.white : Colors.error}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
});

export function ChatHistoryModal({
  visible,
  onClose,
  chats,
  currentChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onUpdateChatTitle,
  onDeleteAllChats
}: ChatHistoryModalProps) {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleDeleteChat = useCallback((chatId: string, title: string) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteChat(chatId),
        },
      ]
    );
  }, [onDeleteChat]);

  const handleDeleteAllChats = useCallback(() => {
    if (!onDeleteAllChats || chats.length === 0) return;
    
    Alert.alert(
      'Delete All Chats',
      'Are you sure you want to delete all chat history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: onDeleteAllChats,
        },
      ]
    );
  }, [onDeleteAllChats, chats.length]);

  const handleEditTitle = useCallback((chat: Chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  }, []);

  const handleSaveTitle = useCallback(() => {
    if (editingChatId && editTitle.trim()) {
      onUpdateChatTitle(editingChatId, editTitle.trim());
      setEditingChatId(null);
      setEditTitle('');
    }
  }, [editingChatId, editTitle, onUpdateChatTitle]);

  const handleCancelEdit = useCallback(() => {
    setEditingChatId(null);
    setEditTitle('');
  }, []);

  const renderChatItem = useCallback(({ item }: { item: Chat }) => (
    <ChatItem
      chat={item}
      isSelected={item.id === currentChatId}
      onSelect={() => onSelectChat(item.id)}
      onEdit={() => handleEditTitle(item)}
      onDelete={() => handleDeleteChat(item.id, item.title)}
      editingChatId={editingChatId}
      editTitle={editTitle}
      setEditTitle={setEditTitle}
      handleSaveTitle={handleSaveTitle}
      handleCancelEdit={handleCancelEdit}
    />
  ), [currentChatId, editingChatId, editTitle, handleCancelEdit, handleDeleteChat, handleEditTitle, handleSaveTitle, onSelectChat]);

  const keyExtractor = useCallback((item: Chat) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat History 💬</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.newChatContainer}>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => {
              onCreateChat();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Card variant="elevated" style={styles.newChatCard}>
              <View style={styles.newChatContent}>
                <View style={styles.newChatIcon}>
                  <Plus size={20} color={Colors.white} />
                </View>
                <Text style={styles.newChatText}>Start New Chat</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Previous Conversations</Text>
            {chats.length > 0 && onDeleteAllChats && (
              <TouchableOpacity 
                style={styles.deleteAllButton}
                onPress={handleDeleteAllChats}
              >
                <Trash2 size={16} color={Colors.error} />
                <Text style={styles.deleteAllText}>Delete All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {chats.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageCircle size={48} color={Colors.disabled} />
              <Text style={styles.emptyText}>No chat history yet</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation to see it here! 🐾
              </Text>
            </View>
          ) : (
            <FlatList
              data={chats}
              renderItem={renderChatItem}
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chatList}
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
            />
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  newChatButton: {
    marginBottom: 8,
  },
  newChatCard: {
    backgroundColor: Colors.primary,
  },
  newChatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  newChatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  newChatText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.white,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deleteAllText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: Colors.error,
    marginLeft: 4,
  },
  chatList: {
    paddingBottom: 20,
  },
  chatItem: {
    marginBottom: 12,
  },
  selectedChatItem: {
    // Additional styling for selected item if needed
  },
  chatCard: {
    backgroundColor: Colors.white,
  },
  selectedChatCard: {
    backgroundColor: Colors.primary,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  chatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffe8bc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginBottom: 4,
  },
  selectedChatTitle: {
    color: Colors.white,
  },
  chatDate: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
  },
  selectedChatDate: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chatActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  editContainer: {
    flex: 1,
  },
  editInput: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 4,
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: Colors.accent,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.body.medium,
    color: Colors.disabled,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
  },
  deleteIcon: {
    width: 16,
    height: 16,
  },
});