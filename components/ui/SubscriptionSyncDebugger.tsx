import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { fixExpiredSubscriptionFlag } from '@/lib/quickSubscriptionFix';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

export function SubscriptionSyncDebugger() {
  const { isSubscribed, debugInfo, lastChecked, refresh, forceRefresh } = useSubscriptionStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await fixExpiredSubscriptionFlag();
      Alert.alert('Sync Result', result.message);
      forceRefresh();
    } catch (error) {
      Alert.alert('Sync Error', error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceRefresh = () => {
    forceRefresh();
    Alert.alert('Refresh', 'Subscription status refreshed!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscription Status</Text>
      <Text style={styles.status}>Status: {isSubscribed ? 'PREMIUM ✅' : 'FREE ❌'}</Text>
      <Text style={styles.debug}>{debugInfo}</Text>
      <Text style={styles.lastChecked}>
        Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={handleForceRefresh}>
        <Text style={styles.buttonText}>Force Refresh</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.syncButton]} 
        onPress={handleManualSync}
        disabled={isSyncing}
      >
        <Text style={styles.buttonText}>
          {isSyncing ? 'Syncing...' : 'Manual Sync'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff4bb',
    borderRadius: 12,
    margin: 10,
    borderWidth: 1,
    borderColor: '#f5d982',
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    marginBottom: 5,
  },
  debug: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#666',
    marginBottom: 5,
  },
  lastChecked: {
    fontSize: 10,
    fontFamily: Fonts.body.regular,
    color: '#999',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#ff9d00',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  syncButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontFamily: Fonts.body.bold,
  },
});