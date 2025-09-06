import { ApiConfig } from '@/constants/apiConfig';
import { supabase } from './supabase';

interface TranscriptResponse {
  transcript?: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
  messages?: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
  captions?: Array<{
    text: string;
    speaker: string;
    timestamp: string;
  }>;
  status?: string;
}

interface ProcessedTranscript {
  formatted: string;
  messages: Array<{role: string, content: string}>;
  wordCount: number;
  duration: number;
}

export class TranscriptFetcher {
  private static instance: TranscriptFetcher;
  
  public static getInstance(): TranscriptFetcher {
    if (!TranscriptFetcher.instance) {
      TranscriptFetcher.instance = new TranscriptFetcher();
    }
    return TranscriptFetcher.instance;
  }

  /**
   * Main function: Fetch transcript after session ends
   * Call this immediately when session ends, it handles retries automatically
   */
  async fetchAndProcessTranscript(conversationId: string, retryCount = 0): Promise<{success: boolean, sessionId?: string, error?: string}> {
    console.log(`🎯 Starting transcript fetch for: ${conversationId} (attempt ${retryCount + 1})`);
    
    try {
      // Step 1: Try to fetch transcript immediately
      const transcriptData = await this.fetchTranscriptFromTavus(conversationId);
      
      if (transcriptData) {
        console.log('✅ Transcript available immediately');
        return await this.processAndSaveTranscript(conversationId, transcriptData);
      }
      
      // Step 2: If not available, schedule delayed retries
      if (retryCount < 3) {
        const delaySeconds = [30, 120, 300][retryCount]; // 30s, 2min, 5min
        console.log(`⏳ Transcript not ready, retrying in ${delaySeconds} seconds...`);
        
        setTimeout(() => {
          this.fetchAndProcessTranscript(conversationId, retryCount + 1);
        }, delaySeconds * 1000);
        
        // Create placeholder for now
        return await this.createPlaceholderSession(conversationId);
      }
      
      console.warn('⚠️ Transcript never became available after all retries');
      return { success: false, error: 'Transcript not available after retries' };
      
    } catch (error) {
      console.error('💥 Error in transcript fetch:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch transcript from Tavus API
   */
  private async fetchTranscriptFromTavus(conversationId: string): Promise<TranscriptResponse | null> {
    try {
      const apiKey = ApiConfig.TAVUS.API_KEY;
      
      if (!apiKey || apiKey === 'your-tavus-api-key-here') {
        console.error('❌ No valid Tavus API key configured');
        return null;
      }

      console.log('📡 Fetching transcript from Tavus API (verbose=true)...');
      
      const response = await fetch(
        `https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`,
        {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`📥 Tavus API response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ Tavus API error: ${response.status} - ${errorText}`);
        return null;
      }

      const data = await response.json();
      console.log('✅ Conversation data received');
      console.log('📄 Data structure:', Object.keys(data));
      
      // Check if transcript exists in the conversation data
      if (data.transcript) {
        console.log('🎉 Found transcript in conversation data!');
        return { transcript: data.transcript };
      } else {
        console.log('⏳ No transcript found in conversation data yet');
        console.log('📊 Available fields:', Object.keys(data));
        return null;
      }
      
    } catch (error) {
      console.error('💥 Error fetching from Tavus:', error);
      return null;
    }
  }

  /**
   * Process transcript data and save to database
   */
  private async processAndSaveTranscript(
    conversationId: string, 
    transcriptData: TranscriptResponse
  ): Promise<{success: boolean, sessionId?: string, error?: string}> {
    try {
      console.log('🔄 Processing transcript data...');
      
      // Extract messages from various possible formats
      let messages: Array<{role: string, content: string}> = [];
      
      if (transcriptData.transcript && Array.isArray(transcriptData.transcript)) {
        messages = transcriptData.transcript;
      } else if (transcriptData.messages && Array.isArray(transcriptData.messages)) {
        messages = transcriptData.messages;
      } else if (transcriptData.captions && Array.isArray(transcriptData.captions)) {
        messages = transcriptData.captions.map(caption => ({
          role: caption.speaker === 'participant' ? 'user' : 'ai',
          content: caption.text
        }));
      } else {
        console.warn('⚠️ Unexpected transcript format:', transcriptData);
        messages = [{ role: 'system', content: JSON.stringify(transcriptData) }];
      }

      // Format as readable transcript
      const formatted = messages
        .filter(msg => msg.content && msg.content.trim())
        .map(msg => {
          const speaker = msg.role === 'user' || msg.role === 'participant' ? 'USER' : 'DR_LUNA';
          return `${speaker}: ${msg.content}`;
        })
        .join('\n');

      const wordCount = formatted.split(' ').length;
      
      if (wordCount < 5) {
        console.warn('⚠️ Transcript too short, creating minimal session');
        return await this.createMinimalSession(conversationId, formatted);
      }

      // Generate summary
      const summary = await this.generateSummary(formatted);
      
      // Save to database
      const sessionData = {
        conversation_id: conversationId,
        transcript: formatted,
        summary: JSON.stringify(summary),
        session_title: summary.session_title || 'Coaching Session',
        main_topic: summary.main_topic || 'Dog Training',
        urgency_level: summary.urgency_level || 'low',
        key_points: summary.key_points || [],
        recommendations: summary.recommendations || [],
        techniques_taught: summary.techniques_taught || [],
        next_steps: summary.next_steps || [],
        progress_notes: summary.progress_notes || '',
        follow_up_timeline: summary.follow_up_timeline || '',
        status: 'completed',
        duration_seconds: Math.max(messages.length * 10, 60),
        created_at: new Date().toISOString(),
        raw_captions: messages,
      };

      // Check if session already exists (update) or create new
      const { data: existingSession } = await supabase
        .from('ai_coaching_sessions')
        .select('id')
        .eq('conversation_id', conversationId)
        .single();

      if (existingSession) {
        // Update existing session
        const { data: updatedSession, error } = await supabase
          .from('ai_coaching_sessions')
          .update(sessionData)
          .eq('conversation_id', conversationId)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating session:', error);
          return { success: false, error: error.message };
        }

        console.log('✅ Session updated with transcript:', updatedSession.id);
        return { success: true, sessionId: updatedSession.id };
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from('ai_coaching_sessions')
          .insert(sessionData)
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating session:', error);
          return { success: false, error: error.message };
        }

        console.log('✅ New session created with transcript:', newSession.id);
        return { success: true, sessionId: newSession.id };
      }
      
    } catch (error) {
      console.error('💥 Error processing transcript:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create placeholder session while waiting for transcript
   */
  private async createPlaceholderSession(conversationId: string): Promise<{success: boolean, sessionId?: string}> {
    try {
      const placeholderData = {
        conversation_id: conversationId,
        transcript: 'Transcript processing... This will be updated automatically.',
        summary: 'Session completed successfully. Transcript is being processed.',
        session_title: 'Coaching Session (Processing)',
        main_topic: 'Session in Progress',
        key_points: ['Session completed', 'Transcript processing'],
        recommendations: ['Check back in a few minutes for full transcript'],
        status: 'pending',
        duration_seconds: 0,
        created_at: new Date().toISOString(),
      };

      const { data: session, error } = await supabase
        .from('ai_coaching_sessions')
        .insert(placeholderData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating placeholder:', error);
        return { success: false };
      }

      console.log('✅ Placeholder session created:', session.id);
      return { success: true, sessionId: session.id };
      
    } catch (error) {
      console.error('💥 Error creating placeholder:', error);
      return { success: false };
    }
  }

  /**
   * Create minimal session for very short conversations
   */
  private async createMinimalSession(conversationId: string, transcript: string): Promise<{success: boolean, sessionId?: string}> {
    try {
      const minimalData = {
        conversation_id: conversationId,
        transcript: transcript || 'Very brief conversation',
        summary: 'Session was too short for detailed analysis.',
        session_title: 'Brief Coaching Session',
        main_topic: 'Quick Interaction',
        key_points: ['Very short session'],
        recommendations: ['Consider longer sessions for better coaching'],
        status: 'completed',
        duration_seconds: 30,
        created_at: new Date().toISOString(),
      };

      const { data: session, error } = await supabase
        .from('ai_coaching_sessions')
        .insert(minimalData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating minimal session:', error);
        return { success: false };
      }

      console.log('✅ Minimal session created:', session.id);
      return { success: true, sessionId: session.id };
      
    } catch (error) {
      console.error('💥 Error creating minimal session:', error);
      return { success: false };
    }
  }

  /**
   * Generate summary using Gemini AI
   */
  private async generateSummary(transcript: string) {
    try {
      console.log('🤖 Generating summary...');
      
      // Use same Gemini logic as webhook
      const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!geminiApiKey) {
        return this.getFallbackSummary();
      }

      const summaryPrompt = `Analyze this dog coaching session transcript and provide a comprehensive summary in JSON format.

TRANSCRIPT:
${transcript}

Please respond with ONLY a valid JSON object containing:
{
  "session_title": "Brief descriptive title",
  "main_topic": "Primary issue discussed",
  "urgency_level": "low|moderate|high",
  "key_points": ["Important points discussed"],
  "recommendations": ["Specific action items"],
  "techniques_taught": ["Training methods covered"],
  "next_steps": ["Follow-up actions"],
  "progress_notes": "Overall assessment",
  "follow_up_timeline": "When to check progress"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: summaryPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('❌ Gemini API error:', response.status);
        return this.getFallbackSummary();
      }

      const data = await response.json();
      const summaryText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!summaryText) {
        return this.getFallbackSummary();
      }

      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const summary = JSON.parse(jsonMatch[0]);
        console.log('✅ Summary generated successfully');
        return summary;
      } else {
        return this.getFallbackSummary();
      }

    } catch (error) {
      console.error('💥 Error generating summary:', error);
      return this.getFallbackSummary();
    }
  }

  /**
   * Fallback summary when AI generation fails
   */
  private getFallbackSummary() {
    return {
      session_title: 'Coaching Session Summary',
      main_topic: 'Dog Training Discussion',
      urgency_level: 'low',
      key_points: ['Session completed successfully'],
      recommendations: ['Continue practicing the discussed techniques'],
      techniques_taught: ['Various training methods'],
      next_steps: ['Practice regularly', 'Monitor progress'],
      progress_notes: 'Session completed successfully.',
      follow_up_timeline: 'Check progress in 1 week'
    };
  }

  /**
   * Manual transcript processing for existing sessions
   */
  async processExistingSessions(conversationIds: string[]) {
    console.log('🔧 Processing existing sessions:', conversationIds);
    
    const results = [];
    for (const conversationId of conversationIds) {
      try {
        const result = await this.fetchAndProcessTranscript(conversationId);
        results.push({ conversationId, ...result });
        console.log(`✅ Processed ${conversationId}:`, result.success ? 'SUCCESS' : 'FAILED');
      } catch (error) {
        console.error(`❌ Failed to process ${conversationId}:`, error);
        results.push({ conversationId, success: false, error: error.message });
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const transcriptFetcher = TranscriptFetcher.getInstance(); 