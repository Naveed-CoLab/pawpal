// API Configuration for VetPaw
// All API keys and endpoints are loaded from environment variables

export const ApiConfig = {
  // Gemini AI Configuration
  GEMINI: {
    API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    USE_FALLBACK_RESPONSES: !process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY === '',
    REQUEST_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 2,
  },

  // Tavus API Configuration
  TAVUS: {
    API_KEY: process.env.EXPO_PUBLIC_TAVUS_API_KEY || 'your-tavus-api-key-here',
    API_URL: 'https://tavusapi.com/v2',
    PERSONA_ID: process.env.EXPO_PUBLIC_TAVUS_PERSONA_ID || 'james-vet-coach',
    REPLICA_ID: process.env.EXPO_PUBLIC_TAVUS_REPLICA_ID || process.env.EXPO_PUBLIC_TAVUS_PERSONA_ID || 'james-vet-coach',
    // Temporarily enable mock mode to bypass URL scheme errors on mobile
    USE_MOCK_MODE: true, // Force mock mode until API credentials are properly configured
    SESSION_MAX_DURATION: 180, // 3 minutes in seconds as requested
    AUTO_END_ON_SILENCE: 15, // 15 seconds of silence
    WEBHOOK_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? 
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/tavus-webhook` : 
      'https://your-project.supabase.co/functions/v1/tavus-webhook',
    WEBSOCKET_URL: 'wss://tavusapi.com/v2/ws',
    MOBILE_WEBSOCKET_URL: 'wss://echo.websocket.org', // Safe WebSocket for testing
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 2000,
    // Mobile-specific configurations
    MOBILE_API_URL: 'https://api.tavus.io/v2', // Alternative API URL for mobile compatibility
    ENABLE_MOCK_VIDEO: true, // Enable mock video URL for testing
    MOCK_HLS_URL: 'https://demo-videos.s3.amazonaws.com/sample.m3u8', // Mock HLS stream for testing
  },

  // RevenueCat Configuration
  REVENUECAT: {
    APPLE_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || 'appl_your_ios_api_key_here',
    GOOGLE_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || 'goog_JsENQXAoXxQZBikUjFgmnHXbIwp',
    USE_MOCK_MODE: false, // Enable real RevenueCat on mobile devices
  },

  // ElevenLabs Configuration (for future TTS implementation)
  ELEVENLABS: {
    API_KEY: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || 'your-elevenlabs-api-key-here',
    API_URL: 'https://api.elevenlabs.io/v1',
    USE_MOCK_MODE: true,
  },

  // OpenAI Configuration (backup for Gemini)
  OPENAI: {
    API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'your-openai-api-key-here',
    API_URL: 'https://api.openai.com/v1',
    USE_MOCK_MODE: true,
  },

  // General Configuration
  GENERAL: {
    REQUEST_TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
  }
};

// Helper functions for API configuration
export const isApiConfigured = (service: keyof typeof ApiConfig) => {
  switch (service) {
    case 'GEMINI':
      return !!ApiConfig.GEMINI.API_KEY && !ApiConfig.GEMINI.USE_FALLBACK_RESPONSES && validateGeminiApiKey(ApiConfig.GEMINI.API_KEY);
    case 'TAVUS':
      return !ApiConfig.TAVUS.USE_MOCK_MODE;
    case 'REVENUECAT':
      return !ApiConfig.REVENUECAT.USE_MOCK_MODE;
    case 'ELEVENLABS':
      return !ApiConfig.ELEVENLABS.USE_MOCK_MODE;
    case 'OPENAI':
      return !ApiConfig.OPENAI.USE_MOCK_MODE;
    default:
      return false;
  }
};

export const getApiStatus = () => {
  return {
    gemini: isApiConfigured('GEMINI'),
    tavus: isApiConfigured('TAVUS'),
    revenuecat: isApiConfigured('REVENUECAT'),
    elevenlabs: isApiConfigured('ELEVENLABS'),
    openai: isApiConfigured('OPENAI'),
  };
};

// Validate API key format for Gemini
export const validateGeminiApiKey = (apiKey: string): boolean => {
  // Gemini API keys typically start with 'AIza' and are 39 characters long
  return apiKey.startsWith('AIza') && apiKey.length === 39;
};

// Log API configuration status (for debugging)
if (__DEV__) {
  const status = getApiStatus();
  console.log('🔧 API Configuration Status:', status);
  
  if (!status.gemini) {
    console.log('⚠️ Gemini API not configured - using fallback responses');
    if (ApiConfig.GEMINI.API_KEY) {
      const isValidKey = validateGeminiApiKey(ApiConfig.GEMINI.API_KEY);
      console.log(`🔑 Gemini API key validation: ${isValidKey ? 'VALID' : 'INVALID'}`);
      if (!isValidKey) {
        console.log('❌ Gemini API key format is incorrect. Expected format: AIza... (39 characters)');
      }
    } else {
      console.log('❌ No Gemini API key found in environment variables');
    }
  }
  if (!status.tavus) console.log('⚠️ Tavus API not configured - using mock mode');
  if (!status.revenuecat) console.log('⚠️ RevenueCat not configured - using mock mode');
  if (!status.elevenlabs) console.log('⚠️ ElevenLabs not configured - using mock mode');
  if (!status.openai) console.log('⚠️ OpenAI not configured - using mock mode');
}