import { ApiConfig } from '@/constants/apiConfig';
import { supabase } from './supabase';

/**
 * Polling-based transcript service
 * Alternative to webhooks when Tavus webhooks aren't working
 */
export class TavusPollingService {
  private static instance: TavusPollingService;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  public static getInstance(): TavusPollingService {
    if (!TavusPollingService.instance) {
      TavusPollingService.instance = new TavusPollingService();
    }
    return TavusPollingService.instance;
  }

  /**
   * Start polling for transcript after session ends
   */
  async startPollingForTranscript(conversationId: string): Promise<void> {
    console.log('🔄 Starting transcript polling for:', conversationId);
    
    // Don't poll if already polling
    if (this.pollingIntervals.has(conversationId)) {
      console.log('⚠️ Already polling for:', conversationId);
      return;
    }

    // Start polling immediately, then every 30 seconds
    this.pollTranscript(conversationId);
    
    const interval = setInterval(() => {
      this.pollTranscript(conversationId);
    }, 30000); // Poll every 30 seconds

    this.pollingIntervals.set(conversationId, interval);

    // Stop polling after 10 minutes (20 attempts)
    setTimeout(() => {
      this.stopPolling(conversationId);
      console.log('⏰ Stopped polling for transcript after 10 minutes:', conversationId);
    }, 600000);
  }

  /**
   * Stop polling for a specific conversation
   */
  stopPolling(conversationId: string): void {
    const interval = this.pollingIntervals.get(conversationId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(conversationId);
      console.log('🛑 Stopped polling for:', conversationId);
    }
  }

  /**
   * Poll for transcript once
   */
  private async pollTranscript(conversationId: string): Promise<void> {
    try {
      console.log('📡 Polling for transcript:', conversationId);

      const apiKey = ApiConfig.TAVUS.API_KEY;
      if (!apiKey || apiKey === 'your-tavus-api-key-here') {
        console.error('❌ No Tavus API key configured');
        this.stopPolling(conversationId);
        return;
      }

      // Fetch conversation with verbose=true to get transcript
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

      if (!response.ok) {
        console.error(`❌ Polling failed: ${response.status}`);
        if (response.status === 404) {
          console.log('❌ Conversation not found, stopping polling');
          this.stopPolling(conversationId);
        }
        return;
      }

      const data = await response.json();
      
      // Check if transcript exists
      if (data.transcript && Array.isArray(data.transcript) && data.transcript.length > 0) {
        console.log('🎉 Transcript found via polling!', data.transcript.length, 'messages');
        
        // Process and save transcript
        await this.processTranscript(conversationId, data.transcript);
        
        // Stop polling - we got the transcript
        this.stopPolling(conversationId);
        
      } else {
        console.log('⏳ Transcript not ready yet, will retry...');
      }

    } catch (error) {
      console.error('💥 Polling error:', error);
    }
  }

  /**
   * Process and save transcript to database
   */
  private async processTranscript(conversationId: string, transcript: any[]): Promise<void> {
    try {
      console.log('🔄 Processing polled transcript...');

      // Format transcript
      const formatted = transcript
        .filter(msg => msg.content && msg.content.trim())
        .map(msg => {
          const speaker = msg.role === 'user' || msg.role === 'participant' ? 'USER' : 'DR_LUNA';
          return `${speaker}: ${msg.content}`;
        })
        .join('\n');

      if (!formatted || formatted.length < 20) {
        console.warn('⚠️ Transcript too short, skipping');
        return;
      }

      // Generate summary
      const summary = await this.generateSummary(formatted);

      // Save to database
      const sessionData = {
        conversation_id: conversationId,
        transcript: formatted,
        summary: JSON.stringify(summary),
        session_title: summary.session_title || 'Coaching Session (Polled)',
        main_topic: summary.main_topic || 'Dog Training',
        urgency_level: summary.urgency_level || 'low',
        key_points: summary.key_points || [],
        recommendations: summary.recommendations || [],
        techniques_taught: summary.techniques_taught || [],
        next_steps: summary.next_steps || [],
        progress_notes: summary.progress_notes || 'Transcript retrieved via polling',
        follow_up_timeline: summary.follow_up_timeline || '',
        status: 'completed',
        duration_seconds: Math.max(transcript.length * 10, 60),
        created_at: new Date().toISOString(),
        raw_captions: transcript,
      };

      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('ai_coaching_sessions')
        .select('id')
        .eq('conversation_id', conversationId)
        .single();

      if (existingSession) {
        // Update existing session
        const { error } = await supabase
          .from('ai_coaching_sessions')
          .update(sessionData)
          .eq('conversation_id', conversationId);

        if (error) {
          console.error('❌ Error updating session:', error);
        } else {
          console.log('✅ Session updated with polled transcript');
        }
      } else {
        // Create new session
        const { error } = await supabase
          .from('ai_coaching_sessions')
          .insert(sessionData);

        if (error) {
          console.error('❌ Error creating session:', error);
        } else {
          console.log('✅ New session created with polled transcript');
        }
      }

    } catch (error) {
      console.error('💥 Error processing polled transcript:', error);
    }
  }

  /**
   * Generate summary using Gemini
   */
  private async generateSummary(transcript: string) {
    try {
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
        return this.getFallbackSummary();
      }

      const data = await response.json();
      const summaryText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!summaryText) {
        return this.getFallbackSummary();
      }

      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
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
      session_title: 'Coaching Session (Polled)',
      main_topic: 'Dog Training Discussion',
      urgency_level: 'low',
      key_points: ['Session completed via polling'],
      recommendations: ['Continue practicing techniques'],
      techniques_taught: ['Various training methods'],
      next_steps: ['Monitor progress'],
      progress_notes: 'Transcript retrieved via polling system.',
      follow_up_timeline: 'Check progress in 1 week'
    };
  }
}

export const tavusPollingService = TavusPollingService.getInstance(); 