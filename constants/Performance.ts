// Performance optimization settings
export const PERFORMANCE_CONFIG = {
  // Image optimization
  IMAGE_CACHE_SIZE: 50, // Number of images to cache
  IMAGE_QUALITY: 0.8, // Image compression quality (0-1)
  LAZY_LOAD_THRESHOLD: 100, // Pixels before loading
  
  // Data caching
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100, // Maximum cached items
  
  // Network optimization
  REQUEST_TIMEOUT: 10000, // 10 seconds
  MAX_CONCURRENT_REQUESTS: 5,
  RETRY_ATTEMPTS: 3,
  
  // Real-time subscriptions
  SUBSCRIPTION_DEBOUNCE: 500, // ms
  RECONNECT_INTERVAL: 5000, // ms
  
  // UI performance
  LIST_ITEM_HEIGHT: 80, // For virtualized lists
  ANIMATION_DURATION: 200, // ms
  THROTTLE_DELAY: 100, // ms for scroll events
};

// Performance monitoring
export const PERFORMANCE_METRICS = {
  SLOW_QUERY_THRESHOLD: 2000, // 2 seconds
  LARGE_PAYLOAD_THRESHOLD: 1024 * 1024, // 1MB
  MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB
};

// Image optimization helpers
export const getOptimizedImageUrl = (url: string, width?: number, height?: number, quality = PERFORMANCE_CONFIG.IMAGE_QUALITY) => {
  if (!url || typeof url !== 'string') return url;
  
  // For Supabase storage URLs, add transformation parameters
  if (url.includes('supabase')) {
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    if (height) params.append('height', height.toString());
    params.append('quality', Math.round(quality * 100).toString());
    
    return `${url}?${params.toString()}`;
  }
  
  return url;
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle function for performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Memory management
export const clearUnusedCache = () => {
  // Clear old cached images
  if (global.gc) {
    global.gc();
    console.log('🗑️ Garbage collection triggered');
  }
};

// Performance logger
export const logPerformance = (operation: string, startTime: number, data?: any) => {
  const duration = Date.now() - startTime;
  const isSlowQuery = duration > PERFORMANCE_METRICS.SLOW_QUERY_THRESHOLD;
  
  console.log(
    `⚡ ${operation}: ${duration}ms ${isSlowQuery ? '🐌 SLOW' : '⚡ FAST'}`,
    data ? `(${JSON.stringify(data).length} bytes)` : ''
  );
  
  if (isSlowQuery) {
    console.warn(`🐌 Slow operation detected: ${operation} took ${duration}ms`);
  }
}; 