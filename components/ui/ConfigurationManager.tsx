import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { apiKeysService } from '@/lib/apiKeysService';
import { dynamicGoogleAuth } from '@/lib/googleAuthServiceDynamic';

interface ConfigurationManagerProps {
  visible: boolean;
  onClose: () => void;
}

interface ConfigStatus {
  [key: string]: boolean;
}

interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
  isCached: boolean;
  cacheAge: number;
}

export function ConfigurationManager({ visible, onClose }: ConfigurationManagerProps) {
  const [configStatus, setConfigStatus] = useState<ConfigStatus>({});
  const [googleConfig, setGoogleConfig] = useState<GoogleOAuthConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadConfiguration();
    }
  }, [visible]);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const [status, googleConfigInfo] = await Promise.all([
        apiKeysService.getConfigurationStatus(),
        dynamicGoogleAuth.getConfigurationInfo(),
      ]);
      
      setConfigStatus(status);
      setGoogleConfig(googleConfigInfo);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      Alert.alert('Error', 'Failed to load configuration status');
    } finally {
      setLoading(false);
    }
  };

  const refreshConfiguration = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Starting configuration refresh...');
      
      // Force refresh API keys from Supabase edge function
      const { apiKeysService } = await import('@/lib/apiKeysService');
      await apiKeysService.refreshApiKeys();
      
      // Refresh API configuration
      const { refreshApiConfig } = await import('@/constants/apiConfig');
      await refreshApiConfig();
      
      // Refresh Google auth configuration
      await dynamicGoogleAuth.refreshConfiguration();
      
      // Reload configuration status
      await loadConfiguration();
      
      Alert.alert('Success', 'Configuration refreshed successfully!\nNew API keys loaded from Supabase.');
    } catch (error) {
      console.error('Failed to refresh configuration:', error);
      Alert.alert('Error', 'Failed to refresh configuration');
    } finally {
      setRefreshing(false);
    }
  };

  const formatCacheAge = (ageMs: number): string => {
    const minutes = Math.floor(ageMs / 60000);
    const seconds = Math.floor((ageMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  const getStatusColor = (isConfigured: boolean): string => {
    return isConfigured ? Colors.success : Colors.error;
  };

  const getStatusText = (isConfigured: boolean): string => {
    return isConfigured ? 'Configured' : 'Not Configured';
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Configuration Manager</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading configuration...</Text>
            </View>
          ) : (
            <>
              {/* Service Configuration Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Service Configuration</Text>
                {Object.entries(configStatus).map(([service, isConfigured]) => (
                  <View key={service} style={styles.statusRow}>
                    <Text style={styles.serviceName}>
                      {service.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(isConfigured) }]}>
                      <Text style={styles.statusText}>{getStatusText(isConfigured)}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Google OAuth Configuration */}
              {googleConfig && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Google OAuth Configuration</Text>
                  
                  <View style={styles.configRow}>
                    <Text style={styles.configLabel}>Client ID:</Text>
                    <Text style={styles.configValue}>
                      {googleConfig.clientId === 'SET' ? '✅ Configured' : '❌ Missing'}
                    </Text>
                  </View>
                  
                  <View style={styles.configRow}>
                    <Text style={styles.configLabel}>Redirect URI:</Text>
                    <Text style={styles.configValue}>{googleConfig.redirectUri}</Text>
                  </View>
                  
                  <View style={styles.configRow}>
                    <Text style={styles.configLabel}>Cache Status:</Text>
                    <Text style={styles.configValue}>
                      {googleConfig.isCached ? '📋 Cached' : '🔄 Fresh'}
                    </Text>
                  </View>
                  
                  {googleConfig.isCached && (
                    <View style={styles.configRow}>
                      <Text style={styles.configLabel}>Cache Age:</Text>
                      <Text style={styles.configValue}>
                        {formatCacheAge(googleConfig.cacheAge)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Configuration Instructions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Setup Instructions</Text>
                <Text style={styles.instructionText}>
                  To configure missing services:
                </Text>
                <Text style={styles.instructionStep}>
                  1. Go to Supabase Dashboard → Settings → Edge Functions
                </Text>
                <Text style={styles.instructionStep}>
                  2. Add environment variables for missing services
                </Text>
                <Text style={styles.instructionStep}>
                  3. Deploy the api-keys function
                </Text>
                <Text style={styles.instructionStep}>
                  4. Refresh configuration in this screen
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.refreshButton]}
            onPress={refreshConfiguration}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Refresh Configuration</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.closeButtonLarge]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Fonts.body.semiBold,
    color: '#FFFFFF',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  configLabel: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: Colors.textSecondary,
    flex: 1,
  },
  configValue: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    flex: 2,
    textAlign: 'right',
  },
  instructionText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 13,
    fontFamily: Fonts.body.regular,
    color: Colors.textSecondary,
    marginBottom: 4,
    paddingLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: Colors.primary,
  },
  closeButtonLarge: {
    backgroundColor: Colors.border,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: '#FFFFFF',
  },
});