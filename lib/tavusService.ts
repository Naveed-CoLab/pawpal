import { ApiConfig } from '@/constants/apiConfig';
import { JAMES_COACHING_PROMPT, COACHING_SUMMARY_PROMPT } from '@/constants/prompts';
import { apiKeysService } from './apiKeysService';

export interface TavusSession {
  session_id: string;
  session_url: string;
  status: 'active' | 'completed' | 'error';
  created_at: string;
  persona_id: string;
  conversation_id?: string;
}

export interface TavusMessage {
  id: string;
  session_id: string;
  speaker_type: 'user' | 'ai';
  content: string;
  timestamp: string;
  confidence_score?: number;
  audio_url?: string;
}

export interface CoachingSessionData {
  pet_name?: string;
  pet_breed?: string;
  user_name?: string;
  user_concern?: string;
  session_duration?: number;
  key_topics?: string[];
}

export interface SessionSummary {
  session_title: string;
  main_topic: string;
  urgency_level: 'low' | 'medium' | 'high';
  key_points: string[];
  recommendations: string[];
  techniques_taught: string[];
  next_steps: string[];
  progress_notes: string;
  follow_up_timeline: string;
}

class TavusService {
  private baseUrl = ApiConfig.TAVUS.API_URL;
  private apiKey = ApiConfig.TAVUS.API_KEY;
  private useMockMode = ApiConfig.TAVUS.USE_MOCK_MODE;
  private sessionStartTime: number = 0;
  private sessionDuration: number = 0;
  private currentSessionData?: CoachingSessionData;

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Use mock mode if API key is not configured
    if (this.useMockMode) {
      console.log('🎭 Tavus: Using mock mode for:', endpoint);
      return this.getMockResponse(endpoint, options);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Tavus API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private getMockResponse(endpoint: string, options: RequestInit) {
    // Mock responses for demo
    if (endpoint === '/conversations' && options.method === 'POST') {
      return Promise.resolve({
        conversation_id: `mock_conversation_${Date.now()}`,
        session_id: `mock_session_${Date.now()}`,
        session_url: `https://demo.tavus.io/session/${Date.now()}`,
        status: 'active',
        created_at: new Date().toISOString(),
        persona_id: 'mock-luna-coach',
      });
    }

    if (endpoint.includes('/speak') && options.method === 'POST') {
      return Promise.resolve({
        id: `msg_${Date.now()}`,
        content: this.generateMockDrLunaResponse(this.currentSessionData?.user_name, this.currentSessionData?.pet_name),
        speaker_type: 'ai',
        timestamp: new Date().toISOString(),
        confidence_score: 0.95,
        audio_url: `https://demo.tavus.io/audio/${Date.now()}.mp3`,
      });
    }

    if (endpoint.includes('/end') && options.method === 'POST') {
      return Promise.resolve({
        status: 'completed',
        session_duration: this.sessionDuration,
        ended_at: new Date().toISOString(),
      });
    }

    return Promise.resolve({});
  }

  private generateMockDrLunaResponse(userName?: string, petName?: string): string {
    const userGreeting = userName || 'there';
    const dogGreeting = petName || 'your dog';
    
    const responses = [
      `Hi ${userGreeting}! I'm Luna, and I'm absolutely thrilled to meet you and ${dogGreeting} today! 🐾 Before we dive in, let's start with our Paw-some Progress Challenge - on a scale of 1-10, how would you rate ${dogGreeting}'s current behavior? Once I know that, I'll help you reach at least one level higher by the end of our session!`,
      `That's fantastic insight, ${userGreeting}! Here's something cool about dogs - they actually respond better when we break training into micro-wins. Let me show you a technique you can try with ${dogGreeting} RIGHT NOW. Are you ready to see some magic happen? On a scale of 1-10, how confident do you feel about trying this?`,
      `You're absolutely crushing this, ${userGreeting}! 🌟 I can see you really understand ${dogGreeting}. Here's what I want you to do next - practice this technique for 30 seconds right now while we're together. Let's turn this session into an interactive training moment! What do you think - are you up for the challenge?`,
      `Incredible progress, ${userGreeting}! I love your dedication to ${dogGreeting}'s success! 🐕 Here's a breed-specific tip that most people don't know - this technique works especially well because of ${dogGreeting}'s natural instincts. On a scale of 1-10, how excited are you to implement this at home?`,
      `You've made amazing strides today, ${userGreeting}! I challenge you and ${dogGreeting} to practice this technique twice a day this week. What would success look like for both of you by next week? I have a feeling you're going to absolutely nail this! 🚀`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async createCoachingSession(sessionData: CoachingSessionData): Promise<TavusSession> {
    try {
      console.log('🎥 Creating Tavus coaching session with Luna...');
      console.log('📋 TAVUS SERVICE DEBUG - Received sessionData:');
      console.log('- user_name:', `"${sessionData.user_name}"`);
      console.log('- pet_name:', `"${sessionData.pet_name}"`);
      this.sessionStartTime = Date.now();
      this.currentSessionData = sessionData;
      
      // Build context for Luna
      const context = this.buildSessionContext(sessionData);
      
      // Get persona ID from edge function
      const personaId = await apiKeysService.getApiKey('TAVUS_PERSONA_ID');
      console.log('🎭 Using persona ID from edge function:', personaId);

      const response = await this.makeRequest('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          persona_id: personaId,
          conversation_name: `Coaching Session - ${sessionData.user_concern || 'General Training'}`,
          context: context,
          properties: {
            voice_settings: {
              tone: 'friendly',
              pace: 'moderate',
              emotion: 'encouraging'
            },
            conversation_settings: {
              max_duration: 180, // 3 minutes
              auto_end_on_silence: 30, // 30 seconds
              enable_interruptions: true
            }
          }
        }),
      });

      console.log('✅ Tavus coaching session created successfully');
      return response;
    } catch (error) {
      console.error('💥 Error creating Tavus session:', error);
      throw error;
    }
  }

  private buildSessionContext(sessionData: CoachingSessionData): string {
    let context = JAMES_COACHING_PROMPT;
    
    console.log('🔄 CONTEXT BUILD DEBUG:');
    console.log('- sessionData.user_name:', `"${sessionData.user_name}"`);
    console.log('- Will replace [USER_NAME] with:', sessionData.user_name ? `"${sessionData.user_name}"` : '"there"');
    
    // Replace placeholders with actual names
    if (sessionData.user_name) {
      context = context.replace(/\[USER_NAME\]/g, sessionData.user_name);
      console.log('✅ Replaced [USER_NAME] with:', `"${sessionData.user_name}"`);
    } else {
      // Fallback to generic greeting if no user name provided
      context = context.replace(/\[USER_NAME\]/g, 'there');
      console.log('⚠️ No user_name, replaced [USER_NAME] with "there"');
    }
    
    if (sessionData.pet_name) {
      context = context.replace(/\[DOG_NAME\]/g, sessionData.pet_name);
    } else {
      // Fallback to generic dog reference if no pet name provided
      context = context.replace(/\[DOG_NAME\]/g, 'your dog');
    }
    
    // Add additional session context
    if (sessionData.pet_name || sessionData.pet_breed || sessionData.user_concern) {
      context += '\n\n**Session Context:**\n';
      
      if (sessionData.pet_name) {
        context += `- Dog's Name: ${sessionData.pet_name}\n`;
      }
      if (sessionData.pet_breed) {
        context += `- Breed: ${sessionData.pet_breed}\n`;
      }
      if (sessionData.user_concern) {
        context += `- Main Concern: ${sessionData.user_concern}\n`;
      }
      if (sessionData.user_name) {
        context += `- Owner's Name: ${sessionData.user_name}\n`;
      }
    }

    context += '\n\nStart the session with a warm greeting using their names and ask how you can help with their dog today!';
    
    return context;
  }

  async sendMessage(sessionId: string, message: string): Promise<TavusMessage> {
    try {
      console.log('📤 Sending message to Luna:', message);

      const response = await this.makeRequest(`/conversations/${sessionId}/speak`, {
        method: 'POST',
        body: JSON.stringify({
          text: message,
          stream: false,
          include_audio: true,
        }),
      });

      console.log('✅ Message sent to Luna successfully');
      return response;
    } catch (error) {
      console.error('💥 Error sending message to Luna:', error);
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<boolean> {
    try {
      console.log('🛑 Ending coaching session with Luna...');
      
      this.sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

      await this.makeRequest(`/conversations/${sessionId}/end`, {
        method: 'POST',
      });

      console.log('✅ Coaching session ended successfully');
      return true;
    } catch (error) {
      console.error('💥 Error ending session:', error);
      return false;
    }
  }

  async getSessionTranscript(sessionId: string): Promise<TavusMessage[]> {
    try {
      console.log('📜 Fetching session transcript...');

      // If using mock session, return mock transcript
      if (sessionId.startsWith('mock_session_')) {
        return this.createMockTranscript(sessionId);
      }

      const response = await this.makeRequest(`/conversations/${sessionId}/transcript`);
      
      console.log('✅ Transcript fetched successfully');
      return response.messages || [];
    } catch (error) {
      console.error('💥 Error fetching transcript:', error);
      return this.createMockTranscript(sessionId);
    }
  }

  private createMockTranscript(sessionId: string): TavusMessage[] {
    return [
      {
        id: 'msg_1',
        session_id: sessionId,
        speaker_type: 'ai',
        content: "Hi there! I'm Luna, and I'm absolutely thrilled to meet you and your dog today! 🐾 Before we dive into training, let's start with our Paw-some Progress Challenge - on a scale of 1-10, where would you rate your dog's current behavior right now?",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        confidence_score: 0.98,
      },
      {
        id: 'msg_2',
        session_id: sessionId,
        speaker_type: 'user',
        content: "Hi Luna! I'd say my dog is about a 3 right now - lots of pulling during walks.",
        timestamp: new Date(Date.now() - 240000).toISOString(),
      },
      {
        id: 'msg_3',
        session_id: sessionId,
        speaker_type: 'ai',
        content: "Perfect! A 3 gives us so much room to work with! My goal is to get you and your dog to at least a 5 or 6 by the end of our session. Here's something cool about your dog's pulling - it actually shows they're excited and engaged, which we can redirect! Can you show me how you currently attach your dog's leash? Let's make this interactive!",
        timestamp: new Date(Date.now() - 180000).toISOString(),
        confidence_score: 0.96,
      },
      {
        id: 'msg_4',
        session_id: sessionId,
        speaker_type: 'user',
        content: "Sure! I usually just clip it on and head straight out the door.",
        timestamp: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: 'msg_5',
        session_id: sessionId,
        speaker_type: 'ai',
        content: "Aha! That's our golden opportunity! 🌟 Here's your first game-changer technique: Before you even touch that leash, have your dog sit and make eye contact with you. Only clip the leash when they're calm and focused on you. On a scale of 1-10, how confident do you feel about trying this technique this week?",
        timestamp: new Date(Date.now() - 60000).toISOString(),
        confidence_score: 0.97,
      },
    ];
  }

  async generateSessionSummary(transcript: TavusMessage[]): Promise<SessionSummary> {
    try {
      console.log('📝 Generating coaching session summary...');

      // Prepare transcript for AI analysis
      const conversationText = transcript
        .map(msg => `${msg.speaker_type === 'user' ? 'Pet Parent' : 'Luna'}: ${msg.content}`)
        .join('\n\n');

      const prompt = `
${COACHING_SUMMARY_PROMPT}

Session Transcript:
${conversationText}

Focus on actionable advice and specific techniques Luna taught.
`;

      // Use Gemini API for summary generation
      const response = await fetch(`${ApiConfig.GEMINI.API_URL}?key=${ApiConfig.GEMINI.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      const summaryText = data.candidates[0].content.parts[0].text;
      
      // Clean and parse JSON response
      let cleanedResponse = summaryText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }

      const summary = JSON.parse(cleanedResponse);
      console.log('✅ Session summary generated successfully');
      return summary;
    } catch (error) {
      console.error('💥 Error generating summary:', error);
      return this.createFallbackSummary(transcript);
    }
  }

  private createFallbackSummary(transcript: TavusMessage[]): SessionSummary {
    // Extract basic information from transcript
    const userMessages = transcript.filter(msg => msg.speaker_type === 'user');
    const aiMessages = transcript.filter(msg => msg.speaker_type === 'ai');
    
    const mainTopic = this.extractMainTopic(userMessages);
    
    return {
      session_title: `Coaching with Luna - ${mainTopic}`,
      main_topic: mainTopic,
      urgency_level: 'low',
      key_points: [
        'Discussed specific training techniques with Luna',
        'Received personalized advice for pet behavior',
        'Learned step-by-step approach to training'
      ],
      recommendations: [
        'Practice the techniques Luna demonstrated daily',
        'Be consistent with the training approach',
        'Stay patient and positive during training sessions'
      ],
      techniques_taught: [
        'Positive reinforcement training',
        'Clear communication techniques',
        'Consistency in command delivery'
      ],
      next_steps: [
        'Implement Luna\'s recommendations this week',
        'Practice daily training sessions',
        'Monitor progress and adjust as needed'
      ],
      progress_notes: 'Pet parent is motivated and has clear action steps from Luna.',
      follow_up_timeline: 'Check progress in 1-2 weeks, schedule follow-up if needed'
    };
  }

  private extractMainTopic(userMessages: TavusMessage[]): string {
    const allText = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
    
    if (allText.includes('leash') || allText.includes('pull')) return 'leash training';
    if (allText.includes('bark')) return 'barking behavior';
    if (allText.includes('sit') || allText.includes('command')) return 'basic commands';
    if (allText.includes('potty') || allText.includes('house')) return 'house training';
    if (allText.includes('anxiety') || allText.includes('stress')) return 'anxiety management';
    if (allText.includes('jump')) return 'jumping behavior';
    if (allText.includes('bite') || allText.includes('nip')) return 'bite inhibition';
    
    return 'general training';
  }

  getSessionDuration(): number {
    return this.sessionDuration;
  }

  isSessionActive(): boolean {
    return this.sessionStartTime > 0 && this.sessionDuration === 0;
  }
}

export const tavusService = new TavusService();
