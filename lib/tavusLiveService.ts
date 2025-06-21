import { ApiConfig } from '@/constants/apiConfig';
import { JAMES_COACHING_PROMPT, COACHING_SUMMARY_PROMPT } from '@/constants/prompts';

export interface TavusLiveSession {
  conversation_id: string;
  conversation_url: string;
  status: string;
  callback_url?: string;
  created_at: string;
  // Legacy fields for compatibility
  session_id?: string;
  ws_url?: string;
  hls_url?: string;
  persona_id?: string;
  max_duration_seconds?: number;
  participant_left_timeout?: number;
}

export interface TavusWebSocketMessage {
  type: 'application.ended' | 'conversation.started' | 'transcription_ready' | 'caption.live' | 'error';
  data: any;
  timestamp: string;
}

export interface TavusCaption {
  text: string;
  is_final: boolean;
  speaker: 'user' | 'ai';
  timestamp: string;
  confidence?: number;
}

export interface TavusTranscript {
  session_id: string;
  captions: TavusCaption[];
  full_text: string;
  duration_seconds: number;
}

export interface CoachingSessionMetadata {
  pet_name?: string;
  pet_breed?: string;
  pet_age?: string;
  pet_weight?: string;
  issue?: string;
  user_concern?: string;
}

export interface SessionSummary {
  session_title: string;
  main_topic: string;
  urgency_level: 'low' | 'moderate' | 'high';
  key_points: string[];
  recommendations: string[];
  techniques_taught: string[];
  next_steps: string[];
  progress_notes: string;
  follow_up_timeline: string;
}

class TavusLiveService {
  private apiKey: string;
  private apiUrl: string;
  private personaId: string;
  private replicaId: string;
  private currentWebSocket: WebSocket | null = null;
  private sessionStartTime: number = 0;
  private captionBuffer: TavusCaption[] = [];

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
      
      // Show environment variable status
      console.log('🌍 Environment Variables:');
      console.log('- EXPO_PUBLIC_TAVUS_API_KEY:', process.env.EXPO_PUBLIC_TAVUS_API_KEY ? 'SET' : 'NOT SET');
      console.log('- EXPO_PUBLIC_TAVUS_PERSONA_ID:', process.env.EXPO_PUBLIC_TAVUS_PERSONA_ID ? 'SET' : 'NOT SET');
      console.log('- EXPO_PUBLIC_GEMINI_API_KEY:', process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'SET' : 'NOT SET');
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
      
      if (!this.personaId || this.personaId === 'james-vet-coach') {
        console.warn('⚠️ Tavus Persona ID not configured, using mock mode');
        return this.createMockSession(metadata);
      }
      
      console.log(`🔑 Using API Key: ${this.apiKey.substring(0, 8)}...`);
      console.log(`👤 Using Persona ID: ${this.personaId}`);
      console.log(`🎭 Using Replica ID: ${this.replicaId}`);
      
      this.sessionStartTime = Date.now();

      // Build request payload matching Tavus Conversations API format
      const conversationName = `VetPaw Coaching: ${metadata.pet_name || 'Dog Training'}`;
      const conversationalContext = `You are James, a certified canine behavior specialist. You're having a live video coaching session about ${metadata.pet_name || 'a dog'} (${metadata.pet_breed || 'mixed breed'}). The user wants help with: ${metadata.user_concern || 'general training'}. Provide practical, actionable advice in a friendly, encouraging manner.`;
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
          enable_recording: false,
          enable_closed_captions: true,
          apply_greenscreen: false,
          language: "english"
        }
      };
      
      console.log('📤 Sending request to Tavus Conversations API:', {
        url: `${this.apiUrl}/conversations`,
        replica_id: this.replicaId,
        persona_id: this.personaId,
        conversation_name: conversationName
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
          headers: {
            'x-api-key': `${this.apiKey.substring(0, 8)}...`,
            'Content-Type': 'application/json',
          }
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
        ws_url: this.buildWebSocketUrl(conversationData.conversation_id),
        hls_url: conversationData.conversation_url,
        persona_id: this.personaId,
        max_duration_seconds: 180,
        participant_left_timeout: 15,
      };
      
      console.log('✅ Tavus LIVE conversation created successfully:', {
        conversation_id: session.conversation_id,
        status: session.status,
        conversation_url: session.conversation_url ? 'PRESENT' : 'MISSING',
      });
      
      return session;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('💥 Tavus API request timeout after 30 seconds');
          console.warn('🎭 Network timeout, falling back to mock mode');
          return this.createMockSession(metadata);
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
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
    
    return {
      conversation_id: mockSessionId,
      conversation_url: 'https://demo-videos.s3.amazonaws.com/sample.m3u8',
      status: 'ready',
      callback_url: '',
      created_at: new Date().toISOString(),
      // Legacy compatibility fields
      session_id: mockSessionId,
      ws_url: 'wss://echo.websocket.org',
      hls_url: 'https://demo-videos.s3.amazonaws.com/sample.m3u8',
      persona_id: 'mock-james',
      max_duration_seconds: 180,
      participant_left_timeout: 15,
    };
  }

  /**
   * Build proper WebSocket URL for mobile compatibility
   */
  private buildWebSocketUrl(sessionId: string): string {
    // Use secure WebSocket URL that works on mobile
    const baseUrl = 'wss://api.tavus.io/v2/ws';
    return `${baseUrl}/${sessionId}`;
  }

  /**
   * Connect to Tavus WebSocket for real-time communication
   */
  connectWebSocket(
    wsUrl: string, 
    onMessage: (message: TavusWebSocketMessage) => void,
    onCaption: (caption: TavusCaption) => void,
    onError: (error: string) => void
  ): void {
    try {
      console.log('🔌 Connecting to Tavus WebSocket...');
      
      // Ensure proper WebSocket URL scheme for mobile
      let finalWsUrl = wsUrl;
      if (!wsUrl || wsUrl === '') {
        // Use mobile-compatible WebSocket URL
        finalWsUrl = ApiConfig.TAVUS.MOBILE_WEBSOCKET_URL || ApiConfig.TAVUS.WEBSOCKET_URL;
      }
      
      // Validate URL scheme
      if (!finalWsUrl.startsWith('ws://') && !finalWsUrl.startsWith('wss://')) {
        console.warn('⚠️ Invalid WebSocket URL scheme, using fallback');
        finalWsUrl = 'wss://api.tavus.io/v2/ws';
      }
      
      console.log('🔗 WebSocket URL:', finalWsUrl);
      
      // For mobile/Expo compatibility, handle WebSocket creation differently
      try {
        this.currentWebSocket = new WebSocket(finalWsUrl);
      } catch (urlError) {
        console.error('❌ WebSocket URL error:', urlError);
        // Fallback to basic WebSocket URL
        this.currentWebSocket = new WebSocket('wss://api.tavus.io/v2/ws');
      }
      
      this.currentWebSocket.onopen = () => {
        console.log('✅ Tavus WebSocket connected successfully');
      };

      this.currentWebSocket.onmessage = (event) => {
        try {
          // Handle potential non-JSON messages
          if (!event.data || typeof event.data !== 'string') {
            console.warn('⚠️ Received non-string WebSocket message:', event.data);
            return;
          }
          
          // Skip empty or malformed messages
          const data = event.data.trim();
          if (!data || !data.startsWith('{')) {
            console.warn('⚠️ Received non-JSON WebSocket message:', data);
            return;
          }
          
          const message: TavusWebSocketMessage = JSON.parse(data);
          
          // Handle different message types
          switch (message.type) {
            case 'caption.live':
              const caption: TavusCaption = {
                text: message.data.text || '',
                is_final: message.data.is_final || false,
                speaker: message.data.speaker === 'participant' ? 'user' : 'ai',
                timestamp: message.timestamp || new Date().toISOString(),
                confidence: message.data.confidence,
              };
              
              // Buffer captions for transcript
              this.captionBuffer.push(caption);
              onCaption(caption);
              break;

            case 'application.ended':
              console.log('🏁 Tavus session ended');
              onMessage(message);
              break;

            case 'transcription_ready':
              console.log('📝 Transcription ready');
              onMessage(message);
              break;

            default:
              onMessage(message);
              break;
          }
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error);
          console.log('📄 Raw message data:', event.data);
          onError('Failed to parse WebSocket message');
        }
      };

      this.currentWebSocket.onerror = (error) => {
        console.error('❌ Tavus WebSocket error:', error);
        onError('WebSocket connection error - please check your internet connection');
      };

      this.currentWebSocket.onclose = (event) => {
        console.log('🔌 Tavus WebSocket closed:', event.code, event.reason);
        this.currentWebSocket = null;
        
        // Handle specific close codes
        if (event.code !== 1000 && event.code !== 1001) {
          onError(`WebSocket connection lost (${event.code})`);
        }
      };

    } catch (error) {
      console.error('💥 Failed to connect WebSocket:', error);
      onError(error instanceof Error ? error.message : 'WebSocket connection failed');
    }
  }

  /**
   * End the current session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      console.log('🏁 Ending Tavus session:', sessionId);

      // Close WebSocket first
      if (this.currentWebSocket) {
        console.log('🔌 Closing WebSocket connection...');
        this.currentWebSocket.close(1000, 'Session ended by user');
        this.currentWebSocket = null;
      }

      // Only call API if we have a valid session ID and it's not a mock
      if (sessionId && !ApiConfig.TAVUS.USE_MOCK_MODE) {
        try {
          // Use conversation endpoint for newer API
          const response = await fetch(`${this.apiUrl}/conversations/${sessionId}`, {
            method: 'DELETE',
            headers: {
              'x-api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            // Try legacy sessions endpoint as fallback
            const legacyResponse = await fetch(`${this.apiUrl}/sessions/${sessionId}`, {
              method: 'DELETE',
              headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
              },
            });
            
            if (!legacyResponse.ok) {
              const errorData = await legacyResponse.json().catch(() => ({}));
              console.warn(`Tavus end session warning: ${legacyResponse.status} - ${errorData.message || 'Unknown error'}`);
            }
          }

          console.log('✅ Tavus session ended via API');
        } catch (apiError) {
          console.warn('⚠️ Error calling Tavus end session API:', apiError);
          // Don't throw, session cleanup should continue
        }
      }

      // Clear caption buffer
      this.captionBuffer = [];
      
      console.log('✅ Tavus session cleanup completed');
    } catch (error) {
      console.error('💥 Error ending Tavus session:', error);
      // Don't throw, as the session is likely already ended
    }
  }

  /**
   * Get final transcript after session ends
   */
  async getFinalTranscript(sessionId: string): Promise<TavusTranscript> {
    try {
      console.log('📝 Fetching final transcript for session:', sessionId);

      const response = await fetch(`${this.apiUrl}/sessions/${sessionId}/captions/final`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tavus transcript API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const transcriptData = await response.json();
      
      // Process transcript data
      const transcript: TavusTranscript = {
        session_id: sessionId,
        captions: transcriptData.captions || this.captionBuffer,
        full_text: transcriptData.full_text || this.buildFullTextFromBuffer(),
        duration_seconds: transcriptData.duration_seconds || this.getSessionDuration(),
      };

      console.log('✅ Final transcript fetched successfully');
      return transcript;
    } catch (error) {
      console.error('💥 Failed to fetch transcript:', error);
      
      // Fallback to buffered captions if API fails
      return {
        session_id: sessionId,
        captions: this.captionBuffer,
        full_text: this.buildFullTextFromBuffer(),
        duration_seconds: this.getSessionDuration(),
      };
    }
  }

  /**
   * Generate session summary using Gemini
   */
  async generateSessionSummary(transcript: TavusTranscript): Promise<SessionSummary> {
    try {
      console.log('🤖 Generating session summary with Gemini...');

      const prompt = `${COACHING_SUMMARY_PROMPT}

**SESSION TRANSCRIPT:**
${transcript.full_text}

**SESSION METADATA:**
- Duration: ${transcript.duration_seconds} seconds
- Total exchanges: ${transcript.captions.length}

Please analyze this coaching session and provide a comprehensive summary in the required JSON format.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ApiConfig.GEMINI.API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!summaryText) {
        throw new Error('No summary generated');
      }

      // Extract JSON from response
      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON format in summary');
      }

      const summary: SessionSummary = JSON.parse(jsonMatch[0]);
      console.log('✅ Session summary generated successfully');
      
      return summary;
    } catch (error) {
      console.error('💥 Failed to generate summary:', error);
      
      // Fallback summary
      return {
        session_title: 'Coaching Session Summary',
        main_topic: 'Dog Training',
        urgency_level: 'low',
        key_points: ['Session completed successfully'],
        recommendations: ['Continue practicing the techniques discussed'],
        techniques_taught: ['Basic training methods'],
        next_steps: ['Practice daily', 'Monitor progress'],
        progress_notes: 'Initial coaching session completed.',
        follow_up_timeline: 'Check progress in 1 week',
      };
    }
  }

  /**
   * Build user metadata for session context
   */
  private buildUserMetadata(metadata: CoachingSessionMetadata): Record<string, any> {
    return {
      pet_name: metadata.pet_name || 'your dog',
      pet_breed: metadata.pet_breed,
      pet_age: metadata.pet_age,
      pet_weight: metadata.pet_weight,
      main_concern: metadata.issue || metadata.user_concern || 'general training',
      session_type: 'live_coaching',
    };
  }

  /**
   * Build personalized greeting for James
   */
  private buildGreeting(metadata: CoachingSessionMetadata): string {
    const petName = metadata.pet_name || 'your dog';
    const concern = metadata.issue || metadata.user_concern;
    
    let greeting = `Hi there! I'm James, your AI dog behavior specialist. Nice to meet you and ${petName}! 🐾`;
    
    if (concern) {
      greeting += ` I understand you'd like to work on ${concern} today. I'm here to help you both succeed!`;
    } else {
      greeting += ` I'm excited to help you and ${petName} with whatever training challenges you're facing today.`;
    }
    
    greeting += ` How are things going with ${petName} right now?`;
    
    return greeting;
  }

  /**
   * Build full text from caption buffer
   */
  private buildFullTextFromBuffer(): string {
    return this.captionBuffer
      .filter(caption => caption.is_final)
      .map(caption => `${caption.speaker.toUpperCase()}: ${caption.text}`)
      .join('\n');
  }

  /**
   * Get session duration in seconds
   */
  private getSessionDuration(): number {
    if (this.sessionStartTime === 0) return 0;
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  /**
   * Test API connectivity and validate configuration
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🧪 Testing Tavus API connection...');
      
      // Check configuration
      if (!this.apiKey || this.apiKey === 'your-tavus-api-key-here') {
        return {
          success: false,
          message: 'API key not configured',
          details: { step: 'config_check', issue: 'missing_api_key' }
        };
      }
      
      if (!this.personaId || this.personaId === 'james-vet-coach') {
        return {
          success: false,
          message: 'Persona ID not configured',
          details: { step: 'config_check', issue: 'missing_persona_id' }
        };
      }

      console.log('🔗 Testing basic network connectivity...');
      
      // First, test basic network connectivity
      try {
        const networkTest = await fetch('https://www.google.com', {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        console.log('✅ Basic network connectivity: OK');
      } catch (networkError) {
        console.error('❌ Basic network connectivity failed:', networkError);
        return {
          success: false,
          message: 'No internet connection',
          details: { 
            step: 'network_check', 
            issue: 'no_internet',
            error: networkError instanceof Error ? networkError.message : 'Unknown network error'
          }
        };
      }

      console.log('🔗 Testing Tavus API endpoint...');
      
      // Test if Tavus API endpoint is reachable
      try {
        const endpointTest = await fetch('https://tavusapi.com', {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000)
        });
        console.log('✅ Tavus API endpoint reachable');
      } catch (endpointError) {
        console.error('❌ Tavus API endpoint unreachable:', endpointError);
        return {
          success: false,
          message: 'Cannot reach Tavus API',
          details: { 
            step: 'endpoint_check', 
            issue: 'api_unreachable',
            error: endpointError instanceof Error ? endpointError.message : 'Unknown endpoint error'
          }
        };
      }

      console.log('🔑 Testing API authentication...');

      // Test API connection with authentication - use replicas endpoint for testing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await fetch(`${this.apiUrl}/replicas`, {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📥 Tavus API Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          ok: response.ok
        });

        if (response.ok) {
          const personaData = await response.json();
          console.log('✅ Persona data retrieved:', personaData);
          return {
            success: true,
            message: 'Connection successful',
            details: {
              api_url: this.apiUrl,
              persona_name: personaData.name || 'Unknown',
              persona_id: this.personaId,
              response_time: 'Good',
              status: response.status
            }
          };
        } else {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          console.error('❌ API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });

          if (response.status === 401) {
            return {
              success: false,
              message: 'Invalid API key - Authentication failed',
              details: { 
                step: 'auth_check', 
                status: response.status,
                api_key_preview: `${this.apiKey.substring(0, 8)}...`,
                error: errorText
              }
            };
          } else if (response.status === 404) {
            return {
              success: false,
              message: 'Persona not found - Check your Persona ID',
              details: { 
                step: 'persona_check', 
                status: response.status, 
                persona_id: this.personaId,
                error: errorText
              }
            };
          } else if (response.status === 403) {
            return {
              success: false,
              message: 'Access forbidden - Check your subscription',
              details: { 
                step: 'permission_check', 
                status: response.status,
                error: errorText
              }
            };
          } else {
            return {
              success: false,
              message: `API error: ${response.status} - ${response.statusText}`,
              details: { 
                step: 'api_check', 
                status: response.status,
                error: errorText
              }
            };
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        console.error('❌ Fetch Error Details:', {
          name: fetchError instanceof Error ? fetchError.name : 'Unknown',
          message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          cause: fetchError instanceof Error ? fetchError.cause : undefined
        });

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return {
            success: false,
            message: 'Connection timeout (15s) - Network or server issue',
            details: { 
              step: 'network_check', 
              issue: 'timeout',
              timeout_duration: '15 seconds'
            }
          };
        } else if (fetchError instanceof Error && (
          fetchError.message.includes('Failed to fetch') || 
          fetchError.message.includes('Network request failed') ||
          fetchError.message.includes('ERR_NETWORK') ||
          fetchError.message.includes('ERR_INTERNET_DISCONNECTED')
        )) {
          return {
            success: false,
            message: 'Network error - Check internet connection or firewall',
            details: { 
              step: 'network_check', 
              issue: 'connectivity',
              error: fetchError.message
            }
          };
        } else {
          return {
            success: false,
            message: `Connection error: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`,
            details: { 
              step: 'connection_error', 
              error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
            }
          };
        }
      }

    } catch (error) {
      console.error('💥 Unexpected test error:', error);
      return {
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
        details: { 
          step: 'unknown_error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.currentWebSocket) {
      this.currentWebSocket.close(1000, 'Client disconnect');
      this.currentWebSocket = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.currentWebSocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get buffered captions
   */
  getBufferedCaptions(): TavusCaption[] {
    return [...this.captionBuffer];
  }

  /**
   * Clear caption buffer
   */
  clearCaptionBuffer(): void {
    this.captionBuffer = [];
  }
}

export const tavusLiveService = new TavusLiveService(); 