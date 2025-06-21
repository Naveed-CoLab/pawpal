declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_ELEVENLABS_API_KEY: string;
      EXPO_PUBLIC_TAVUS_API_KEY: string;
      EXPO_PUBLIC_OPENAI_API_KEY: string;
      EXPO_PUBLIC_GEMINI_API_KEY: string;
      EXPO_PUBLIC_REVENUECAT_API_KEY: string;
      EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY: string;
      EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY: string;
    }
  }
}

export {};