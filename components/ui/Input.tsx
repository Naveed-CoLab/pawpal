import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  showPasswordToggle?: boolean;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  secureTextEntry,
  showPasswordToggle = false,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const shouldShowToggle = secureTextEntry || showPasswordToggle;
  const actualSecureTextEntry = secureTextEntry && !isPasswordVisible;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused,
            error && styles.inputError,
            shouldShowToggle && styles.inputWithIcon,
            style,
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={Colors.disabled}
          secureTextEntry={actualSecureTextEntry}
          {...props}
        />
        {shouldShowToggle && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={togglePasswordVisibility}
            activeOpacity={0.7}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color={Colors.disabled} />
            ) : (
              <Eye size={20} color={Colors.disabled} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: Colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    backgroundColor: Colors.white,
    minHeight: 48,
  },
  inputWithIcon: {
    paddingRight: 50,
  },
  inputFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: Colors.error,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: '100%',
  },
  error: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.error,
    marginTop: 4,
  },
});