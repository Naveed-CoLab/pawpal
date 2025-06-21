import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyTipsAPI, DailyTip } from '@/lib/dailyTipsAPI';

const STORAGE_KEY = 'vetpaw_daily_tips';
const TIPS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedTips {
  tips: DailyTip[];
  timestamp: string;
  lastPetInfo: {
    name?: string;
    breed?: string;
    age?: number;
  };
}

export const useDailyTips = (
  petName?: string,
  petBreed?: string,
  petAge?: number
) => {
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cached tips from storage
  const loadCachedTips = useCallback(async (): Promise<CachedTips | null> => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (!cached) return null;

      const parsedCache: CachedTips = JSON.parse(cached);
      const cacheAge = Date.now() - new Date(parsedCache.timestamp).getTime();
      
      // Check if cache is still valid (within 24 hours)
      if (cacheAge > TIPS_CACHE_DURATION) {
        console.log('📅 Daily tips cache expired, will refresh');
        return null;
      }

      // Check if pet info has changed
      const petInfoChanged = (
        parsedCache.lastPetInfo.name !== petName ||
        parsedCache.lastPetInfo.breed !== petBreed ||
        parsedCache.lastPetInfo.age !== petAge
      );

      if (petInfoChanged && (petName || petBreed || petAge)) {
        console.log('🐕 Pet info changed, will generate new tips');
        return null;
      }

      console.log('✅ Using cached daily tips');
      return parsedCache;
    } catch (error) {
      console.error('❌ Error loading cached tips:', error);
      return null;
    }
  }, [petName, petBreed, petAge]);

  // Save tips to cache
  const saveTipsToCache = useCallback(async (tipsToCache: DailyTip[]) => {
    try {
      const cacheData: CachedTips = {
        tips: tipsToCache,
        timestamp: new Date().toISOString(),
        lastPetInfo: {
          name: petName,
          breed: petBreed,
          age: petAge,
        },
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      console.log('💾 Daily tips cached successfully');
    } catch (error) {
      console.error('❌ Error caching tips:', error);
    }
  }, [petName, petBreed, petAge]);

  // Generate new tips
  const generateNewTips = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🎯 Generating new daily tips...');
      const newTips = await DailyTipsAPI.generateMultipleTips(
        3, // Generate 3 tips for the slider
        petName,
        petBreed,
        petAge
      );

      if (newTips.length === 0) {
        throw new Error('No tips generated');
      }

      setTips(newTips);
      await saveTipsToCache(newTips);
      
      console.log(`✅ Generated ${newTips.length} daily tips`);
    } catch (err) {
      console.error('❌ Error generating tips:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate tips');
      
      // Use fallback tips on error
      const fallbackTips = await Promise.all([
        DailyTipsAPI.generateDailyTip(petName, petBreed, petAge),
        DailyTipsAPI.generateDailyTip(petName, petBreed, petAge),
        DailyTipsAPI.generateDailyTip(petName, petBreed, petAge),
      ]);
      
      setTips(fallbackTips);
    } finally {
      setLoading(false);
    }
  }, [petName, petBreed, petAge, saveTipsToCache]);

  // Initialize tips
  const initializeTips = useCallback(async () => {
    try {
      // First, try to load cached tips
      const cached = await loadCachedTips();
      
      if (cached && cached.tips.length > 0) {
        setTips(cached.tips);
        setLoading(false);
        return;
      }

      // If no valid cache, generate new tips
      await generateNewTips();
    } catch (error) {
      console.error('❌ Error initializing tips:', error);
      setError('Failed to load tips');
      setLoading(false);
    }
  }, [loadCachedTips, generateNewTips]);

  // Manually refresh tips
  const refreshTips = useCallback(async () => {
    console.log('🔄 Manually refreshing daily tips...');
    await generateNewTips();
  }, [generateNewTips]);

  // Check if tips should be refreshed (for background updates)
  const checkForRefresh = useCallback(async () => {
    const cached = await loadCachedTips();
    
    if (!cached) {
      // No cache or expired cache, refresh
      await generateNewTips();
    }
  }, [loadCachedTips, generateNewTips]);

  // Initialize on mount or when pet info changes
  useEffect(() => {
    initializeTips();
  }, [initializeTips]);

  // Clear cache when pet changes significantly
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Daily tips cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }, []);

  return {
    tips,
    loading,
    error,
    refreshTips,
    checkForRefresh,
    clearCache,
    // Utility functions
    isEmpty: tips.length === 0,
    isStale: false, // Could be enhanced to check staleness
  };
}; 