import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card } from '@/components/ui/Card';
import { MarkdownText } from '@/components/ui/MarkdownText';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { VETERINARY_SYSTEM_PROMPT } from '@/constants/prompts';
import { useAuth } from '@/hooks/useAuth';
import { useChats, useChatMessages } from '@/hooks/useDatabase';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { Send, Mic, Paperclip, Clock } from 'lucide-react-native';
import { ChatHistoryModal } from '@/components/ui/ChatHistoryModal';
import { OnboardingAvatar } from '@/components/ui/OnboardingAvatar';
// Removed SpeechUtils import since voice is under maintenance
import { GeminiVisionAPI, VisionAnalysisResult } from '@/lib/geminiVisionAPI';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  document?: DocumentPicker.DocumentPickerAsset;
  isAnalysis?: boolean;
}

// Badge checking functionality
const checkChatBadges = async (userId: string, showSnackbar: (message: string, type?: string) => void) => {
  try {
    // Count user's chats
    const { data: chats, error } = await supabase
      .from('chats')
      .select('id')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error counting chats for badges:', error);
      return;
    }

    const chatCount = chats?.length || 0;
    console.log(`🏅 User has ${chatCount} chats, checking for badges...`);

    // Award badges based on milestones
    if (chatCount === 1) {
      console.log('🎉 First chat badge earned!');
      showSnackbar('🏅 Badge Earned: First Conversation! Welcome to the PawPal family! (+10 points)', 'success');
    } else if (chatCount === 5) {
      console.log('🎉 Chat enthusiast badge earned!');
      showSnackbar('🏅 Badge Earned: Chat Enthusiast! You\'re getting the hang of it! (+25 points)', 'success');
    } else if (chatCount === 10) {
      console.log('🎉 Chat master badge earned!');
      showSnackbar('🏅 Badge Earned: Chat Master! You\'re a PawPal AI conversation pro! (+50 points)', 'success');
    }
  } catch (error) {
    console.error('❌ Error checking chat badges:', error);
  }
};

// Simple Gemini API key validation
const validateGeminiApiKey = (apiKey: string): boolean => {
  return apiKey.startsWith('AIza') && apiKey.length === 39;
};

export default function ChatScreen() {
  const { user, isLoading } = useAuth();
  const { chats, createChat, updateChat, deleteChat } = useChats();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const { messages: dbMessages, createMessage } = useChatMessages(currentChatId);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const { showError, showSuccess, showWarning } = useSnackbar();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Woof! Hello there! 🐕✨ I'm PawPal AI, your adorable veterinary assistant! How can I help you and your precious furry friend today? 🐾💕",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Initialize chat when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      if (user && chats.length === 0) {
        // Create a new chat if none exists
        const { data: newChat } = await createChat('PawPal AI Chat 🐾');
        if (newChat) {
          setCurrentChatId(newChat.id);
          // Check for first chat badge
          if (user.id) {
            await checkChatBadges(user.id, showSuccess);
          }
        }
      } else if (chats.length > 0) {
        // Check if there's a pending chat ID from history navigation
        try {
          const pendingChatId = await AsyncStorage.getItem('pendingChatId');
          if (pendingChatId && chats.find(chat => chat.id === pendingChatId)) {
            console.log('📱 Found pending chat ID, switching to:', pendingChatId);
            setCurrentChatId(pendingChatId);
            // Clear the pending chat ID
            await AsyncStorage.removeItem('pendingChatId');
          } else {
            // Use the most recent chat
            setCurrentChatId(chats[0].id);
          }
        } catch (error) {
          console.error('Error checking pending chat ID:', error);
          // Use the most recent chat as fallback
          setCurrentChatId(chats[0].id);
        }
      }
    };

    initializeChat();
  }, [user, chats, createChat, showSuccess]);

  // Convert database messages to UI messages
  useEffect(() => {
    if (dbMessages.length > 0) {
      const convertedMessages = dbMessages.map(msg => ({
        id: msg.id,
        text: msg.message,
        isUser: msg.sender === 'user',
        timestamp: new Date(msg.created_at),
      }));

      // Add welcome message if it's the first time
      if (convertedMessages.length === 0) {
        setMessages([
          {
            id: '1',
            text: "Woof! Hello there! 🐕✨ I'm PawPal AI, your adorable veterinary assistant! How can I help you and your precious furry friend today? 🐾💕",
            isUser: false,
            timestamp: new Date(),
          },
          ...convertedMessages
        ]);
      } else {
        setMessages(convertedMessages);
      }
    }
  }, [dbMessages]);

  const callGeminiAPI = useCallback(async (message: string): Promise<string> => {
    console.log('🤖 Chat: Starting API call to edge function');

    try {
      // Get current user session for authentication
      const { supabase: supaClient } = await import('@/lib/supabase');
      const { data: { session }, error: sessionError } = await supaClient.auth.getSession();
      
      console.log('🔐 Chat: Session debug info:');
      console.log('- Session error:', sessionError);
      console.log('- Has session:', !!session);
      console.log('- User ID:', session?.user?.id);
      console.log('- User email:', session?.user?.email);
      console.log('- Token expires at:', session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown');
      console.log('- Token preview:', session?.access_token?.substring(0, 30) + '...');
      console.log('- Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      
      if (sessionError || !session) {
        console.log('🔄 Chat: No active session, using fallback responses');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
        return getFallbackResponse(message);
      }

      console.log('📡 Chat: Making request to dynamic-worker edge function...');
      console.log('🔑 Full auth header being sent:', `Bearer ${session.access_token}`);
      console.log('📦 Request body:', JSON.stringify({ message: message, userId: session.user.id }));

      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
      const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
      const fnUrl = `${baseUrl.replace(/\/$/, '')}/functions/v1/dynamic-worker`;

      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...(anonKey ? { apikey: anonKey } : {}),
        },
        body: JSON.stringify({ message, userId: session.user.id }),
      });

      const raw = await resp.text();
      if (!resp.ok) {
        console.error('❌ Edge function non-2xx:', resp.status, raw);
        throw new Error(`Edge function ${resp.status}`);
      }
      let data: any = null;
      try { data = JSON.parse(raw); } catch { data = { success: false }; }

      if (!data) {
        throw new Error('No data');
      }
      console.log('✅ Chat: Successfully parsed API response');

      if (data.success && data.response) {
        let apiResponse = data.response;
        console.log('🎉 Chat: Successfully extracted response from edge function');
        
        if (data.fallback) {
          console.log('🔄 Chat: Response generated using fallback');
        }

        // Add kawaii emojis to the response
        apiResponse = addKawaiiEmojis(apiResponse);

        return apiResponse;
      } else {
        console.error('❌ Chat: Invalid response structure from edge function:', data);
        throw new Error('Invalid response structure from edge function');
      }
    } catch (error) {
      console.error('💥 Chat: Gemini API Error:', error);
      const busyMsg = "Sorry, Lumi is busy at the moment or feeling a bit sick. Please try again later. \\shutdown";
      console.log('🔄 Chat: Falling back with busy message');
      return busyMsg;
    }
  }, []);

  const addKawaiiEmojis = (text: string): string => {
    // Add cute pet-related emojis to responses
    const emojiMap: { [key: string]: string } = {
      'feeding': '🍽️🐕',
      'food': '🥘🐾',
      'sick': '🏥🩺',
      'health': '💊🐕‍🦺',
      'training': '🎾🏆',
      'exercise': '🏃‍♂️🐕',
      'play': '🎯🧸',
      'vet': '👩‍⚕️🏥',
      'puppy': '🐶💕',
      'dog': '🐕✨',
      'care': '💝🐾',
      'love': '💖🐕',
      'happy': '😊🎉',
      'good': '👍🌟',
      'great': '🎊🐾',
      'water': '💧🥤',
      'walk': '🚶‍♂️🐕',
      'safe': '🛡️💕',
      'help': '🤝🐾'
    };

    let enhancedText = text;

    // Add emojis based on keywords
    Object.entries(emojiMap).forEach(([keyword, emoji]) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(enhancedText)) {
        enhancedText = enhancedText.replace(regex, `${keyword} ${emoji}`);
      }
    });

    // Add a cute ending emoji if none exists
    if (!enhancedText.match(/[🐕🐶🐾🏥💕✨🎾💊🍽️]/)) {
      enhancedText += ' 🐾💕';
    }

    return enhancedText;
  };

  const getFallbackResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes('feeding') || input.includes('food')) {
      return "For feeding 🍽️🐕, adult dogs typically need 2 meals per day! The amount depends on your pup's size, age, and activity level ⚡. Always use high-quality dog food 🥘 and avoid human foods that can be toxic like chocolate 🍫❌, grapes 🍇❌, and onions 🧅❌. Keep your furry friend healthy and happy! 🐾💕";
    }

    if (input.includes('sick') || input.includes('vomit') || input.includes('diarrhea')) {
      return "Oh no! 😟 If your precious pup 🐶 is showing signs of illness like vomiting 🤢 or diarrhea 💩, monitor them closely 👀. Withhold food for 12-24 hours but ensure they have fresh water 💧. If symptoms persist for more than 24 hours or you notice blood 🩸, lethargy 😴, or severe dehydration, please contact your veterinarian immediately! 🏥🚨 Your pup's health is precious! 💕";
    }

    if (input.includes('training') || input.includes('behavior')) {
      return "Training time! 🎾✨ Positive reinforcement is the most effective method! Use treats 🦴, praise 👏, and consistency 📅. Start with basic commands like 'sit' 🪑, 'stay' ✋, and 'come' 🏃‍♂️. Keep training sessions short (5-10 minutes) ⏰ and always end on a positive note! 🎉 Remember, patience is key! Your pup is learning! 🐕📚💕";
    }

    if (input.includes('puppy') || input.includes('baby')) {
      return "Aww, a puppy! 🐶💕 Puppies are so precious and need extra special care! 👶🐾 Make sure they get proper vaccinations 💉, lots of love 💖, gentle training 🎓, and appropriate puppy food 🍼. Socialization is super important too! 👥🐕 Your little fur baby will grow up to be amazing! ✨🌟";
    }

    return "That's such a wonderful question! 🤔💭 For specific health concerns, I recommend consulting with your local veterinarian 👩‍⚕️🏥. In the meantime, ensure your precious pup has fresh water 💧, a comfortable environment 🏠, and regular exercise 🏃‍♂️🐕! Is there anything specific about your furry friend's behavior or health you'd like to discuss? I'm here to help! 🐾💕✨";
  };

  // Chat management functions
  const handleCreateNewChat = useCallback(async () => {
    const { data: newChat } = await createChat('PawPal AI Chat 🐾');
    if (newChat) {
      setCurrentChatId(newChat.id);
      // Check for chat milestone badges
      if (user?.id) {
        await checkChatBadges(user.id, showSuccess);
      }
      // Clear current messages to start fresh
      setMessages([
        {
          id: '1',
          text: "Woof! Hello there! 🐕✨ I'm PawPal AI, your adorable veterinary assistant! How can I help you and your precious furry friend today? 🐾💕",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, [createChat, user?.id, showSuccess]);

  const handleSelectChat = useCallback((chatId: string) => {
    console.log(`🔄 Switching to chat: ${chatId}`);
    setCurrentChatId(chatId);
    setShowHistoryModal(false);

    // Clear current messages - they will be reloaded from the database
    setMessages([]);
  }, []);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      console.log(`🗑️ Deleting chat: ${chatId}`);

      // Delete the chat and all its messages from the database
      const { error } = await deleteChat(chatId);

      if (error) {
        console.error('❌ Failed to delete chat:', error);
        Alert.alert(
          'Delete Failed',
          'Failed to delete the chat. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ Chat deleted successfully');

      // If we deleted the current chat, switch to another one or create new
      if (chatId === currentChatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        if (remainingChats.length > 0) {
          console.log('🔄 Switching to another existing chat');
          setCurrentChatId(remainingChats[0].id);
        } else {
          console.log('➕ No chats left, creating a new one');
          // No chats left, create a new one
          await handleCreateNewChat();
        }
      }

      // Close the modal after successful deletion
      setShowHistoryModal(false);

    } catch (error) {
      console.error('💥 Error in handleDeleteChat:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while deleting the chat.',
        [{ text: 'OK' }]
      );
    }
  }, [chats, currentChatId, deleteChat, handleCreateNewChat]);

  const handleDeleteAllChats = useCallback(async () => {
    try {
      console.log('🗑️ Deleting all chats');

      // Confirm with the user
      Alert.alert(
        'Delete All Chats',
        'Are you sure you want to delete all chat history? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: async () => {
              // Show loading indicator
              setIsTyping(true);

              // Delete each chat one by one
              for (const chat of chats) {
                const { error } = await deleteChat(chat.id);
                if (error) {
                  console.error(`❌ Failed to delete chat ${chat.id}:`, error);
                  Alert.alert(
                    'Delete Failed',
                    'Failed to delete all chats. Please try again.',
                    [{ text: 'OK' }]
                  );
                  setIsTyping(false);
                  return;
                }
              }

              // Create a new chat
              await handleCreateNewChat();

              // Hide loading indicator
              setIsTyping(false);

              // Close the modal
              setShowHistoryModal(false);

              // Show success message
              Alert.alert(
                'Success',
                'All chat history has been deleted.',
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('💥 Error in handleDeleteAllChats:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while deleting chats.',
        [{ text: 'OK' }]
      );
      setIsTyping(false);
    }
  }, [chats, deleteChat, handleCreateNewChat]);

  const handleUpdateChatTitle = useCallback(async (chatId: string, title: string) => {
    await updateChat(chatId, { title });
  }, [updateChat]);

  // Document handling functions
  const handleDocumentUpload = useCallback(async () => {
    if (isSending || isProcessingMedia) return;

    try {
      setIsProcessingMedia(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const document = result.assets[0];

        // Create a message with the document
        const documentMessage: Message = {
          id: Date.now().toString(),
          text: `📄 Document uploaded: ${document.name}`,
          isUser: true,
          timestamp: new Date(),
          document: document,
        };

        setMessages(prev => [...prev, documentMessage]);

        // Save document message to database
        if (currentChatId) {
          await createMessage({
            chat_id: currentChatId,
            sender: 'user',
            message: `[DOCUMENT] ${document.name} - ${document.size ? (document.size / 1024 / 1024).toFixed(2) : '0'}MB`,
          });
        }

        // Provide helpful response about the document
        setIsTyping(true);

        const docResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: `Thank you for sharing the document "${document.name}"! 📄✨ I can see you've uploaded a ${document.mimeType || 'file'} document. While I can't directly read document contents yet, I'm here to help answer any questions you have about your pet's health based on the information you share with me! 🐾💕 

Feel free to tell me what's in the document or ask any specific questions about your furry friend! 🐕`,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, docResponse]);

        // Save response to database
        if (currentChatId) {
          await createMessage({
            chat_id: currentChatId,
            sender: 'ai',
            message: docResponse.text,
          });
        }
      }
    } catch (error) {
      console.error('💥 Error handling document upload:', error);
      Alert.alert('Upload Error', 'Failed to upload document. Please try again.');
    } finally {
      setIsProcessingMedia(false);
      setIsTyping(false);
    }
  }, [createMessage, currentChatId, isProcessingMedia, isSending]);

  // Speech-to-text functions
  const handleSpeechToText = useCallback(async () => {
    if (isSending || isListening) return;
    showWarning('Voice input is under maintenance. Please type your message for now.');
    return;
  }, [isListening, isSending, showWarning]);

  const stopSpeechToText = useCallback(async () => {
    setIsListening(false);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !currentChatId || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);

    // Save user message to database
    await createMessage({
      chat_id: currentChatId,
      sender: 'user',
      message: inputText.trim(),
    });

    const currentInput = inputText.trim();
    setInputText('');
    setIsSending(true);
    setIsTyping(true);

    try {
      console.log('🚀 Chat: Starting message send process');
      const aiResponseText = await callGeminiAPI(currentInput);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        isUser: false,
        timestamp: new Date(),
      };

      // Add AI response to UI
      setMessages(prev => [...prev, aiResponse]);

      // Save AI response to database
      await createMessage({
        chat_id: currentChatId,
        sender: 'ai',
        message: aiResponseText,
      });

      console.log('✅ Chat: Message send process completed successfully');
    } catch (error) {
      console.error('💥 Chat: Error in send message process:', error);
      const fallbackResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Oops! 😅 I'm having trouble connecting right now. Please try again in a moment! 🔄 For urgent concerns, contact your veterinarian directly 🏥📞. Your pup's health comes first! 🐾💕",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, fallbackResponse]);

      // Save fallback response to database
      if (currentChatId) {
        await createMessage({
          chat_id: currentChatId,
          sender: 'ai',
          message: fallbackResponse.text,
        });
      }
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  }, [callGeminiAPI, createMessage, currentChatId, inputText, isSending]);

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessageContainer : styles.aiMessageContainer
    ]}>
      <View style={[
        styles.messageContent,
        item.isUser ? styles.userMessageContent : styles.aiMessageContent
      ]}>
        {/* Avatar Image */}
        <Image
          source={
            item.isUser
              ? (user?.avatar_url
                ? { uri: user.avatar_url }
                : require('@/assets/images/login page icon.png')
              )
              : require('@/assets/images/lumi.png')    // AI vet avatar (cute dog)
          }
          style={[
            styles.avatarImage,
            item.isUser ? styles.userAvatar : styles.aiAvatar
          ]}
          resizeMode="cover"
        />

        {/* Message Card */}
        <Card
          variant={item.isUser ? 'default' : 'elevated'}
          style={{
            ...styles.messageCard,
            ...(item.isUser ? styles.userMessageCard : styles.aiMessageCard)
          }}
        >
          {/* Document Preview */}
          {item.document && (
            <View style={styles.documentContainer}>
              <View style={styles.documentInfo}>
                <Paperclip size={24} color="#ff9d00" />
                <View style={styles.documentDetails}>
                  <Text style={styles.documentName} numberOfLines={2}>
                    {item.document.name}
                  </Text>
                  <Text style={styles.documentSize}>
                    {item.document.size ? (item.document.size / 1024 / 1024).toFixed(2) : '0'} MB
                  </Text>
                </View>
              </View>
            </View>
          )}

          {item.isUser ? (
            <Text style={[
              styles.messageText,
              styles.userMessageText
            ]}>
              {item.text}
            </Text>
          ) : (
            <MarkdownText>
              {item.text}
            </MarkdownText>
          )}
          <Text style={[
            styles.messageTime,
            item.isUser ? styles.userMessageTime : styles.aiMessageTime
          ]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Card>
      </View>
    </View>
  ), [user?.avatar_url]);

  const renderTypingIndicator = useCallback(() => (
    <View style={styles.typingContainer}>
      <View style={styles.messageContent}>
        <Image
          source={require('@/assets/images/lumi.png')}
          style={[styles.avatarImage, styles.aiAvatar]}
          resizeMode="cover"
        />
        <Card variant="elevated" style={styles.typingCard}>
          <View style={styles.typingContent}>
            <ActivityIndicator size="small" color="#ff9d00" />
            <Text style={styles.typingText}>Lumi is thinking... 🤔💭</Text>
          </View>
        </Card>
      </View>
    </View>
  ), []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>PawPal AI Assistant 🐾</Text>
            <Text style={styles.headerSubtitle}>Your caring veterinary companion ✨💕</Text>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistoryModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.historyIconContainer}>
              <Clock size={20} color="#ff9d00" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 80}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isTyping ? renderTypingIndicator : null}
          onLayout={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
        />

        <View style={styles.inputContainer}>
          <View style={styles.inputCard}>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (isSending || isProcessingMedia) && styles.actionButtonDisabled
                ]}
                disabled={isSending || isProcessingMedia}
                onPress={handleDocumentUpload}
                activeOpacity={0.7}
              >
                {isProcessingMedia ? (
                  <ActivityIndicator size={18} color={Colors.white} />
                ) : (
                  <Image
                    source={require('@/assets/images/clip.png')} // Replace with your actual image path
                    style={{ width: 30, height: 30 }}

                  />
                )}

              </TouchableOpacity>

              <TextInput
                style={[styles.textInput, isSending && styles.textInputDisabled]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about your pet's health... 🐾"
                placeholderTextColor={Colors.disabled}
                multiline
                maxLength={500}
                editable={!isSending}
              />

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isListening && styles.actionButtonActive,
                  isSending && styles.actionButtonDisabled
                ]}
                disabled={isSending}
                onPress={isListening ? stopSpeechToText : handleSpeechToText}
                activeOpacity={0.7}
              >
                {isListening ? (
                  <View style={styles.micListening}>
                    <ActivityIndicator size={14} color={Colors.white} />
                  </View>
                ) : (
                  <Image
                    source={require('@/assets/images/microphone-icon.png')} // replace with your actual path 
                    style={{ width: 30, height: 30 }}

                  />
                )}

              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  inputText.trim() && !isSending ? styles.sendButtonActive : styles.sendButtonInactive
                ]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size={18} color={Colors.white} />
                ) : (
                  <Send size={18} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Chat History Modal */}
      <ChatHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onCreateChat={handleCreateNewChat}
        onDeleteChat={handleDeleteChat}
        onUpdateChatTitle={handleUpdateChatTitle}
        onDeleteAllChats={handleDeleteAllChats}
      />
      
      {/* Onboarding Avatar for First-Time Users */}
      <OnboardingAvatar 
        currentScreen="chat"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: Colors.background,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  historyButton: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -16 }],
  },
  historyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffe8bc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 5,
    paddingBottom: 20,
    paddingTop: 8,
  },
  messageContainer: {
    marginVertical: 4,
    width: '100%',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
    paddingLeft: '10%',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
    paddingRight: '5%',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    maxWidth: '95%',
  },
  userMessageContent: {
    flexDirection: 'row-reverse', // Avatar on right for user
    justifyContent: 'flex-start',
  },
  aiMessageContent: {
    flexDirection: 'row', // Avatar on left for AI
    justifyContent: 'flex-start',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userAvatar: {
    // Avatar styling for user (no additional properties needed)
  },
  aiAvatar: {
    // Avatar styling for AI (no additional properties needed)
  },
  messageCard: {
    flex: 1,
    maxWidth: '100%',
  },
  userMessageCard: {
    backgroundColor: '#ff9d00',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopLeftRadius: 16,
    marginRight: 4, // Space between avatar and message
  },
  aiMessageCard: {
    backgroundColor: Colors.white,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 16,
    marginLeft: 4, // Space between avatar and message
  },
  messageText: {
    fontSize: 11,
    fontFamily: Fonts.body.regular,
    lineHeight: 18,
    marginBottom: 4,
  },
  userMessageText: {
    color: Colors.white,
  },
  aiMessageText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 9,
    fontFamily: Fonts.body.regular,
  },
  userMessageTime: {
    color: Colors.white,
    opacity: 0.7,
    textAlign: 'right',
  },
  aiMessageTime: {
    color: Colors.disabled,
    textAlign: 'right',
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginVertical: 2,
    width: '100%',
    paddingRight: '15%',
  },
  typingCard: {
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopLeftRadius: 4,
  },
  typingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 11,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    marginLeft: 6,
  },
  inputContainer: {
    paddingHorizontal: 5,
    paddingBottom: Platform.select({ ios: 10, android: 5 }), // Account for tab bar + safe area
    paddingTop: 8,
    backgroundColor: Colors.background,
  },
  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: Colors.text,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    marginHorizontal: 6,
    maxHeight: 70,
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  textInputDisabled: {
    opacity: 0.6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  actionButtonActive: {
    backgroundColor: '#ff9d00',
    transform: [{ scale: 1.05 }],
  },
  micListening: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentContainer: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentDetails: {
    flex: 1,
    marginLeft: 10,
  },
  documentName: {
    fontSize: 13,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 11,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
  },
  mediaContainer: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 12,
  },
  videoText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    marginTop: 6,
    textAlign: 'center',
  },
  videoSize: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: Fonts.body.regular,
    marginTop: 2,
    opacity: 0.8,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
    backgroundColor: '#ff9d00',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  sendButtonActive: {
    backgroundColor: '#ff9d00',
    transform: [{ scale: 1.05 }],
  },
  sendButtonInactive: {
    backgroundColor: Colors.disabled,
    shadowOpacity: 0,
  },
});