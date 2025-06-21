// Gemini AI API Configuration
// Updated to use the new API configuration structure

import { ApiConfig, validateGeminiApiKey } from './apiConfig';
import { 
  VETERINARY_SYSTEM_PROMPT, 
  HEALTH_ANALYSIS_SYSTEM_PROMPT, 
  JAMES_COACHING_PROMPT, 
  COACHING_SUMMARY_PROMPT,
  VISION_ANALYSIS_PROMPT 
} from './prompts';

// Re-export API configuration for backward compatibility
export { ApiConfig, validateGeminiApiKey };

// Re-export prompts for backward compatibility
export { 
  VETERINARY_SYSTEM_PROMPT, 
  HEALTH_ANALYSIS_SYSTEM_PROMPT, 
  JAMES_COACHING_PROMPT as COACHING_SYSTEM_PROMPT, 
  COACHING_SUMMARY_PROMPT,
  VISION_ANALYSIS_PROMPT as VETERINARY_VISION_PROMPT 
};

// Legacy exports for backward compatibility
export const GEMINI_API_KEY = ApiConfig.GEMINI.API_KEY;
export const GEMINI_API_URL = ApiConfig.GEMINI.API_URL;
export const USE_FALLBACK_RESPONSES = ApiConfig.GEMINI.USE_FALLBACK_RESPONSES;
export const REQUEST_TIMEOUT = ApiConfig.GEMINI.REQUEST_TIMEOUT;
export const MAX_RETRIES = ApiConfig.GEMINI.MAX_RETRIES;

// Tavus configuration (legacy support)
export const TAVUS_API_KEY = ApiConfig.TAVUS.API_KEY;
export const TAVUS_API_URL = ApiConfig.TAVUS.API_URL;
export const TAVUS_PERSONA_ID = ApiConfig.TAVUS.PERSONA_ID;