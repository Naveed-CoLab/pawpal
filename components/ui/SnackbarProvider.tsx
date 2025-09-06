import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar } from './Snackbar';
import { NetworkErrorSnackbar } from './NetworkErrorSnackbar';
import { Linking } from 'react-native';

interface SnackbarContextType {
  showSnackbar: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info' | 'network' | 'database' | 'permission',
    actionText?: string,
    onActionPress?: () => void,
    duration?: number
  ) => void;
  showError: (message: string, actionText?: string, onActionPress?: () => void) => void;
  showSuccess: (message: string, actionText?: string, onActionPress?: () => void) => void;
  showWarning: (message: string, actionText?: string, onActionPress?: () => void) => void;
  showNetworkError: (actionText?: string, onActionPress?: () => void) => void;
  showDatabaseError: (actionText?: string, onActionPress?: () => void) => void;
  showPermissionError: (permission: string, actionText?: string, onActionPress?: () => void) => void;
  showLoginNetworkError: (onRetry?: () => void) => void;
  showSignupNetworkError: (onRetry?: () => void) => void;
  showSyncNetworkError: (onRetry?: () => void) => void;
  hideSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

interface SnackbarProviderProps {
  children: ReactNode;
}

export function SnackbarProvider({ children }: SnackbarProviderProps) {
  const [snackbar, setSnackbar] = useState({
    message: '',
    type: 'info' as const,
    isVisible: false,
    actionText: undefined as string | undefined,
    onActionPress: undefined as (() => void) | undefined,
    duration: 4000,
  });

  const [networkSnackbar, setNetworkSnackbar] = useState({
    isVisible: false,
    context: 'general' as 'login' | 'signup' | 'data-sync' | 'general',
    onRetry: undefined as (() => void) | undefined,
    title: undefined as string | undefined,
    message: undefined as string | undefined,
  });

  const showSnackbar = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' | 'network' | 'database' | 'permission' = 'info',
    actionText?: string,
    onActionPress?: () => void,
    duration: number = 4000
  ) => {
    setSnackbar({
      message,
      type,
      isVisible: true,
      actionText,
      onActionPress,
      duration,
    });
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, isVisible: false }));
    setNetworkSnackbar(prev => ({ ...prev, isVisible: false }));
  };

  const openNetworkSettings = () => {
    Linking.openSettings().catch(() => {
      // Fallback if settings can't be opened
      showSnackbar('Please check your network settings manually', 'info');
    });
  };

  // Predefined error types for common scenarios
  const showError = (message: string, actionText?: string, onActionPress?: () => void) => {
    showSnackbar(message, 'error', actionText, onActionPress);
  };

  const showSuccess = (message: string, actionText?: string, onActionPress?: () => void) => {
    showSnackbar(message, 'success', actionText, onActionPress);
  };

  const showWarning = (message: string, actionText?: string, onActionPress?: () => void) => {
    showSnackbar(message, 'warning', actionText, onActionPress);
  };

  const showNetworkError = (actionText: string = 'Retry', onActionPress?: () => void) => {
    showSnackbar(
      'Unable to connect to the internet. Please check your connection and try again.',
      'network',
      actionText,
      onActionPress
    );
  };

  const showDatabaseError = (actionText: string = 'Retry', onActionPress?: () => void) => {
    showSnackbar(
      'Unable to save your data. Please check your connection and try again.',
      'database',
      actionText,
      onActionPress
    );
  };

  const showPermissionError = (permission: string, actionText: string = 'Settings', onActionPress?: () => void) => {
    showSnackbar(
      `${permission} permission is required for this feature. Please enable it in settings.`,
      'permission',
      actionText,
      onActionPress
    );
  };

  // Specialized network error snackbars
  const showLoginNetworkError = (onRetry?: () => void) => {
    setNetworkSnackbar({
      isVisible: true,
      context: 'login',
      onRetry,
      title: undefined,
      message: undefined,
    });
  };

  const showSignupNetworkError = (onRetry?: () => void) => {
    setNetworkSnackbar({
      isVisible: true,
      context: 'signup',
      onRetry,
      title: undefined,
      message: undefined,
    });
  };

  const showSyncNetworkError = (onRetry?: () => void) => {
    setNetworkSnackbar({
      isVisible: true,
      context: 'data-sync',
      onRetry,
      title: undefined,
      message: undefined,
    });
  };

  const contextValue: SnackbarContextType = {
    showSnackbar,
    showError,
    showSuccess,
    showWarning,
    showNetworkError,
    showDatabaseError,
    showPermissionError,
    showLoginNetworkError,
    showSignupNetworkError,
    showSyncNetworkError,
    hideSnackbar,
  };

  return (
    <SnackbarContext.Provider value={contextValue}>
      {children}
      
      {/* Regular Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onHide={hideSnackbar}
        actionText={snackbar.actionText}
        onActionPress={snackbar.onActionPress}
        duration={snackbar.duration}
      />
      
      {/* Network Error Snackbar */}
      <NetworkErrorSnackbar
        isVisible={networkSnackbar.isVisible}
        onHide={hideSnackbar}
        onRetry={networkSnackbar.onRetry}
        onSettings={openNetworkSettings}
        context={networkSnackbar.context}
        title={networkSnackbar.title}
        message={networkSnackbar.message}
      />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextType {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}

// Enhanced error messages for the app
export const ErrorMessages = {
  // Pet-related errors
  PET_CREATION_FAILED: 'Failed to add your pet. Please try again.',
  PET_UPDATE_FAILED: 'Failed to update pet information. Please try again.',
  PET_DELETE_FAILED: 'Failed to remove pet. Please try again.',
  NO_PETS_FOUND: 'No pets found. Add your first pet to get started!',
  
  // Mood analysis errors
  MOOD_ANALYSIS_FAILED: 'Failed to analyze your pet\'s mood. Please try again.',
  MOOD_SAVE_FAILED: 'Mood analysis completed but couldn\'t save to history.',
  IMAGE_CAPTURE_FAILED: 'Failed to capture image. Please check camera permissions.',
  IMAGE_UPLOAD_FAILED: 'Failed to upload image. Please check your connection.',
  
  // Authentication errors
  LOGIN_FAILED: 'Login failed. Please check your credentials.',
  SIGNUP_FAILED: 'Account creation failed. Please try again.',
  LOGOUT_FAILED: 'Logout failed. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Network errors
  NETWORK_ERROR: 'Network connection lost. Please check your internet.',
  SERVER_ERROR: 'Server is temporarily unavailable. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  
  // Database errors
  DATA_SYNC_FAILED: 'Failed to sync your data. Changes may not be saved.',
  BACKUP_FAILED: 'Failed to backup your data. Please try again.',
  RESTORE_FAILED: 'Failed to restore your data. Please contact support.',
  
  // Permission errors
  CAMERA_PERMISSION: 'Camera access',
  MICROPHONE_PERMISSION: 'Microphone access', 
  STORAGE_PERMISSION: 'Storage access',
  LOCATION_PERMISSION: 'Location access',
  
  // Chat errors
  CHAT_SEND_FAILED: 'Failed to send message. Please try again.',
  CHAT_LOAD_FAILED: 'Failed to load chat history.',
  AI_RESPONSE_FAILED: 'AI is temporarily unavailable. Please try again.',
  
  // Health checker errors
  SYMPTOMS_SUBMIT_FAILED: 'Failed to submit symptoms. Please try again.',
  HEALTH_DATA_LOAD_FAILED: 'Failed to load health data.',
  
  // Coaching errors
  COACHING_SESSION_FAILED: 'Failed to start coaching session.',
  RECORDING_FAILED: 'Failed to start recording. Check microphone permissions.',

  // Network-specific errors
  LOGIN_NETWORK_ERROR: 'Unable to sign in due to network issues. Please check your connection.',
  SIGNUP_NETWORK_ERROR: 'Account creation failed due to connectivity issues.',
  SYNC_NETWORK_ERROR: 'Your data could not be synchronized. Check your internet connection.',
};

// Success messages
export const SuccessMessages = {
  PET_ADDED: 'Your pet has been added successfully! 🎉',
  PET_UPDATED: 'Pet information updated successfully!',
  MOOD_SAVED: 'Your pet\'s mood has been saved to history!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  DATA_SYNCED: 'All your data has been synced successfully!',
  BACKUP_COMPLETE: 'Data backup completed successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  LOGIN_SUCCESS: 'Welcome back to VetPaw! 🐾',
  SIGNUP_SUCCESS: 'Account created successfully! Welcome to VetPaw! 🎉',
}; 