import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { PERFORMANCE_METRICS, clearUnusedCache } from '../constants/Performance';

interface PerformanceData {
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  cacheHits: number;
  cacheMisses: number;
}

export default function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(__DEV__);
  const [performance, setPerformance] = useState<PerformanceData>({
    renderTime: 0,
    memoryUsage: 0,
    networkRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });

  useEffect(() => {
    if (!__DEV__) return;

    const interval = setInterval(() => {
      // Simulate performance monitoring
      const renderTime = performance.now ? performance.now() : Date.now();
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      
      setPerformance(prev => ({
        ...prev,
        renderTime: Math.round(renderTime * 100) / 100,
        memoryUsage: Math.round(memoryUsage / 1024 / 1024 * 100) / 100, // MB
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!__DEV__ || !isVisible) return null;

  const isMemoryHigh = performance.memoryUsage > PERFORMANCE_METRICS.MEMORY_WARNING_THRESHOLD / 1024 / 1024;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsVisible(!isVisible)}
      >
        <Text style={styles.title}>⚡ Performance</Text>
      </TouchableOpacity>
      
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Memory:</Text>
          <Text style={[
            styles.metricValue,
            { color: isMemoryHigh ? Colors.error : Colors.success }
          ]}>
            {performance.memoryUsage}MB
          </Text>
        </View>
        
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Render:</Text>
          <Text style={styles.metricValue}>
            {performance.renderTime}ms
          </Text>
        </View>
        
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Network:</Text>
          <Text style={styles.metricValue}>
            {performance.networkRequests}
          </Text>
        </View>
        
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Cache:</Text>
          <Text style={styles.metricValue}>
            {performance.cacheHits}/{performance.cacheHits + performance.cacheMisses}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.clearButton}
        onPress={clearUnusedCache}
      >
        <Text style={styles.clearButtonText}>🗑️ Clear Cache</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    padding: 8,
    minWidth: 120,
    zIndex: 9999,
  },
  header: {
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    marginBottom: 4,
  },
  title: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  metrics: {
    marginBottom: 8,
  },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metricLabel: {
    color: 'white',
    fontSize: 10,
    opacity: 0.8,
  },
  metricValue: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
}); 