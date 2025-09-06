import AsyncStorage from '@react-native-async-storage/async-storage';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private readonly MAX_METRICS = 50; // Keep last 50 measurements

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    return () => this.endTimer(operation, startTime);
  }

  /**
   * End timing an operation
   */
  private endTimer(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.recordMetric(operation, duration);
    
    // Log performance metrics
    const avg = this.getAverageMetric(operation);
    console.log(`⏱️ ${operation}: ${duration}ms (avg: ${avg.toFixed(0)}ms)`);
    
    // Alert if performance is poor
    if (duration > 5000) {
      console.warn(`⚠️ Slow ${operation}: ${duration}ms`);
    }
  }

  /**
   * Record a metric
   */
  private recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const metrics = this.metrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only the last MAX_METRICS measurements
    if (metrics.length > this.MAX_METRICS) {
      metrics.shift();
    }
  }

  /**
   * Get average metric for an operation
   */
  getAverageMetric(operation: string): number {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, val) => acc + val, 0);
    return sum / metrics.length;
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const report: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [operation, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;
      
      const sum = metrics.reduce((acc, val) => acc + val, 0);
      const avg = sum / metrics.length;
      const min = Math.min(...metrics);
      const max = Math.max(...metrics);
      
      report[operation] = {
        avg: Math.round(avg),
        min,
        max,
        count: metrics.length
      };
    }
    
    return report;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    console.log('🗑️ Performance metrics cleared');
  }

  /**
   * Log performance report
   */
  logPerformanceReport(): void {
    const report = this.getPerformanceReport();
    console.log('📊 Performance Report:');
    
    for (const [operation, stats] of Object.entries(report)) {
      console.log(`  ${operation}: avg=${stats.avg}ms, min=${stats.min}ms, max=${stats.max}ms, count=${stats.count}`);
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Performance decorator for easy timing
export function measurePerformance(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const endTimer = performanceMonitor.startTimer(operation);
      try {
        const result = await originalMethod.apply(this, args);
        endTimer();
        return result;
      } catch (error) {
        endTimer();
        throw error;
      }
    };
    
    return descriptor;
  };
} 