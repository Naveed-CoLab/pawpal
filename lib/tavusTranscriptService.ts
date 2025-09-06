import { supabase } from './supabase';
import { ApiConfig } from '../constants/apiConfig';

interface TavusConversation {
  id: string;
  status: string;
  captions?: Array<{
    text: string;
    speaker: string;
    timestamp: string;
    is_final?: boolean;
  }>;
  metadata?: any;
  created_at: string;
  ended_at?: string;
}

interface SessionSummary {
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

export class TavusTranscriptService {
  private static instance: TavusTranscriptService;
  
  public static getInstance(): TavusTranscriptService {
    if (!TavusTranscriptService.instance) {
      TavusTranscriptService.instance = new TavusTranscriptService();
    }
    return TavusTranscriptService.instance;
  }

  /**
   * Process conversation transcript after a session ends
   * Call this from your coaching session completion flow
   */
  async processConversationTranscript(conversationId: string, retryCount = 0): Promise<void> {
    try {
      console.log('🎯 Processing transcript for conversation:', conversationId);

      // Wait for Tavus to process the conversation (retry logic for async processing)
      const maxRetries = 3;
      const conversation = await this.fetchConversationWithRetry(conversationId, maxRetries);
      
      if (!conversation) {
        console.warn('⚠️ Could not fetch conversation data');
        return;
      }

      // Extract and build transcript
      const transcript = this.buildTranscript(conversation.captions || []);
      console.log(`📄 Transcript length: ${transcript.length} characters`);

      if (transcript.length < 50) {
        console.warn('⚠️ Transcript too short, saving minimal session');
        await this.saveMinimalSession(conversationId, transcript);
        return;
      }

      // Generate summary using Gemini
      const summary = await this.generateSummary(transcript);
      
      // Calculate session duration
      const duration = this.calculateDuration(conversation.captions || []);

      // Save complete session to Supabase
      await this.saveCompleteSession(conversationId, transcript, summary, duration, conversation);
      
      console.log('✅ Transcript processing completed successfully');

    } catch (error) {
      console.error('💥 Error processing transcript:', error);
      
      // Retry logic
      if (retryCount < 2) {
        console.log(`🔄 Retrying transcript processing (attempt ${retryCount + 1})`);
        setTimeout(() => {
          this.processConversationTranscript(conversationId, retryCount + 1);
        }, 5000 * (retryCount + 1)); // Exponential backoff
      }
    }
  }

  /**
   * Fetch conversation with retry logic (Tavus needs time to process)
   */
  private async fetchConversationWithRetry(conversationId: string, maxRetries: number): Promise<TavusConversation | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`📡 Fetching conversation (attempt ${attempt + 1}/${maxRetries})`);
        
        const response = await fetch(
          `https://tavusapi.com/v2/conversations/${conversationId}?include_captions=1`,
          {
            headers: {
              'x-api-key': ApiConfig.TAVUS.API_KEY,
              'Content-Type': 'application/json',
            }
          }
        );

        if (!response.ok) {
          console.warn(`⚠️ Tavus API error: ${response.status}`);
          
          // If it's a 404, the conversation might not be ready yet
          if (response.status === 404 && attempt < maxRetries - 1) {
            console.log('⏳ Conversation not ready, waiting...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            continue;
          }
          
          throw new Error(`Tavus API error: ${response.status}`);
        }

        const conversationData = await response.json();
        
        // Check if captions are available
        if (!conversationData.captions || conversationData.captions.length === 0) {
          if (attempt < maxRetries - 1) {
            console.log('⏳ Captions not ready, waiting...');
            await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
            continue;
          }
        }

        console.log('✅ Conversation data retrieved');
        return conversationData;

      } catch (error) {
        console.error(`❌ Attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
        }
      }
    }

    return null;
  }

  /**
   * Build formatted transcript from captions
   */
  private buildTranscript(captions: Array<any>): string {
    return captions
      .filter(caption => caption.text && caption.text.trim())
      .map(caption => {
        const speaker = caption.speaker === 'participant' ? 'USER' : 'DR_LUNA';
        return `${speaker}: ${caption.text}`;
      })
      .join('\n');
  }

  /**
   * Generate session summary using Gemini AI
   */
  private async generateSummary(transcript: string): Promise<SessionSummary> {
    try {
      console.log('🤖 Generating summary with Gemini...');
      
      if (!ApiConfig.GEMINI.API_KEY || ApiConfig.GEMINI.USE_FALLBACK_RESPONSES) {
        console.warn('⚠️ Gemini not configured, using fallback summary');
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ApiConfig.GEMINI.API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: summaryPrompt }]
            }],
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
        console.warn('⚠️ No summary from Gemini');
        return this.getFallbackSummary();
      }

      // Extract JSON from response
      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const summary = JSON.parse(jsonMatch[0]);
        console.log('✅ Summary generated successfully');
        return summary;
      } else {
        console.warn('⚠️ No valid JSON in Gemini response');
        return this.getFallbackSummary();
      }

    } catch (error) {
      console.error('💥 Error generating summary:', error);
      return this.getFallbackSummary();
    }
  }

  /**
   * Fallback summary when Gemini is unavailable
   */
  private getFallbackSummary(): SessionSummary {
    return {
      session_title: 'Coaching Session Summary',
      main_topic: 'Dog Training Discussion',
      urgency_level: 'low',
      key_points: ['Session completed successfully'],
      recommendations: ['Continue practicing the discussed techniques'],
      techniques_taught: ['Various training methods'],
      next_steps: ['Practice regularly', 'Monitor progress'],
      progress_notes: 'Session completed. Detailed analysis requires Gemini API.',
      follow_up_timeline: 'Check progress in 1 week'
    };
  }

  /**
   * Calculate session duration from captions
   */
  private calculateDuration(captions: Array<any>): number {
    if (captions.length === 0) return 0;
    
    try {
      const startTime = new Date(captions[0]?.timestamp || new Date()).getTime();
      const endTime = new Date(captions[captions.length - 1]?.timestamp || new Date()).getTime();
      return Math.floor((endTime - startTime) / 1000);
    } catch {
      return 0;
    }
  }

  /**
   * Save minimal session data
   */
  private async saveMinimalSession(conversationId: string, transcript: string): Promise<void> {
    const { error } = await supabase
      .from('ai_coaching_sessions')
      .insert({
        conversation_id: conversationId,
        transcript: transcript || 'No transcript available',
        summary: 'Session was too short to generate a meaningful summary.',
        session_title: 'Brief Coaching Session',
        main_topic: 'Quick conversation',
        key_points: ['Session completed'],
        recommendations: ['Continue practicing'],
        status: 'completed',
        duration_seconds: 0,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ Error saving minimal session:', error);
      throw error;
    }

    console.log('✅ Minimal session saved');
  }

  /**
   * Save complete session data with transcript and summary
   */
  private async saveCompleteSession(
    conversationId: string, 
    transcript: string, 
    summary: SessionSummary, 
    duration: number,
    conversationData: TavusConversation
  ): Promise<void> {
    const sessionData = {
      conversation_id: conversationId,
      transcript,
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
      duration_seconds: duration,
      created_at: new Date().toISOString(),
      // Store raw data for debugging
      raw_conversation_data: conversationData,
      raw_captions: conversationData.captions || [],
    };

    const { data: sessionRecord, error } = await supabase
      .from('ai_coaching_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving complete session:', error);
      throw error;
    }

    console.log('✅ Complete session saved:', sessionRecord.id);
  }

  /**
   * Get recent sessions for history display
   */
  async getRecentSessions(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('ai_coaching_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error in getRecentSessions:', error);
      return [];
    }
  }

  /**
   * Check if a conversation has already been processed
   */
  async isConversationProcessed(conversationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('ai_coaching_sessions')
        .select('id')
        .eq('conversation_id', conversationId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const transcriptService = TavusTranscriptService.getInstance(); 