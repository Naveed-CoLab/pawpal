import { ApiConfig } from '@/constants/apiConfig';
import { JAMES_COACHING_PROMPT, COACHING_SUMMARY_PROMPT } from '@/constants/prompts';

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
  private personaId = ApiConfig.TAVUS.PERSONA_ID;
  private useMockMode = ApiConfig.TAVUS.USE_MOCK_MODE;
  private sessionStartTime: number = 0;
  private sessionDuration: number = 0;

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
        persona_id: this.personaId,
      });
    }

    if (endpoint.includes('/speak') && options.method === 'POST') {
      return Promise.resolve({
        id: `msg_${Date.now()}`,
        content: this.generateMockJamesResponse(),
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

  private generateMockJamesResponse(): string {
    const responses = [
      "Hi there! I'm James, and I'm so excited to help you and your furry friend today! 🐶 What's your dog's name, and what would you like to work on together?",
      "That's a great question! Let me help you with that. First, can you tell me a bit more about when this behavior usually happens? Understanding the context will help me give you the best advice.",
      "Perfect! I can definitely help with that. Here's what I want you to try: start with small steps and be really consistent. Dogs learn best when we're patient and clear with our expectations. Does that make sense so far?",
      "You're doing such a great job asking the right questions! 🐾 Let's break this down into simple steps you can practice today. Remember, every dog learns at their own pace, so don't worry if it takes some time.",
      "Excellent progress! I can tell you really care about your dog's wellbeing. Here are your key takeaways for this week: practice daily, stay positive, and remember that consistency is everything. You've got this!",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async createCoachingSession(sessionData: CoachingSessionData): Promise<TavusSession> {
    try {
      console.log('🎥 Creating Tavus coaching session with James...');
      this.sessionStartTime = Date.now();
      
      // Build context for James
      const context = this.buildSessionContext(sessionData);
      
      const response = await this.makeRequest('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          persona_id: this.personaId,
          conversation_name: `Coaching Session - ${sessionData.user_concern || 'General Training'}`,
          context: context,
          properties: {
            voice_settings: {
              tone: 'friendly',
              pace: 'moderate',
              emotion: 'encouraging'
            },
            conversation_settings: {
              max_duration: ApiConfig.TAVUS.SESSION_MAX_DURATION,
              auto_end_on_silence: ApiConfig.TAVUS.AUTO_END_ON_SILENCE,
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
    }

    context += '\n\nStart the session with a warm greeting and ask how you can help with their dog today!';
    
    return context;
  }

  async sendMessage(sessionId: string, message: string): Promise<TavusMessage> {
    try {
      console.log('📤 Sending message to James:', message);

      const response = await this.makeRequest(`/conversations/${sessionId}/speak`, {
        method: 'POST',
        body: JSON.stringify({
          text: message,
          stream: false,
          include_audio: true,
        }),
      });

      console.log('✅ Message sent to James successfully');
      return response;
    } catch (error) {
      console.error('💥 Error sending message to James:', error);
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<boolean> {
    try {
      console.log('🛑 Ending coaching session with James...');
      
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
        content: "Hi there! I'm James, and I'm so excited to help you and your furry friend today! 🐶 What's your dog's name, and what would you like to work on together?",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        confidence_score: 0.98,
      },
      {
        id: 'msg_2',
        session_id: sessionId,
        speaker_type: 'user',
        content: "Hi James! My dog's name is Max and he keeps pulling on the leash during walks.",
        timestamp: new Date(Date.now() - 240000).toISOString(),
      },
      {
        id: 'msg_3',
        session_id: sessionId,
        speaker_type: 'ai',
        content: "Hi Max! 🐾 And hello to Max's wonderful parent! Leash pulling is such a common challenge, and I'm here to help you both. Can you tell me - does Max pull from the very start of the walk, or does it happen when he sees something exciting like other dogs or squirrels?",
        timestamp: new Date(Date.now() - 180000).toISOString(),
        confidence_score: 0.96,
      },
      {
        id: 'msg_4',
        session_id: sessionId,
        speaker_type: 'user',
        content: "He pulls right from the start, as soon as we step outside.",
        timestamp: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: 'msg_5',
        session_id: sessionId,
        speaker_type: 'ai',
        content: "Perfect! That tells me Max is just super excited about his walk - which is actually a good thing! 🐶 Here's what we're going to do: Before you even put the leash on, have Max sit and wait. Only attach the leash when he's calm. Then, the moment he pulls, stop walking completely. Don't move forward until the leash is loose again. Does that make sense?",
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
        .map(msg => `${msg.speaker_type === 'user' ? 'Pet Parent' : 'James'}: ${msg.content}`)
        .join('\n\n');

      const prompt = `
${COACHING_SUMMARY_PROMPT}

Session Transcript:
${conversationText}

Focus on actionable advice and specific techniques James taught.
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
      session_title: `Coaching with James - ${mainTopic}`,
      main_topic: mainTopic,
      urgency_level: 'low',
      key_points: [
        'Discussed specific training techniques with James',
        'Received personalized advice for pet behavior',
        'Learned step-by-step approach to training'
      ],
      recommendations: [
        'Practice the techniques James demonstrated daily',
        'Be consistent with the training approach',
        'Stay patient and positive during training sessions'
      ],
      techniques_taught: [
        'Positive reinforcement training',
        'Clear communication techniques',
        'Consistency in command delivery'
      ],
      next_steps: [
        'Implement James\'s recommendations this week',
        'Practice daily training sessions',
        'Monitor progress and adjust as needed'
      ],
      progress_notes: 'Pet parent is motivated and has clear action steps from James.',
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