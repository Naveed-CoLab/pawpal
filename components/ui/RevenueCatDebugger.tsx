import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { revenueCatErrorHandler } from '@/lib/revenueCatErrorHandler';
import Purchases from 'react-native-purchases';
import { fixSubscriptionStatus } from '@/lib/fixSubscription';

export function RevenueCatDebugger() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const testNetworkError = async () => {
    setIsProcessing(true);
    console.log('🧪 Testing NETWORK_ERROR handling...');
    
    // Simulate the exact error you're seeing
    const mockNetworkError = {
      code: 10,
      message: "Error performing request.",
      readableErrorCode: "NetworkError",
      readable_error_code: "NetworkError",
      underlyingErrorMessage: "Error updating purchases. DebugMessage: . ErrorCode: NETWORK_ERROR."
    };

    try {
      const result = await revenueCatErrorHandler.handlePurchaseError(mockNetworkError);
      setLastResult(`Network Error Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\nMessage: ${result.message}\nAction: ${result.action}`);
      console.log('🧪 Network error test result:', result);
      
      // Show the actual error handling alert
      revenueCatErrorHandler.showErrorAlert(result);
    } catch (error) {
      setLastResult(`❌ Error testing network error: ${error}`);
      console.error('🧪 Network error test failed:', error);
    }
    setIsProcessing(false);
  };

  const testAlreadyOwnedError = async () => {
    setIsProcessing(true);
    console.log('🧪 Testing ITEM_ALREADY_OWNED handling...');
    
    // Simulate the exact error you're seeing
    const mockAlreadyOwnedError = {
      code: 6,
      message: "This product is already active for the user.",
      readableErrorCode: "ProductAlreadyPurchasedError",
      readable_error_code: "ProductAlreadyPurchasedError",
      underlyingErrorMessage: "Error updating purchases. DebugMessage: . ErrorCode: ITEM_ALREADY_OWNED."
    };

    try {
      const result = await revenueCatErrorHandler.handlePurchaseError(mockAlreadyOwnedError);
      setLastResult(`Already Owned Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\nMessage: ${result.message}\nAction: ${result.action}`);
      console.log('🧪 Already owned error test result:', result);
      
      // Show the actual error handling alert
      revenueCatErrorHandler.showErrorAlert(result);
    } catch (error) {
      setLastResult(`❌ Error testing already owned error: ${error}`);
      console.error('🧪 Already owned error test failed:', error);
    }
    setIsProcessing(false);
  };

  const testCurrentStatus = async () => {
    setIsProcessing(true);
    console.log('🧪 Testing current RevenueCat status...');
    
    try {
      // Test RevenueCat connection
      const customerInfo = await Purchases.getCustomerInfo();
      const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;
      
      setLastResult(
        `RevenueCat Status:\n` +
        `• User ID: ${customerInfo.originalAppUserId}\n` +
        `• Active Entitlements: ${hasActiveEntitlements ? 'YES' : 'NO'}\n` +
        `• Entitlements: ${Object.keys(customerInfo.entitlements.active).join(', ') || 'None'}\n` +
        `• Active Subscriptions: ${customerInfo.activeSubscriptions.join(', ') || 'None'}`
      );
      
      console.log('🧪 Current RevenueCat status:', {
        userID: customerInfo.originalAppUserId,
        hasActiveEntitlements,
        entitlements: Object.keys(customerInfo.entitlements.active),
        subscriptions: customerInfo.activeSubscriptions
      });
    } catch (error) {
      setLastResult(`❌ Error checking RevenueCat status: ${error}`);
      console.error('🧪 RevenueCat status check failed:', error);
    }
    setIsProcessing(false);
  };

  const testManualRestore = async () => {
    setIsProcessing(true);
    console.log('🧪 Testing manual restore...');
    
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (hasActiveEntitlements) {
        // If restore found entitlements, sync with database
        const syncResult = await fixSubscriptionStatus();
        setLastResult(
          `Restore Success! ✅\n` +
          `• Found active entitlements\n` +
          `• Database sync: ${syncResult.success ? 'SUCCESS' : 'FAILED'}\n` +
          `• Message: ${syncResult.message}`
        );
      } else {
        setLastResult(`Restore completed - no active subscriptions found`);
      }
      
      console.log('🧪 Manual restore result:', { hasActiveEntitlements });
    } catch (error) {
      setLastResult(`❌ Manual restore failed: ${error}`);
      console.error('🧪 Manual restore failed:', error);
    }
    setIsProcessing(false);
  };

  const testSubscriptionSync = async () => {
    setIsProcessing(true);
    console.log('🧪 Testing subscription sync...');
    
    try {
      const syncResult = await fixSubscriptionStatus();
      setLastResult(
        `Subscription Sync: ${syncResult.success ? '✅ SUCCESS' : '❌ FAILED'}\n` +
        `Message: ${syncResult.message}`
      );
      console.log('🧪 Subscription sync result:', syncResult);
    } catch (error) {
      setLastResult(`❌ Subscription sync failed: ${error}`);
      console.error('🧪 Subscription sync failed:', error);
    }
    setIsProcessing(false);
  };

  const clearResults = () => {
    setLastResult('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RevenueCat Error Handler Debugger</Text>
      <Text style={styles.subtitle}>Test the error handling for your specific issues</Text>
      
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error Simulation Tests</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.networkButton]} 
            onPress={testNetworkError}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>🌐 Test NETWORK_ERROR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.ownedButton]} 
            onPress={testAlreadyOwnedError}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>🔄 Test ITEM_ALREADY_OWNED</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status & Recovery Tests</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.statusButton]} 
            onPress={testCurrentStatus}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>📊 Check Current Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.restoreButton]} 
            onPress={testManualRestore}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>🔄 Manual Restore</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.syncButton]} 
            onPress={testSubscriptionSync}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>🔧 Sync Subscription</Text>
          </TouchableOpacity>
        </View>

        {lastResult ? (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Test Results</Text>
              <TouchableOpacity onPress={clearResults} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsText}>{lastResult}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 This debugger simulates the exact errors you're seeing and shows how they're handled
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8e1',
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading.semiBold,
    color: '#47463e',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  networkButton: {
    backgroundColor: '#ff6b6b',
  },
  ownedButton: {
    backgroundColor: '#4ecdc4',
  },
  statusButton: {
    backgroundColor: '#45b7d1',
  },
  restoreButton: {
    backgroundColor: '#96ceb4',
  },
  syncButton: {
    backgroundColor: '#feca57',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: 'white',
  },
  resultsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading.semiBold,
    color: '#47463e',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff6b6b',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.semiBold,
    color: 'white',
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultsText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffecb3',
  },
  footerText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textAlign: 'center',
  },
}); 