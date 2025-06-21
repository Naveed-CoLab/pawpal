import React, { useState, useCallback } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: any;
  placeholder?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  source,
  style,
  placeholder,
  resizeMode = 'cover',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // If it's a local image (number), render directly
  if (typeof source === 'number') {
    return (
      <Image
        source={source}
        style={style}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
    );
  }

  // For remote images, add caching and optimization
  const optimizedSource = {
    uri: source.uri,
    cache: 'force-cache' as const,
  };

  return (
    <View style={[style, styles.container]}>
      <Image
        source={optimizedSource}
        style={[StyleSheet.absoluteFillObject, style]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={() => setLoading(true)}
      />
      
      {loading && !hasError && (
        <View style={styles.loadingContainer}>
          {placeholder || (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
        </View>
      )}
      
      {hasError && (
        <View style={styles.errorContainer}>
          <View style={styles.errorPlaceholder} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
  },
  errorPlaceholder: {
    width: '60%',
    height: '60%',
    backgroundColor: Colors.textSecondary,
    borderRadius: 8,
    opacity: 0.3,
  },
}); 