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

import { Card } from '@/components/ui/Card';
import { MarkdownText } from '@/components/ui/MarkdownText';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { ApiConfig, validateGeminiApiKey } from '@/constants/apiConfig';
import { VETERINARY_SYSTEM_PROMPT } from '@/constants/prompts';
import { useAuth } from '@/hooks/useAuth';
import { useChats, useChatMessages } from '@/hooks/useDatabase';
import { Send, Mic, Paperclip, Clock } from 'lucide-react-native';
import { ChatHistoryModal } from '@/components/ui/ChatHistoryModal';
import { MediaUtils, MediaResult } from '@/lib/mediaUtils';
import { SpeechUtils, SpeechToTextResult } from '@/lib/speechUtils';
import { GeminiVisionAPI, VisionAnalysisResult } from '@/lib/geminiVisionAPI';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  media?: MediaResult;
  isAnalysis?: boolean;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { chats, createChat, updateChat, deleteChat } = useChats();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const { messages: dbMessages, createMessage } = useChatMessages(currentChatId);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Woof! Hello there! 🐕✨ I'm VetPaw AI, your adorable veterinary assistant! How can I help you and your precious furry friend today? 🐾💕",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaResult | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Initialize chat when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      if (user && chats.length === 0) {
        // Create a new chat if none exists
        const { data: newChat } = await createChat('VetPaw AI Chat 🐾');
        if (newChat) {
          setCurrentChatId(newChat.id);
        }
      } else if (chats.length > 0) {
        // Use the most recent chat
        setCurrentChatId(chats[0].id);
      }
    };

    initializeChat();
  }, [user, chats, createChat]);

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
            text: "Woof! Hello there! 🐕✨ I'm VetPaw AI, your adorable veterinary assistant! How can I help you and your precious furry friend today? 🐾💕",
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
    console.log('🤖 Chat: Starting API call to Gemini');
    
    // Check if API key is properly configured
    if (!ApiConfig.GEMINI.API_KEY || ApiConfig.GEMINI.API_KEY === '' || !validateGeminiApiKey(ApiConfig.GEMINI.API_KEY)) {
      console.log('🔄 Chat: Using fallback responses - API key not configured or invalid');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      return getFallbackResponse(message);
    }

    // If fallback is enabled, use fallback responses
    if (ApiConfig.GEMINI.USE_FALLBACK_RESPONSES) {
      console.log('🔄 Chat: Using fallback responses - API disabled');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      return getFallbackResponse(message);
    }

    try {
      console.log('📡 Chat: Making request to Gemini API...');
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${VETERINARY_SYSTEM_PROMPT}\n\nUser: ${message}\n\nVetPaw AI:`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      };

      console.log('📤 Chat: Request body prepared');

      const response = await fetch(`${ApiConfig.GEMINI.API_URL}?key=${ApiConfig.GEMINI.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Chat: Received response, status:', response.status);

      if (!response.ok) {
        // Read response as text for error logging
        const errorText = await response.text();
        console.error('❌ Chat: HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // Only parse as JSON if response is ok
      const data = await response.json();
      console.log('✅ Chat: Successfully parsed API response');
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        let apiResponse = data.candidates[0].content.parts[0].text;
        console.log('🎉 Chat: Successfully extracted response from API');
        
        // Add kawaii emojis to the response
        apiResponse = addKawaiiEmojis(apiResponse);
        
        return apiResponse;
      } else {
        console.error('❌ Chat: Invalid response structure:', data);
        throw new Error('Invalid response structure from Gemini API');
      }
    } catch (error) {
      console.error('💥 Chat: Gemini API Error:', error);
      Alert.alert('API Error', 'Failed to get a response. Please try again later.');
      console.log('🔄 Chat: Falling back to demo responses due to API error');
      return getFallbackResponse(message);
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
    const { data: newChat } = await createChat('VetPaw AI Chat 🐾');
    if (newChat) {
      setCurrentChatId(newChat.id);
      // Clear current messages to start fresh
      setMessages([
        {
          id: '1',
          text: "Woof! Hello there! 🐕✨ I'm VetPaw AI, your adorable veterinary assistant! How can I help you and your precious furry friend today? 🐾💕",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, [createChat]);

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

  // Media handling functions
  const handleMediaUpload = useCallback(async () => {
    if (isSending || isProcessingMedia) return;

    try {
      setIsProcessingMedia(true);
      const media = await MediaUtils.showMediaPicker();
      
      if (media) {
        setSelectedMedia(media);
        
        // Create a message with the media
        const mediaMessage: Message = {
          id: Date.now().toString(),
          text: `📸 ${media.type === 'image' ? 'Image' : 'Video'} uploaded for analysis`,
          isUser: true,
          timestamp: new Date(),
          media: media,
        };

        setMessages(prev => [...prev, mediaMessage]);
        
        // Save media message to database
        if (currentChatId) {
          await createMessage({
            chat_id: currentChatId,
            sender: 'user',
            message: `[MEDIA:${media.type.toUpperCase()}] ${media.name || 'media'} - ${MediaUtils.formatFileSize(media.size)}`,
          });
        }

        // Analyze the media with Gemini Vision
        setIsTyping(true);
        setIsSending(true);

        try {
          console.log('🔍 Starting media analysis...');
          const analysisResult = await GeminiVisionAPI.analyzeMedia(
            media,
            'Please analyze this image/video of my pet and provide a comprehensive health assessment.'
          );

          const analysisResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: GeminiVisionAPI.formatAnalysisForChat(analysisResult),
            isUser: false,
            timestamp: new Date(),
            isAnalysis: true,
          };

          setMessages(prev => [...prev, analysisResponse]);
          
          // Save analysis to database
          if (currentChatId) {
            await createMessage({
              chat_id: currentChatId,
              sender: 'ai',
              message: analysisResponse.text,
            });
          }
          
          console.log('✅ Media analysis completed');
        } catch (error) {
          console.error('💥 Error analyzing media:', error);
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: "I apologize, but I'm having trouble analyzing your image/video right now. 😅 For any urgent health concerns about your pet, please consult with a veterinarian directly! 🏥🐾💕",
            isUser: false,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, errorResponse]);
          
          if (currentChatId) {
            await createMessage({
              chat_id: currentChatId,
              sender: 'ai',
              message: errorResponse.text,
            });
          }
        }
      }
    } catch (error) {
      console.error('💥 Error handling media upload:', error);
      Alert.alert('Upload Error', 'Failed to upload media. Please try again.');
    } finally {
      setIsProcessingMedia(false);
      setIsTyping(false);
      setIsSending(false);
      setSelectedMedia(null);
    }
  }, [createMessage, currentChatId, isProcessingMedia, isSending]);

  // Speech-to-text functions
  const handleSpeechToText = useCallback(async () => {
    if (isSending || isListening) return;

    try {
      if (Platform.OS === 'web') {
        const success = await SpeechUtils.startSpeechToText(
          (result: SpeechToTextResult) => {
            if (result.text && !result.error) {
              setInputText(prev => prev + (prev ? ' ' : '') + result.text);
            } else if (result.error) {
              console.error('Speech recognition error:', result.error);
              Alert.alert('Speech Recognition', result.error);
            }
          },
          () => {
            setIsListening(true);
            console.log('🎤 Speech recognition started');
          },
          () => {
            setIsListening(false);
            console.log('🎤 Speech recognition ended');
          }
        );

        if (!success) {
          setIsListening(false);
        }
      } else {
        // For mobile, show a more helpful message
        Alert.alert(
          'Voice Input',
          'Voice input is coming soon! We\'re working on making this feature available in our next update.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('💥 Error starting speech recognition:', error);
      setIsListening(false);
    }
  }, [isListening, isSending]);

  const stopSpeechToText = useCallback(() => {
    SpeechUtils.stopSpeechToText();
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
              ? require('@/assets/images/login page icon.png') // User avatar
              : require('@/assets/images/onboarding1.png')    // AI vet avatar (cute dog)
          }
          style={[
            styles.avatarImage,
            item.isUser ? styles.userAvatar : styles.aiAvatar
          ]}
          resizeMode="contain"
        />
        
        {/* Message Card */}
        <Card
          variant={item.isUser ? 'default' : 'elevated'}
          style={[
            styles.messageCard,
            item.isUser ? styles.userMessageCard : styles.aiMessageCard
          ]}
        >
          {/* Media Preview */}
          {item.media && (
            <View style={styles.mediaContainer}>
              {item.media.type === 'image' ? (
                <Image
                  source={{ uri: item.media.uri }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Paperclip size={36} color={Colors.white} />
                  <Text style={styles.videoText}>Video: {item.media.name}</Text>
                  <Text style={styles.videoSize}>{MediaUtils.formatFileSize(item.media.size)}</Text>
                </View>
              )}
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
  ), []);

  const renderTypingIndicator = useCallback(() => (
    <View style={styles.typingContainer}>
      <View style={styles.messageContent}>
        <Image
          source={require('@/assets/images/onboarding1.png')}
          style={[styles.avatarImage, styles.aiAvatar]}
          resizeMode="contain"
        />
        <Card variant="elevated" style={styles.typingCard}>
          <View style={styles.typingContent}>
            <ActivityIndicator size="small" color="#ff9d00" />
            <Text style={styles.typingText}>VetPaw is thinking... 🤔💭</Text>
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
            <Text style={styles.headerTitle}>VetPaw AI Assistant 🐾</Text>
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
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
                onPress={handleMediaUpload}
                activeOpacity={0.7}
              >
                {isProcessingMedia ? (
                  <ActivityIndicator size={18} color={Colors.white} />
                ) : (
                  <Paperclip size={20} color={Colors.white} />
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
                  <Mic size={20} color={Colors.white} />
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
    color: '#544c3a',
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
    paddingBottom: 120,
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
  },
  userMessageContent: {
    justifyContent: 'flex-end',
  },
  aiMessageContent: {
    justifyContent: 'flex-start',
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  userAvatar: {
    order: 2,
  },
  aiAvatar: {
    order: 1,
  },
  messageCard: {
    flex: 1,
  },
  userMessageCard: {
    backgroundColor: '#ff9d00',
    order: 1,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopLeftRadius: 16,
  },
  aiMessageCard: {
    backgroundColor: Colors.white,
    order: 2,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopLeftRadius: 4,
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
    color: '#544c3a',
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
    marginVertical: 4,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: Platform.select({ ios: 16, android: 8 }),
    paddingTop: 8,
    backgroundColor: Colors.background,
    zIndex: 10,
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
    color: '#544c3a',
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
      height: 1,
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