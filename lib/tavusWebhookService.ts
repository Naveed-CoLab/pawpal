import { ApiConfig } from '@/constants/apiConfig';

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

class TavusWebhookService {
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
      console.log('🔧 Tavus Webhook Service Configuration:');
      console.log('- API URL:', this.apiUrl);
      console.log('- API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET');
      console.log('- Persona ID:', this.personaId);
      console.log('- Replica ID:', this.replicaId);
      console.log('- Mock Mode:', ApiConfig.TAVUS.USE_MOCK_MODE);
      console.log('- Webhook URL:', ApiConfig.TAVUS.WEBHOOK_URL);
      console.log('🎯 Using webhook-based transcript processing - NO WebSockets!');
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
      
      console.log(`🔑 Using API Key: ${this.apiKey.substring(0, 8)}...`);
      console.log(`👤 Using Persona ID: ${this.personaId}`);
      console.log(`🎭 Using Replica ID: ${this.replicaId}`);
      console.log(`🔗 Webhook URL: ${ApiConfig.TAVUS.WEBHOOK_URL}`);
      
      this.sessionStartTime = Date.now();

      // Build request payload matching Tavus Conversations API format
      const conversationName = `VetPaw Coaching: ${metadata.user_full_name || 'Pet Parent'} & ${metadata.pet_name || 'Dog'}`;
      const conversationalContext = `You are Luna from VetPaw, following the DR_LUNA_COACHING_PROMPT system. You're coaching ${metadata.user_full_name || metadata.user_name || 'the pet parent'} about their ${metadata.pet_breed || 'dog'} named ${metadata.pet_name || 'their dog'}. Main concern: ${metadata.user_concern || 'general consultation'}. 

TOPIC CONTEXT: ${metadata.topic_context || 'General consultation and advice.'}

CRITICAL: Use their name "${metadata.user_full_name || metadata.user_name || 'the pet parent'}" frequently - NEVER say "dog parent" or generic terms. Follow the Paw-some Progress Challenge hook and 3C Method from your training. Make this personal, engaging, and interactive!`;
      const customGreeting = this.buildGreeting(metadata);

      const requestBody = {
        replica_id: this.replicaId,
        persona_id: this.personaId,
        callback_url: ApiConfig.TAVUS.WEBHOOK_URL,
        conversation_name: conversationName,
        conversational_context: conversationalContext,
        custom_greeting: customGreeting,
        properties: {
          max_call_duration: 180, // 3 minutes
          participant_left_timeout: 15, // 15 seconds of silence
          participant_absent_timeout: 30, // 30 seconds absence
          enable_recording: true, // ✅ Enable recording for transcript
          enable_closed_captions: true,
          apply_greenscreen: false,
          language: "english"
        }
      };
      
      console.log('📤 Sending request to Tavus Conversations API:', {
        url: `${this.apiUrl}/conversations`,
        replica_id: this.replicaId,
        persona_id: this.personaId,
        conversation_name: conversationName,
        callback_url: ApiConfig.TAVUS.WEBHOOK_URL
      });

      const response = await fetch(`${this.apiUrl}/conversations`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('📥 Tavus API Response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('❌ Tavus API Error:', response.status, errorText);
        console.warn('🎭 Falling back to mock mode');
        return this.createMockSession(metadata);
      }

      const conversationData = await response.json();
      
      // Transform response to match our interface
      const session: TavusLiveSession = {
        conversation_id: conversationData.conversation_id,
        conversation_url: conversationData.conversation_url, // Keep real Daily.co URL for WebView
        status: conversationData.status,
        callback_url: conversationData.callback_url,
        created_at: conversationData.created_at || new Date().toISOString(),
        // Legacy compatibility fields
        session_id: conversationData.conversation_id,
        // For HLS playback in Video component: use mock if Daily.co (since Video can't play Daily.co)
        hls_url: conversationData.conversation_url?.includes('daily.co') ? 
          ApiConfig.TAVUS.MOCK_HLS_URL : 
          conversationData.conversation_url,
        persona_id: this.personaId,
        max_duration_seconds: 180,
        participant_left_timeout: 15,
      };
      
      console.log('✅ Tavus LIVE conversation created successfully:', {
        conversation_id: session.conversation_id,
        status: session.status,
        conversation_url: session.conversation_url, // This should show real Daily.co URL
        hls_url: session.hls_url, // This shows mock HLS for Video component
        video_url: session.hls_url,
        webhook_configured: !!ApiConfig.TAVUS.WEBHOOK_URL,
        is_daily_co_url: session.conversation_url?.includes('daily.co'),
        using_mock_video: session.hls_url === ApiConfig.TAVUS.MOCK_HLS_URL,
        real_daily_url: conversationData.conversation_url, // Debug: show original URL from API
      });
      
      return session;
    } catch (error) {
      console.error('💥 Failed to create Tavus conversation:', error);
      console.warn('🎭 Falling back to mock mode');
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
      callback_url: ApiConfig.TAVUS.WEBHOOK_URL,
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
   * End the current session and trigger transcript processing
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      console.log('🏁 Ending Tavus session:', sessionId);

      // Only call API if we have a valid session ID and it's not a mock
      if (sessionId && !sessionId.startsWith('mock_') && !ApiConfig.TAVUS.USE_MOCK_MODE) {
        try {
          const response = await fetch(`${this.apiUrl}/conversations/${sessionId}`, {
            method: 'DELETE',
            headers: {
              'x-api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            console.log('✅ Tavus session ended via API');
            
            // 🚨 NEW: Trigger transcript processing instead of waiting for webhook
            console.log('🎯 Starting transcript processing...');
            this.processTranscriptAfterSession(sessionId);
            
          } else {
            console.warn(`⚠️ End session warning: ${response.status}`);
          }
        } catch (apiError) {
          console.warn('⚠️ Error calling Tavus end session API:', apiError);
        }
      } else {
        console.log('⏭️ Skipping API call for mock session');
      }
      
      console.log('✅ Session cleanup completed');
    } catch (error) {
      console.error('💥 Error ending session:', error);
    }
  }

  /**
   * Process transcript after session ends (alternative to webhook)
   */
  private async processTranscriptAfterSession(conversationId: string): Promise<void> {
    try {
      console.log('🔄 Processing transcript for conversation:', conversationId);
      console.log('⏳ Waiting 60 seconds for Tavus to process transcript...');
      
      // Wait 60 seconds before trying to fetch transcript
      // This gives Tavus time to process the conversation after it ends
      setTimeout(async () => {
        try {
          console.log('🎯 Now attempting to fetch transcript after delay...');
          
          // Import the transcript fetcher (dynamic import to avoid circular dependencies)
          const { transcriptFetcher } = await import('./transcriptFetcher');
          
          // Start transcript processing (this handles retries automatically)
          const result = await transcriptFetcher.fetchAndProcessTranscript(conversationId);
          
          if (result.success) {
            console.log('✅ Transcript processing completed:', result.sessionId);
          } else {
            console.warn('⚠️ Transcript processing failed:', result.error);
            console.log('💡 Try the manual transcript fetch button in a few minutes');
          }
        } catch (error) {
          console.error('💥 Error in delayed transcript processing:', error);
        }
      }, 60000); // 60 second delay
      
    } catch (error) {
      console.error('💥 Error in transcript processing setup:', error);
    }
  }

  /**
   * Build personalized greeting for Luna using the new engaging hook format
   */
  private buildGreeting(metadata: CoachingSessionMetadata): string {
    const userName = metadata.user_full_name || metadata.user_name || 'there';
    const petName = metadata.pet_name || 'your dog';
    const concern = metadata.issue || metadata.user_concern || 'training';
    const breed = metadata.pet_breed;
    
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
export const tavusWebhookService = new TavusWebhookService(); 
