import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { EngagingLoader } from '@/components/ui/EngagingLoader';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

export function DemoEngagingLoader() {
  const [showLoader, setShowLoader] = useState(false);
  const [loaderType, setLoaderType] = useState<'login' | 'signup' | 'profile' | 'general'>('general');

  const handleShowLoader = (type: 'login' | 'signup' | 'profile' | 'general') => {
    setLoaderType(type);
    setShowLoader(true);
    
    // Hide loader after 5 seconds
    setTimeout(() => {
      setShowLoader(false);
      Alert.alert('Demo Complete', `Finished showing ${type} loader!`);
    }, 5000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Engaging Loader Demo</Text>
      <Text style={styles.subtitle}>Tap to see different loader types</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleShowLoader('login')}
        >
          <Text style={styles.buttonText}>Login Loader</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleShowLoader('signup')}
        >
          <Text style={styles.buttonText}>Signup Loader</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleShowLoader('profile')}
        >
          <Text style={styles.buttonText}>Profile Loader</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleShowLoader('general')}
        >
          <Text style={styles.buttonText}>General Loader</Text>
        </TouchableOpacity>
      </View>

      {showLoader && (
        <EngagingLoader 
          type={loaderType}
          showTip={true}
          showAnimation={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.7,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.white,
  },
}); 