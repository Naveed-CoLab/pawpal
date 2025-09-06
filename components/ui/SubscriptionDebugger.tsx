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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { fixExpiredSubscriptionFlag, checkSubscriptionStatus } from '@/lib/quickSubscriptionFix';
import { useSnackbar } from './SnackbarProvider';
import { 
  Settings, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Wrench,
  Database,
  Smartphone
} from 'lucide-react-native';

export function SubscriptionDebugger() {
  const { isSubscribed, isLoading, debugInfo, lastChecked, refresh, fixSubscription } = useSubscriptionStatus();
  const { showSuccess, showError, showSnackbar } = useSnackbar();
  const [detailedStatus, setDetailedStatus] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);

  const loadDetailedStatus = async () => {
    setChecking(true);
    try {
      const result = await checkSubscriptionStatus();
      setDetailedStatus(result.details);
    } catch (error) {
      console.error('Failed to load detailed status:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadDetailedStatus();
  }, []);

  const handleRefresh = () => {
    showSnackbar('Refreshing subscription status...', 'info');
    refresh();
    loadDetailedStatus();
  };

  const handleFixSubscription = async () => {
    Alert.alert(
      'Fix Subscription Status',
      'This will check for subscription mismatches and fix them. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Fix Now', 
          onPress: async () => {
            setFixing(true);
            try {
              const result = await fixExpiredSubscriptionFlag();
              
              if (result.success) {
                if (result.wasFixed) {
                  showSuccess(`${result.message}`);
                  // Refresh data after fix
                  refresh();
                  loadDetailedStatus();
                } else {
                  showSnackbar(result.message, 'info');
                }
              } else {
                showError(result.message);
              }
            } catch (error) {
              showError('Fix failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
            } finally {
              setFixing(false);
            }
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: boolean) => {
    return status ? '#4CAF50' : '#ff6b6b';
  };

  const hasMismatch = detailedStatus?.hasMismatch || false;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.header}>
        <View style={styles.headerContent}>
          <Settings size={24} color="#47463e" />
          <Text style={styles.headerTitle}>Subscription Debugger</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Current Status</Text>
            {isLoading && <ActivityIndicator size="small" color="#47463e" />}
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Subscription Active:</Text>
            <View style={styles.statusValue}>
              {isSubscribed ? (
                <CheckCircle size={20} color="#4CAF50" />
              ) : (
                <AlertTriangle size={20} color="#ff6b6b" />
              )}
              <Text style={[styles.statusText, { color: getStatusColor(isSubscribed) }]}>
                {isSubscribed ? 'YES' : 'NO'}
              </Text>
            </View>
          </View>

          {hasMismatch && (
            <View style={styles.warningBox}>
              <AlertTriangle size={20} color="#ff9800" />
              <Text style={styles.warningText}>
                Mismatch detected! Subscription is expired but premium flag is still active.
              </Text>
            </View>
          )}

          <Text style={styles.debugText}>Debug: {debugInfo}</Text>
          {lastChecked && (
            <Text style={styles.lastCheckedText}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* Detailed Status Card */}
        {detailedStatus && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Detailed Status</Text>
              {checking && <ActivityIndicator size="small" color="#47463e" />}
            </View>

            {/* Database Status */}
            <View style={styles.sectionHeader}>
              <Database size={18} color="#47463e" />
              <Text style={styles.sectionTitle}>Database Status</Text>
            </View>
            
            {detailedStatus.user && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{detailedStatus.user.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Is Premium:</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(detailedStatus.user.isPremium) }]}>
                    {detailedStatus.user.isPremium ? 'TRUE' : 'FALSE'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expires At:</Text>
                  <Text style={styles.detailValue}>{formatDate(detailedStatus.user.expiresAt)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Is Expired:</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(!detailedStatus.user.isExpired) }]}>
                    {detailedStatus.user.isExpired ? 'YES' : 'NO'}
                  </Text>
                </View>
              </View>
            )}

            {/* Subscription Record */}
            <View style={styles.sectionHeader}>
              <Info size={18} color="#47463e" />
              <Text style={styles.sectionTitle}>Subscription Record</Text>
            </View>
            
            {detailedStatus.subscription ? (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>{detailedStatus.subscription.status}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plan:</Text>
                  <Text style={styles.detailValue}>{detailedStatus.subscription.plan}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>End Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(detailedStatus.subscription.end_date)}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noDataText}>No subscription record found</Text>
            )}

            {/* RevenueCat Status */}
            <View style={styles.sectionHeader}>
              <Smartphone size={18} color="#47463e" />
              <Text style={styles.sectionTitle}>RevenueCat Status</Text>
            </View>
            
            {detailedStatus.revenueCat && !detailedStatus.revenueCat.error ? (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Active Entitlements:</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(detailedStatus.revenueCat.hasActiveEntitlements) }]}>
                    {detailedStatus.revenueCat.hasActiveEntitlements ? 'YES' : 'NO'}
                  </Text>
                </View>
                {detailedStatus.revenueCat.entitlements && detailedStatus.revenueCat.entitlements.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entitlements:</Text>
                    <Text style={styles.detailValue}>{detailedStatus.revenueCat.entitlements.join(', ')}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User ID:</Text>
                  <Text style={styles.detailValue}>{detailedStatus.revenueCat.originalAppUserId}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noDataText}>
                {detailedStatus.revenueCat?.error || 'RevenueCat not available'}
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={[styles.actionButton, styles.refreshButton]}
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={20} color="#2196F3" />
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.fixButton]}
            onPress={handleFixSubscription}
            disabled={fixing || isLoading}
          >
            {fixing ? (
              <ActivityIndicator size="small" color="#fff8e1" />
            ) : (
              <Wrench size={20} color="#fff8e1" />
            )}
            <Text style={styles.fixButtonText}>
              {fixing ? 'Fixing...' : 'Fix Subscription'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info size={20} color="#47463e" />
          <Text style={styles.infoText}>
            This tool helps diagnose and fix subscription status mismatches. 
            If your subscription shows as expired but you have an active purchase, 
            use the "Fix Subscription" button to sync your status.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8e1',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ffecb3',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#856404',
  },
  debugText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#666',
    marginTop: 8,
  },
  lastCheckedText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#666',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: '#47463e',
  },
  detailsContainer: {
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    flex: 1,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  actionsCard: {
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ffecb3',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  refreshButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  refreshButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: '#2196F3',
  },
  fixButton: {
    backgroundColor: '#ff9d00',
  },
  fixButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: '#fff8e1',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#2e7d2e',
    lineHeight: 20,
  },
}); 