import { ApiConfig } from '@/constants/apiConfig';
import { apiKeysService } from './apiKeysService';

export interface TavusLiveSession {
  conversation_id: string;
  conversation_url: string;
  status: string;
  callback_url?: string;
  created_at: string;
  // Legacy fields for compatibility
  session_id?: string;
  hls_url?: string;
  persona_id?: string;
  max_duration_seconds?: number;
  participant_left_timeout?: number;
}

export interface CoachingSessionMetadata {
  pet_name?: string;
  pet_breed?: string;
  pet_age?: string;
  pet_weight?: string;
  issue?: string;
  user_concern?: string;
  user_name?: string;
  user_full_name?: string;
  topic_context?: string;
}

class TavusLiveService {
  private apiKey: string;
  private apiUrl: string;
  private personaId: string;
  private replicaId: string;
  private sessionStartTime: number = 0;

  constructor() {
    this.apiKey = ApiConfig.TAVUS.API_KEY;
    this.apiUrl = ApiConfig.TAVUS.API_URL;
    this.personaId = ApiConfig.TAVUS.PERSONA_ID;
    this.replicaId = ApiConfig.TAVUS.REPLICA_ID;
    
    // Debug logging for development
    if (__DEV__) {
      console.log('🔧 Tavus Live Service Configuration:');
      console.log('- API URL:', this.apiUrl);
      console.log('- API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET');
      console.log('- Persona ID:', this.personaId);
      console.log('- Replica ID:', this.replicaId);
      console.log('- Mock Mode:', ApiConfig.TAVUS.USE_MOCK_MODE);
      console.log('- Webhook URL:', ApiConfig.TAVUS.WEBHOOK_URL);
    }
  }

  /**
   * Create a new live coaching session with Tavus
   */
  async createLiveSession(metadata: CoachingSessionMetadata): Promise<TavusLiveSession> {
    try {
      console.log('🎥 Creating Tavus LIVE conversation...');
      
      // Check if we should use mock mode
      if (ApiConfig.TAVUS.USE_MOCK_MODE) {
        console.log('🎭 Using Tavus mock mode - API not configured');
        return this.createMockSession(metadata);
      }
      
      // Check if API is properly configured
      if (!this.apiKey || this.apiKey === 'your-tavus-api-key-here') {
        console.warn('⚠️ Tavus API key not configured, using mock mode');
        return this.createMockSession(metadata);
      }
      
      if (!this.personaId || this.personaId === 'dr-luna-vet-coach' || this.personaId === 'james-vet-coach') {
        console.warn('⚠️ Tavus Persona ID not configured, using mock mode');
        return this.createMockSession(metadata);
      }
      
      // Use hardcoded persona ID
      const dynamicPersonaId = 'p27952133091';
      const dynamicReplicaId = 'r9d30b0e55ac'; // Using same ID for replica
      
      console.log(`🔑 Using API Key: ${this.apiKey.substring(0, 8)}...`);
      console.log(`👤 Using Persona ID: ${dynamicPersonaId}`);
      console.log(`🎭 Using Replica ID: ${dynamicReplicaId}`);
      console.log(`🔗 Webhook URL: ${ApiConfig.TAVUS.WEBHOOK_URL}`);
      
      this.sessionStartTime = Date.now();

      // Build request payload matching Tavus Conversations API format
      const conversationName = `VetPaw Coaching: ${metadata.user_full_name || 'Pet Parent'} & ${metadata.pet_name || 'Dog'}`;
      const conversationalContext = `You are Luna from VetPaw, following the DR_LUNA_COACHING_PROMPT system. You're coaching ${metadata.user_full_name || metadata.user_name || 'the pet parent'} about their ${metadata.pet_breed || 'dog'} named ${metadata.pet_name || 'their dog'}. Main concern: ${metadata.user_concern || 'general consultation'}. 

TOPIC CONTEXT: ${metadata.topic_context || 'General consultation and advice.'}

CRITICAL: Use their name "${metadata.user_full_name || metadata.user_name || 'the pet parent'}" frequently - NEVER say "dog parent" or generic terms. Follow the Paw-some Progress Challenge hook and 3C Method from your training. Make this personal, engaging, and interactive!`;
      const customGreeting = this.buildGreeting(metadata);

      const requestBody = {
        replica_id: dynamicReplicaId,
        persona_id: dynamicPersonaId,
        callback_url: ApiConfig.TAVUS.WEBHOOK_URL,
        conversation_name: conversationName,
        conversational_context: conversationalContext,
        custom_greeting: customGreeting,
        properties: {
          max_call_duration: 180, // 3 minutes
          participant_left_timeout: 15, // 15 seconds of silence
          participant_absent_timeout: 30, // 30 seconds absence
          enable_recording: true, // Enable recording for transcript
          enable_closed_captions: true,
          apply_greenscreen: false,
          language: "english"
          // Note: user_name and participant_name not supported by Tavus API
          // Daily.co will handle participant name prompts internally
        }
      };
      
      console.log('📤 Sending request to Tavus Conversations API:', {
        url: `${this.apiUrl}/conversations`,
        replica_id: this.replicaId,
        persona_id: this.personaId,
        conversation_name: conversationName,
        callback_url: ApiConfig.TAVUS.WEBHOOK_URL
      });

      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${this.apiUrl}/conversations`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      console.log('📥 Tavus API Response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Unknown error' };
        }
        
        console.error('❌ Tavus API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: `${this.apiUrl}/conversations`,
        });
        
        // Provide more specific error messages
        if (response.status === 401) {
          console.warn('🎭 Authentication failed, falling back to mock mode');
          return this.createMockSession(metadata);
        } else if (response.status === 404) {
          console.warn('🎭 Replica/Persona not found, falling back to mock mode');
          return this.createMockSession(metadata);
        } else if (response.status === 403) {
          console.warn('🎭 API access forbidden, falling back to mock mode');
          return this.createMockSession(metadata);
        } else if (response.status >= 500) {
          throw new Error('Tavus API server error. Please try again in a few moments.');
        } else {
          console.warn('🎭 API error, falling back to mock mode');
          return this.createMockSession(metadata);
        }
      }

      const conversationData = await response.json();
      
      // Transform response to match our interface
      const session: TavusLiveSession = {
        conversation_id: conversationData.conversation_id,
        conversation_url: conversationData.conversation_url,
        status: conversationData.status,
        callback_url: conversationData.callback_url,
        created_at: conversationData.created_at || new Date().toISOString(),
        // Legacy compatibility fields
        session_id: conversationData.conversation_id,
        // For HLS playback in Video component: use mock if Daily.co (since Video can't play Daily.co)
        hls_url: conversationData.conversation_url?.includes('daily.co') ? 
          'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8' : 
          conversationData.conversation_url,
        persona_id: dynamicPersonaId,
        max_duration_seconds: 180,
        participant_left_timeout: 15,
      };
      
      console.log('✅ Tavus LIVE conversation created successfully:', {
        conversation_id: session.conversation_id,
        status: session.status,
        conversation_url: session.conversation_url,
        hls_url: session.hls_url,
        video_url: session.hls_url,
        is_daily_co_url: session.conversation_url?.includes('daily.co'),
        using_mock_video: session.hls_url === 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
        real_daily_url: conversationData.conversation_url,
      });
      
      return session;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('💥 Tavus API request timeout after 30 seconds');
          console.warn('🎭 Network timeout, falling back to mock mode');
          return this.createMockSession(metadata);
        } else if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network request failed'))) {
          console.error('💥 Network connectivity issue:', error.message);
          console.warn('🎭 Network error, falling back to mock mode');
          return this.createMockSession(metadata);
        }
      }
      
      console.error('💥 Failed to create Tavus conversation:', error);
      console.warn('🎭 Unexpected error, falling back to mock mode');
      return this.createMockSession(metadata);
    }
  }

  /**
   * Create a mock session for testing/fallback
   */
  private createMockSession(metadata: CoachingSessionMetadata): TavusLiveSession {
    const mockSessionId = `mock_${Date.now()}`;
    console.log('🎭 Creating mock Tavus session:', mockSessionId);
    console.log('🎥 Using Apple demo HLS stream for testing');
    
    const mockHlsUrl = ApiConfig.TAVUS.MOCK_HLS_URL;
    console.log('📺 Mock video URL:', mockHlsUrl);
    
    return {
      conversation_id: mockSessionId,
      conversation_url: mockHlsUrl,
      status: 'ready',
      callback_url: '',
      created_at: new Date().toISOString(),
      // Legacy compatibility fields
      session_id: mockSessionId,
      hls_url: mockHlsUrl,
      persona_id: 'mock-dr-luna',
      max_duration_seconds: 180,
      participant_left_timeout: 15,
    };
  }

  /**
   * End the current session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      console.log('🏁 Ending Tavus session:', sessionId);

      // Only call API if we have a valid session ID and it's not a mock
      if (sessionId && !sessionId.startsWith('mock_') && !ApiConfig.TAVUS.USE_MOCK_MODE) {
        try {
          // Use conversation endpoint to end the session
          const response = await fetch(`${this.apiUrl}/conversations/${sessionId}`, {
            method: 'DELETE',
            headers: {
              'x-api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`Tavus end session warning: ${response.status} - ${errorData.message || 'Unknown error'}`);
          } else {
            console.log('✅ Tavus session ended via API');
          }
        } catch (apiError) {
          console.warn('⚠️ Error calling Tavus end session API:', apiError);
          // Don't throw, session cleanup should continue
        }
      } else {
        console.log('⏭️ Skipping API call for mock session or mock mode');
      }
      
      console.log('✅ Tavus session cleanup completed');
    } catch (error) {
      console.error('💥 Error ending Tavus session:', error);
      // Don't throw, as the session is likely already ended
    }
  }

  /**
   * Build personalized greeting for Luna using the new engaging hook format
   */
  private buildGreeting(metadata: CoachingSessionMetadata): string {
    console.log('🎭 BUILD GREETING DEBUG:');
    console.log('- metadata.user_full_name:', `"${metadata.user_full_name}"`);
    console.log('- metadata.user_name:', `"${metadata.user_name}"`);
    console.log('- metadata.pet_name:', `"${metadata.pet_name}"`);
    
    const userName = metadata.user_full_name || metadata.user_name || 'there';
    const petName = metadata.pet_name || 'your dog';
    const concern = metadata.issue || metadata.user_concern || 'training';
    const breed = metadata.pet_breed;
    
    console.log('- Final userName for greeting:', `"${userName}"`);
    
    // Implement the "Paw-some Progress Challenge" hook from the prompt
    let greeting = `Hi ${userName}! I'm Luna, and I'm absolutely thrilled to meet you and ${petName} today! 🐾 `;
    
    if (breed) {
      greeting += `I love working with ${breed}s - they're such amazing dogs! `;
    }
    
    greeting += `Before we dive into ${concern}, let's start with our signature Paw-some Progress Challenge! `;
    greeting += `On a scale of 1-10, where would you rate ${petName}'s ${concern} right now? `;
    greeting += `Once you tell me, I'll help you and ${petName} reach at least a level higher by the end of our session! `;
    greeting += `Are you ready to see some amazing progress with ${petName}? Let's make some magic happen! 🌟`;
    
    return greeting;
  }

  /**
   * Get session duration in seconds
   */
  getSessionDuration(): number {
    if (this.sessionStartTime === 0) return 0;
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }
}

// Export singleton instance
export const tavusLiveService = new TavusLiveService(); 
