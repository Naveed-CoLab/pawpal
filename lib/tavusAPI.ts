import { ApiConfig, COACHING_SYSTEM_PROMPT, COACHING_SUMMARY_PROMPT } from '@/constants/geminiapiconfig';

export interface TavusSession {
  session_id: string;
  session_url: string;
  status: 'active' | 'ended' | 'error';
  persona_id: string;
  created_at: string;
}

export interface TavusMessage {
  message_id: string;
  session_id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface CoachingTip {
  id: string;
  type: 'technique' | 'encouragement' | 'correction' | 'next_step';
  content: string;
  priority: 'low' | 'medium' | 'high';
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

class TavusAPIService {
  private baseUrl = ApiConfig.TAVUS.API_URL;
  private apiKey = ApiConfig.TAVUS.API_KEY;

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
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

  async createCoachingSession(
    topic?: string,
    petName?: string,
    petBreed?: string,
    userContext?: string
  ): Promise<TavusSession> {
    try {
      console.log('🎥 Creating Tavus coaching session...');

      // If API key is not configured, return mock session
      if (this.apiKey === 'your-tavus-api-key-here' || !this.apiKey) {
        console.log('🔄 Using mock Tavus session - API key not configured');
        return this.createMockSession(topic);
      }

      const sessionPrompt = this.buildSessionPrompt(topic, petName, petBreed, userContext);

      const response = await this.makeRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          persona_id: ApiConfig.TAVUS.PERSONA_ID,
          context: sessionPrompt,
          settings: {
            voice_settings: {
              tone: 'friendly',
              pace: 'moderate',
              emotion: 'encouraging'
            },
            video_settings: {
              background: 'veterinary_office',
              lighting: 'professional'
            }
          }
        }),
      });

      console.log('✅ Tavus coaching session created successfully');
      return response;
    } catch (error) {
      console.error('💥 Error creating Tavus session:', error);
      // Fallback to mock session
      return this.createMockSession(topic);
    }
  }

  private createMockSession(topic?: string): TavusSession {
    return {
      session_id: `mock_session_${Date.now()}`,
      session_url: `https://mock-tavus-session.com/session/${Date.now()}`,
      status: 'active',
      persona_id: 'james-vet-coach',
      created_at: new Date().toISOString(),
    };
  }

  private buildSessionPrompt(
    topic?: string,
    petName?: string,
    petBreed?: string,
    userContext?: string
  ): string {
    let prompt = COACHING_SYSTEM_PROMPT;

    if (topic || petName || petBreed || userContext) {
      prompt += '\n\n**Session Context:**\n';
      
      if (petName) prompt += `- Pet Name: ${petName}\n`;
      if (petBreed) prompt += `- Pet Breed: ${petBreed}\n`;
      if (topic) prompt += `- Main Topic: ${topic}\n`;
      if (userContext) prompt += `- Additional Context: ${userContext}\n`;
    }

    prompt += '\n\nBegin the session with a warm greeting and ask how you can help with their dog today!';
    
    return prompt;
  }

  async sendMessage(
    sessionId: string,
    message: string,
    messageType: 'text' | 'audio' = 'text'
  ): Promise<TavusMessage> {
    try {
      console.log('📤 Sending message to Tavus session:', sessionId);

      // If using mock session, return mock response
      if (sessionId.startsWith('mock_session_')) {
        return this.createMockMessage(sessionId, message);
      }

      const response = await this.makeRequest(`/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: message,
          type: messageType,
          timestamp: new Date().toISOString(),
        }),
      });

      console.log('✅ Message sent successfully');
      return response;
    } catch (error) {
      console.error('💥 Error sending message to Tavus:', error);
      // Fallback to mock response
      return this.createMockMessage(sessionId, message);
    }
  }

  private createMockMessage(sessionId: string, userMessage: string): TavusMessage {
    // Generate a realistic coaching response based on the user's message
    const mockResponses = this.generateMockCoachingResponse(userMessage);
    
    return {
      message_id: `mock_msg_${Date.now()}`,
      session_id: sessionId,
      sender: 'ai',
      content: mockResponses.response,
      timestamp: new Date().toISOString(),
      metadata: {
        coaching_tips: mockResponses.tips,
        confidence: 0.9,
      },
    };
  }

  private generateMockCoachingResponse(userMessage: string): { response: string; tips: CoachingTip[] } {
    const message = userMessage.toLowerCase();
    
    if (message.includes('leash') || message.includes('pulling')) {
      return {
        response: "Great question about leash training! 🐕 Let's work on this together. First, I want you to hold the leash with a relaxed grip about 6 inches from your dog's collar. When your dog starts to pull, stop walking immediately and wait for them to look back at you. The moment they do, say 'Good!' and continue walking. This teaches them that pulling stops the fun, but checking in with you keeps it going. How does your dog typically react when you stop during walks?",
        tips: [
          {
            id: '1',
            type: 'technique',
            content: 'Stop immediately when pulling starts',
            priority: 'high'
          },
          {
            id: '2',
            type: 'encouragement',
            content: 'Reward the moment they look back at you',
            priority: 'high'
          }
        ]
      };
    }
    
    if (message.includes('bark') || message.includes('barking')) {
      return {
        response: "Barking can definitely be challenging! 🔊 Let's identify what's triggering the barking first. Is your dog barking at people passing by, other dogs, or when left alone? For most barking, we'll use the 'quiet' command. When your dog barks, calmly say 'Quiet' once, then wait. The moment they stop barking, even for a second, immediately reward with a treat and praise. Never yell 'quiet' - that just adds to the noise! What situations trigger your dog's barking the most?",
        tips: [
          {
            id: '1',
            type: 'technique',
            content: 'Say "Quiet" calmly, only once',
            priority: 'high'
          },
          {
            id: '2',
            type: 'correction',
            content: 'Never yell - it reinforces the barking',
            priority: 'medium'
          }
        ]
      };
    }
    
    if (message.includes('sit') || message.includes('basic') || message.includes('command')) {
      return {
        response: "Perfect! Let's master the 'sit' command - it's the foundation for everything else! 🪑 Hold a treat close to your dog's nose, then slowly lift it over their head. As their head follows the treat, their bottom will naturally touch the ground. The moment it does, say 'Sit!' and give the treat with lots of praise. Practice this 5-10 times per day in short sessions. Your dog will learn that sitting gets them good things! How familiar is your dog with basic commands already?",
        tips: [
          {
            id: '1',
            type: 'technique',
            content: 'Lure with treat over the head',
            priority: 'high'
          },
          {
            id: '2',
            type: 'next_step',
            content: 'Practice 5-10 times daily in short sessions',
            priority: 'medium'
          }
        ]
      };
    }
    
    // Default response for general questions
    return {
      response: "I'm here to help you and your furry friend! 🐾 That's a great question. Every dog is unique, so let's work together to find the best approach for your specific situation. Can you tell me a bit more about your dog's age, breed, and the specific behavior you'd like to work on? The more details you share, the better I can tailor my coaching to help you both succeed! What's your main goal for today's session?",
      tips: [
        {
          id: '1',
          type: 'encouragement',
          content: 'Every dog learns at their own pace',
          priority: 'low'
        },
        {
          id: '2',
          type: 'next_step',
          content: 'Share specific details for personalized advice',
          priority: 'medium'
        }
      ]
    };
  }

  async endSession(sessionId: string): Promise<boolean> {
    try {
      console.log('🛑 Ending Tavus session:', sessionId);

      // If using mock session, just return success
      if (sessionId.startsWith('mock_session_')) {
        console.log('✅ Mock session ended successfully');
        return true;
      }

      await this.makeRequest(`/sessions/${sessionId}/end`, {
        method: 'POST',
      });

      console.log('✅ Tavus session ended successfully');
      return true;
    } catch (error) {
      console.error('💥 Error ending Tavus session:', error);
      return false;
    }
  }

  async getSessionTranscript(sessionId: string): Promise<TavusMessage[]> {
    try {
      console.log('📜 Fetching session transcript:', sessionId);

      // If using mock session, return mock transcript
      if (sessionId.startsWith('mock_session_')) {
        return this.createMockTranscript(sessionId);
      }

      const response = await this.makeRequest(`/sessions/${sessionId}/transcript`);
      
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
        message_id: 'msg_1',
        session_id: sessionId,
        sender: 'ai',
        content: "Hello! I'm James, your VetPaw coaching assistant. I'm excited to help you and your furry friend today! What would you like to work on?",
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
      {
        message_id: 'msg_2',
        session_id: sessionId,
        sender: 'user',
        content: "Hi James! My dog keeps pulling on the leash during walks.",
        timestamp: new Date(Date.now() - 240000).toISOString(),
      },
      {
        message_id: 'msg_3',
        session_id: sessionId,
        sender: 'ai',
        content: "That's a very common challenge! Let's work on teaching your dog that pulling stops the fun. When your dog pulls, stop walking immediately and wait for them to look back at you...",
        timestamp: new Date(Date.now() - 180000).toISOString(),
      },
    ];
  }

  async generateSessionSummary(transcript: TavusMessage[]): Promise<SessionSummary> {
    try {
      console.log('📝 Generating session summary...');

      // Prepare transcript for Gemini
      const conversationText = transcript
        .map(msg => `${msg.sender === 'user' ? 'Pet Parent' : 'Coach James'}: ${msg.content}`)
        .join('\n\n');

      const prompt = `${COACHING_SUMMARY_PROMPT}\n\nSession Transcript:\n${conversationText}\n\nGenerate a comprehensive summary in the required JSON format.`;

      // Use Gemini to generate summary
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
      console.error('💥 Error generating session summary:', error);
      return this.createFallbackSummary(transcript);
    }
  }

  private createFallbackSummary(transcript: TavusMessage[]): SessionSummary {
    // Extract basic information from transcript
    const userMessages = transcript.filter(msg => msg.sender === 'user');
    const aiMessages = transcript.filter(msg => msg.sender === 'ai');
    
    const mainTopic = this.extractMainTopic(userMessages);
    
    return {
      session_title: `Coaching Session - ${mainTopic}`,
      main_topic: mainTopic,
      urgency_level: 'low',
      key_points: [
        'Discussed training techniques and behavioral guidance',
        'Provided personalized advice for pet care',
        'Established clear action steps for improvement'
      ],
      recommendations: [
        'Practice the techniques discussed daily',
        'Be consistent with training approach',
        'Monitor progress and adjust as needed'
      ],
      techniques_taught: [
        'Positive reinforcement training',
        'Clear communication with your pet',
        'Patience and consistency in training'
      ],
      next_steps: [
        'Implement the discussed techniques',
        'Schedule follow-up session if needed',
        'Track progress over the next week'
      ],
      progress_notes: 'Pet parent is motivated and ready to implement new training strategies.',
      follow_up_timeline: 'Check progress in 1-2 weeks'
    };
  }

  private extractMainTopic(userMessages: TavusMessage[]): string {
    const allText = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
    
    if (allText.includes('leash') || allText.includes('pull')) return 'leash training';
    if (allText.includes('bark')) return 'barking behavior';
    if (allText.includes('sit') || allText.includes('command')) return 'basic commands';
    if (allText.includes('potty') || allText.includes('house')) return 'house training';
    if (allText.includes('anxiety') || allText.includes('stress')) return 'anxiety management';
    
    return 'general training';
  }
}

export const tavusAPI = new TavusAPIService();