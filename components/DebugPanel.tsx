import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { debugOnboarding } from '@/lib/debugOnboarding';
import { performanceMonitor } from '@/lib/performanceMonitor';
import { sessionManager } from '@/lib/sessionManager';
import { revenueCatDebugger } from '@/lib/revenueCatDebugger';
import { DemoEngagingLoader } from './DemoEngagingLoader';

export function DebugPanel() {
  const [showDemo, setShowDemo] = useState(false);

  const handleResetOnboarding = async () => {
    try {
      await debugOnboarding.resetOnboarding();
      Alert.alert('Success', 'Onboarding reset successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to reset onboarding');
    }
  };

  const handleCheckStatus = async () => {
    try {
      const onboardingCompleted = await debugOnboarding.checkOnboardingStatus();
      const { session } = await debugOnboarding.checkSessionStatus();
      
      Alert.alert(
        'Debug Info',
        `Onboarding completed: ${onboardingCompleted}\nSession exists: ${!!session}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to check status');
    }
  };

  const handleClearStorage = async () => {
    try {
      await debugOnboarding.clearAllStorage();
      Alert.alert('Success', 'Storage cleared successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear storage');
    }
  };

  const handleLogKeys = async () => {
    try {
      await debugOnboarding.logAllStorageKeys();
      Alert.alert('Success', 'Storage keys logged to console');
    } catch (error) {
      Alert.alert('Error', 'Failed to log storage keys');
    }
  };

  const handlePerformanceReport = () => {
    try {
      performanceMonitor.logPerformanceReport();
      Alert.alert('Success', 'Performance report logged to console');
    } catch (error) {
      Alert.alert('Error', 'Failed to log performance report');
    }
  };

  const handleClearMetrics = () => {
    try {
      performanceMonitor.clearMetrics();
      Alert.alert('Success', 'Performance metrics cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear metrics');
    }
  };

  const handleTestSessionValidation = async () => {
    try {
      const { validateSession } = await import('@/lib/auth');
      const authService = await import('@/lib/auth');
      const instance = authService.authService.getInstance();
      
      const endTimer = performanceMonitor.startTimer('Session Validation Test');
      const result = await instance.validateSession();
      endTimer();
      
      Alert.alert(
        'Session Validation Test',
        `Result: ${result}\nCheck console for timing details`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to test session validation');
    }
  };

  const handleForceClearSessions = async () => {
    try {
      await sessionManager.forceClearAllSessions();
      Alert.alert('Success', 'All session data cleared successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear session data');
    }
  };

  const handleCheckStoredSessions = async () => {
    try {
      const hasStoredData = await sessionManager.hasStoredSessionData();
      await sessionManager.logStoredSessionKeys();
      
      Alert.alert(
        'Session Data Check',
        `Has stored session data: ${hasStoredData}\nCheck console for details`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to check session data');
    }
  };

  const handleRevenueCatDebug = async () => {
    try {
      await revenueCatDebugger.logDebugInfo();
      Alert.alert('Success', 'RevenueCat debug info logged to console');
    } catch (error) {
      Alert.alert('Error', 'Failed to debug RevenueCat');
    }
  };

  const handleRevenueCatConnectivity = async () => {
    try {
      const isConnected = await revenueCatDebugger.testConnectivity();
      Alert.alert(
        'RevenueCat Connectivity',
        isConnected ? '✅ Connected successfully!' : '❌ Connection failed. Check network and API key.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to test connectivity: ${error}`);
    }
  };

  const handleRevenueCatApiKeyCheck = async () => {
    try {
      const result = await revenueCatDebugger.checkApiKeyConfiguration();
      let message = `🔑 API Key: ${result.currentKey.substring(0, 15)}...\n\n`;
      message += result.isValid ? '✅ API Key is valid\n' : '❌ API Key has issues\n\n';
      
      if (result.issues.length > 0) {
        message += '❌ Issues:\n' + result.issues.map(issue => `• ${issue}`).join('\n') + '\n\n';
      }
      
      if (result.recommendations.length > 0) {
        message += '💡 Recommendations:\n' + result.recommendations.map(rec => `• ${rec}`).join('\n');
      }
      
      Alert.alert('API Key Configuration', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', `Failed to check API key: ${error}`);
    }
  };

  const handleRevenueCatItemUnavailableDiagnosis = async () => {
    try {
      const diagnosis = await revenueCatDebugger.diagnoseItemUnavailableError();
      let message = '🔍 ITEM_UNAVAILABLE Error Diagnosis:\n\n';
      
      if (diagnosis.possibleCauses.length > 0) {
        message += '❌ Possible Causes:\n' + diagnosis.possibleCauses.map(cause => `• ${cause}`).join('\n') + '\n\n';
      }
      
      if (diagnosis.solutions.length > 0) {
        message += '🛠️ Solutions:\n' + diagnosis.solutions.map(solution => `• ${solution}`).join('\n') + '\n\n';
      }
      
      if (diagnosis.nextSteps.length > 0) {
        message += '📋 Next Steps:\n' + diagnosis.nextSteps.map(step => `• ${step}`).join('\n');
      }
      
      Alert.alert('ITEM_UNAVAILABLE Diagnosis', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', `Failed to diagnose error: ${error}`);
    }
  };

  const handleRevenueCatInitializerTest = async () => {
    try {
      const { revenueCatInitializer } = await import('@/lib/revenueCatInitializer');
      
      // Reset initializer for fresh test
      revenueCatInitializer.reset();
      
      console.log('🧪 Testing RevenueCat Initializer...');
      const result = await revenueCatInitializer.initialize();
      
      let message = '🧪 RevenueCat Initializer Test Results:\n\n';
      message += `✅ Success: ${result.success}\n`;
      message += `🌐 Mock Mode: ${result.isMockMode}\n`;
      message += `🔑 API Key: ${result.apiKeyUsed.substring(0, 15)}...\n`;
      
      if (result.error) {
        message += `❌ Error: ${result.error}\n`;
      }
      
      // Test initialization status
      const status = await revenueCatInitializer.checkInitialization();
      message += `\n📊 Status Check:\n`;
      message += `• Initialized: ${status.isInitialized}\n`;
      message += `• Mock Mode: ${status.isMockMode}\n`;
      if (status.error) {
        message += `• Error: ${status.error}\n`;
      }
      
      Alert.alert('Initializer Test Results', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', `Failed to test initializer: ${error}`);
    }
  };

  const handleRevenueCatQuickDiagnostic = async () => {
    try {
      const { RevenueCatQuickDiagnostic } = await import('@/lib/revenueCatQuickDiagnostic');
      
      console.log('🔍 Running RevenueCat Quick Diagnostic...');
      const results = await RevenueCatQuickDiagnostic.runDiagnostic();
      
      let message = '🔍 RevenueCat Quick Diagnostic Results:\n\n';
      
      if (results.length === 0) {
        message += '✅ No issues found! Configuration looks good.\n';
      } else {
        results.forEach((result, index) => {
          const severityIcon = result.severity === 'critical' ? '🚨' : result.severity === 'warning' ? '⚠️' : 'ℹ️';
          message += `${severityIcon} ${result.issue}\n`;
          message += `Solution: ${result.solution}\n`;
          message += `Steps:\n${result.nextSteps.map(step => `  ${step}`).join('\n')}\n\n`;
        });
      }
      
      Alert.alert('Quick Diagnostic Results', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', `Failed to run diagnostic: ${error}`);
    }
  };

  const handleRevenueCatKeyCheck = async () => {
    try {
      const { RevenueCatQuickDiagnostic } = await import('@/lib/revenueCatQuickDiagnostic');
      
      console.log('🔑 Checking RevenueCat Keys...');
      const keyInfo = await RevenueCatQuickDiagnostic.checkCurrentKeys();
      
      let message = '🔑 RevenueCat Key Analysis:\n\n';
      message += `📱 SDK Key: ${keyInfo.sdkKey.substring(0, 15)}...\n`;
      message += `🔐 Has Secret Key: ${keyInfo.hasSecretKey ? 'Yes' : 'No'}\n`;
      message += `💡 Needs Secret Key: ${keyInfo.needsSecretKey ? 'Yes' : 'No'}\n\n`;
      
      if (keyInfo.recommendations.length > 0) {
        message += '📋 Recommendations:\n';
        keyInfo.recommendations.forEach(rec => {
          message += `• ${rec}\n`;
        });
      }
      
      Alert.alert('Key Analysis Results', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', `Failed to check keys: ${error}`);
    }
  };

  const handleRevenueCatComprehensiveTest = async () => {
    try {
      const { RevenueCatQuickDiagnostic } = await import('@/lib/revenueCatQuickDiagnostic');
      
      console.log('🔍 Running Comprehensive ITEM_UNAVAILABLE Test...');
      const testResults = await RevenueCatQuickDiagnostic.testItemUnavailableError();
      
      let message = '🔍 Comprehensive ITEM_UNAVAILABLE Test Results:\n\n';
      
      // Show test results
      message += '📊 Test Results:\n';
      testResults.testResults.forEach(result => {
        message += `${result}\n`;
      });
      
      // Show issues if any
      if (testResults.issues.length > 0) {
        message += '\n❌ Issues Found:\n';
        testResults.issues.forEach(issue => {
          message += `• ${issue}\n`;
        });
      }
      
      // Show solutions
      if (testResults.solutions.length > 0) {
        message += '\n🛠️ Solutions:\n';
        testResults.solutions.forEach(solution => {
          message += `• ${solution}\n`;
        });
      }
      
      if (testResults.issues.length === 0) {
        message += '\n✅ No issues found! Configuration looks good.';
      }
      
      Alert.alert('Comprehensive Test Results', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', `Failed to run comprehensive test: ${error}`);
    }
  };

  const handleRevenueCatLicenseTestingTest = async () => {
    try {
      const { RevenueCatQuickDiagnostic } = await import('@/lib/revenueCatQuickDiagnostic');
      
      console.log('🔍 Testing Google Play Console License Testing...');
      const testResults = await RevenueCatQuickDiagnostic.testGooglePlayLicenseTesting();
      
      let message = '🔍 Google Play Console License Testing Results:\n\n';
      
      // Show test results
      message += '📊 Test Results:\n';
      testResults.testResults.forEach(result => {
        message += `${result}\n`;
      });
      
      // Show issues if any
      if (testResults.issues.length > 0) {
        message += '\n❌ Issues Found:\n';
        testResults.issues.forEach(issue => {
          message += `• ${issue}\n`;
        });
      }
      
      // Show solutions
      if (testResults.solutions.length > 0) {
        message += '\n🛠️ Solutions:\n';
        testResults.solutions.forEach(solution => {
          message += `• ${solution}\n`;
        });
      }
      
      // Add specific guidance for license testing
      message += '\n🎯 Specific Steps to Fix:\n';
      message += '1. Go to Google Play Console → Setup → License testing\n';
      message += '2. Add your test account email to the license testing list\n';
      message += '3. Ensure you\'re signed in with that account on your device\n';
      message += '4. Wait 15-30 minutes for changes to take effect\n';
      message += '5. Try the purchase again\n';
      
      Alert.alert('License Testing Test Results', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', `Failed to run license testing test: ${error}`);
    }
  };

  const handleShowDemo = () => {
    setShowDemo(true);
  };

  if (showDemo) {
    return <DemoEngagingLoader />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Debug Panel</Text>
      
      <Text style={styles.sectionTitle}>Onboarding & Session</Text>
      <TouchableOpacity style={styles.button} onPress={handleResetOnboarding}>
        <Text style={styles.buttonText}>Reset Onboarding</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleCheckStatus}>
        <Text style={styles.buttonText}>Check Status</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleClearStorage}>
        <Text style={styles.buttonText}>Clear Storage</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleLogKeys}>
        <Text style={styles.buttonText}>Log Storage Keys</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Session Management</Text>
      <TouchableOpacity style={styles.button} onPress={handleForceClearSessions}>
        <Text style={styles.buttonText}>Force Clear All Sessions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleCheckStoredSessions}>
        <Text style={styles.buttonText}>Check Stored Sessions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleTestSessionValidation}>
        <Text style={styles.buttonText}>Test Session Validation</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>RevenueCat</Text>
      <TouchableOpacity style={styles.button} onPress={handleRevenueCatDebug}>
        <Text style={styles.buttonText}>Debug RevenueCat Config</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRevenueCatConnectivity}>
        <Text style={styles.buttonText}>Test RevenueCat Connectivity</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRevenueCatApiKeyCheck}>
        <Text style={styles.buttonText}>Check API Key Configuration</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRevenueCatKeyCheck}>
        <Text style={styles.buttonText}>Check RevenueCat Keys</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRevenueCatItemUnavailableDiagnosis}>
        <Text style={styles.buttonText}>Diagnose ITEM_UNAVAILABLE Error</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRevenueCatComprehensiveTest}>
        <Text style={styles.buttonText}>Comprehensive ITEM_UNAVAILABLE Test</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRevenueCatLicenseTestingTest}>
        <Text style={styles.buttonText}>Test Google Play License Testing</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRevenueCatInitializerTest}>
        <Text style={styles.buttonText}>Test Unified Initializer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRevenueCatQuickDiagnostic}>
        <Text style={styles.buttonText}>Quick Diagnostic</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Performance</Text>
      <TouchableOpacity style={styles.button} onPress={handlePerformanceReport}>
        <Text style={styles.buttonText}>Performance Report</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleClearMetrics}>
        <Text style={styles.buttonText}>Clear Metrics</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>UI Components</Text>
      <TouchableOpacity style={styles.button} onPress={handleShowDemo}>
        <Text style={styles.buttonText}>Demo Engaging Loader</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 16,
    maxHeight: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
}); 