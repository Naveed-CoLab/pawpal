import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { mediaAccessService, MediaPermissions } from '../../lib/mediaAccess';

interface MediaDebuggerProps {
  onClose: () => void;
}

export default function MediaDebugger({ onClose }: MediaDebuggerProps) {
  const [permissions, setPermissions] = useState<MediaPermissions | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    checkCurrentState();
  }, []);

  const checkCurrentState = async () => {
    try {
      const perms = await mediaAccessService.checkPermissions();
      setPermissions(perms);
      
      const availableDevices = await mediaAccessService.getAvailableDevices();
      setDevices(availableDevices);
      
      console.log('📋 Media permissions:', perms);
      console.log('🎛️ Available devices:', availableDevices);
    } catch (error) {
      console.error('Error checking media state:', error);
    }
  };

  const runDiagnostic = async (testName: string, testFunc: () => Promise<void>) => {
    setIsLoading(true);
    const results = [...testResults];
    
    try {
      results.push(`🔄 Running ${testName}...`);
      setTestResults([...results]);
      
      await testFunc();
      
      results.push(`✅ ${testName} completed successfully`);
    } catch (error: any) {
      results.push(`❌ ${testName} failed: ${error.message}`);
      console.error(`${testName} error:`, error);
    }
    
    setTestResults([...results]);
    setIsLoading(false);
  };

  const testBasicPermissions = async () => {
    await runDiagnostic('Basic Permissions Check', async () => {
      if (!navigator.mediaDevices) {
        throw new Error('MediaDevices API not supported');
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      
      // Test permissions API if available
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        setTestResults(prev => [...prev, 
          `📷 Camera permission: ${cameraPermission.state}`,
          `🎤 Microphone permission: ${micPermission.state}`
        ]);
      }
    });
  };

  const testAudioOnly = async () => {
    await runDiagnostic('Audio Only Access', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTracks = stream.getAudioTracks();
      
      setTestResults(prev => [...prev, 
        `🎤 Audio tracks found: ${audioTracks.length}`,
        `🎤 Audio track state: ${audioTracks[0]?.readyState || 'none'}`
      ]);
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    });
  };

  const testVideoOnly = async () => {
    await runDiagnostic('Video Only Access', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      const videoTracks = stream.getVideoTracks();
      
      setTestResults(prev => [...prev, 
        `📷 Video tracks found: ${videoTracks.length}`,
        `📷 Video track state: ${videoTracks[0]?.readyState || 'none'}`,
        `📷 Video settings: ${JSON.stringify(videoTracks[0]?.getSettings() || {})}`
      ]);
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    });
  };

  const testLowResVideo = async () => {
    await runDiagnostic('Low Resolution Video', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { exact: 320 },
          height: { exact: 240 },
          facingMode: 'user'
        } 
      });
      const videoTracks = stream.getVideoTracks();
      
      setTestResults(prev => [...prev, 
        `📷 Low-res video tracks: ${videoTracks.length}`,
        `📷 Low-res settings: ${JSON.stringify(videoTracks[0]?.getSettings() || {})}`
      ]);
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    });
  };

  const testCombinedAccess = async () => {
    await runDiagnostic('Combined Audio + Video', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: true
      });
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      setTestResults(prev => [...prev, 
        `📷 Video tracks: ${videoTracks.length}`,
        `🎤 Audio tracks: ${audioTracks.length}`,
        `🔗 Combined stream active: ${stream.active}`
      ]);
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    });
  };

  const checkBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.includes('Chrome');
    const isFirefox = userAgent.includes('Firefox');
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    const isEdge = userAgent.includes('Edge');
    
    const browserInfo = [
      `🌐 User Agent: ${userAgent}`,
      `🌐 Chrome: ${isChrome}`,
      `🌐 Firefox: ${isFirefox}`,
      `🌐 Safari: ${isSafari}`,
      `🌐 Edge: ${isEdge}`,
      `🔒 HTTPS: ${location.protocol === 'https:'}`,
      `🌐 Host: ${location.host}`
    ];
    
    setTestResults(prev => [...prev, ...browserInfo]);
  };

  const requestFullPermissions = async () => {
    await runDiagnostic('Request Full Permissions', async () => {
      const perms = await mediaAccessService.requestPermissions();
      setPermissions(perms);
      
      setTestResults(prev => [...prev, 
        `📋 Final permissions: ${JSON.stringify(perms)}`
      ]);
    });
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const copyResults = () => {
    const resultsText = testResults.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(resultsText);
      Alert.alert('Copied', 'Test results copied to clipboard');
    } else {
      Alert.alert('Results', resultsText);
    }
  };

  return (
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.9)',
      zIndex: 1000,
      padding: 20
    }}>
      <View style={{
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        padding: 20,
        flex: 1,
        marginTop: 40
      }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 20
        }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: Colors.text 
          }}>
            Media Diagnostics
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Current Status */}
        <View style={{ 
          backgroundColor: Colors.background, 
          padding: 15, 
          borderRadius: 8, 
          marginBottom: 20 
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: 'bold', 
            color: Colors.text, 
            marginBottom: 10 
          }}>
            Current Status
          </Text>
          {permissions && (
            <>
              <Text style={{ color: permissions.camera ? Colors.success : Colors.error }}>
                📷 Camera: {permissions.camera ? 'Granted' : 'Denied'}
              </Text>
              <Text style={{ color: permissions.microphone ? Colors.success : Colors.error }}>
                🎤 Microphone: {permissions.microphone ? 'Granted' : 'Denied'}
              </Text>
              <Text style={{ color: Colors.text }}>
                🎛️ Devices found: {devices.length}
              </Text>
            </>
          )}
        </View>

        {/* Test Buttons */}
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          marginBottom: 20, 
          gap: 10 
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              padding: 10,
              borderRadius: 6,
              minWidth: '45%'
            }}
            onPress={checkBrowserInfo}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Browser Info
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              padding: 10,
              borderRadius: 6,
              minWidth: '45%'
            }}
            onPress={testBasicPermissions}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Check Permissions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: Colors.secondary,
              padding: 10,
              borderRadius: 6,
              minWidth: '45%'
            }}
            onPress={testAudioOnly}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Test Audio Only
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: Colors.secondary,
              padding: 10,
              borderRadius: 6,
              minWidth: '45%'
            }}
            onPress={testVideoOnly}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Test Video Only
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: Colors.accent,
              padding: 10,
              borderRadius: 6,
              minWidth: '45%'
            }}
            onPress={testLowResVideo}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Low-Res Video
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: Colors.accent,
              padding: 10,
              borderRadius: 6,
              minWidth: '45%'
            }}
            onPress={testCombinedAccess}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Combined Test
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: Colors.error,
              padding: 10,
              borderRadius: 6,
              minWidth: '45%'
            }}
            onPress={requestFullPermissions}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Request Perms
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: Colors.textSecondary,
              padding: 10,
              borderRadius: 6,
              minWidth: '45%'
            }}
            onPress={clearResults}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Clear Results
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <View style={{ flex: 1 }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 10
          }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: Colors.text 
            }}>
              Test Results
            </Text>
            {testResults.length > 0 && (
              <TouchableOpacity onPress={copyResults}>
                <Ionicons name="copy" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView style={{
            backgroundColor: Colors.background,
            padding: 10,
            borderRadius: 6,
            flex: 1
          }}>
            {testResults.length === 0 ? (
              <Text style={{ color: Colors.textSecondary, fontStyle: 'italic' }}>
                Run tests to see results here...
              </Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={index} style={{ 
                  color: Colors.text, 
                  marginBottom: 5,
                  fontFamily: 'monospace',
                  fontSize: 12
                }}>
                  {result}
                </Text>
              ))
            )}
          </ScrollView>
        </View>

        {isLoading && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{ color: 'white', fontSize: 16 }}>Running test...</Text>
          </View>
        )}
      </View>
    </View>
  );
} 