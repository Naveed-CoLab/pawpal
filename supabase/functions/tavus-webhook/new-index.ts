import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface TavusWebhookPayload {
  event_type: string;
  conversation_id: string;
  replica_id: string;
  transcript?: Array<{
    role: string;
    content: string;
  }>;
  metadata?: any;
  timestamp?: string;
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎯 Tavus webhook received:', req.method, req.url);
    console.log('🔍 Headers:', Object.fromEntries(req.headers.entries()));
    
    // Parse the webhook payload from Tavus
    const body: TavusWebhookPayload = await req.json();
    console.log('📄 Webhook payload:', JSON.stringify(body, null, 2));
    
    const { conversation_id, event_type, transcript, replica_id } = body;
    
    if (!conversation_id) {
      console.error('❌ No conversation ID in webhook');
      return new Response(
        JSON.stringify({ error: 'No conversation ID', body }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📨 Processing event: ${event_type} for conversation: ${conversation_id}`);

    // Handle the transcription ready event
    if (event_type === 'application.transcription_ready') {
      return await handleTranscriptionReady(body);
    }
    
    // Handle conversation completion events  
    if (event_type === 'conversation_completed' || event_type === 'conversation.ended') {
      return await handleConversationCompleted(conversation_id);
    }
    
    // Ignore other event types
    console.log(`⏭️ Ignoring event type: ${event_type}`);
    return new Response(
      JSON.stringify({ message: 'Event ignored', event_type: event_type }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
})

/**
 * Handle transcription ready webhook
 */
async function handleTranscriptionReady(payload: TavusWebhookPayload) {
  try {
    const { conversation_id, transcript } = payload;
    
    console.log('📝 Processing transcription ready event for:', conversation_id);
    
    if (!transcript || !Array.isArray(transcript)) {
      console.error('❌ No transcript data in webhook payload');
      return new Response(
        JSON.stringify({ error: 'No transcript data', payload }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📝 Processing transcript with ${transcript.length} messages`);

    // Initialize Supabase client
    const supabase = await initSupabaseClient();
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert transcript array to formatted text
    const fullTranscript = transcript
      .filter(msg => msg.content && msg.content.trim())
      .map(msg => {
        const speaker = msg.role === 'user' ? 'USER' : 'DR_LUNA';
        return `${speaker}: ${msg.content}`;
      })
      .join('\n');

    console.log(`📄 Formatted transcript length: ${fullTranscript.length} characters`);
    console.log(`📝 Transcript preview: ${fullTranscript.substring(0, 200)}...`);

    if (!fullTranscript || fullTranscript.length < 20) {
      console.warn('⚠️ Transcript is too short, skipping processing');
      return new Response(
        JSON.stringify({ 
          message: 'Transcript too short, ignored', 
          transcript_length: fullTranscript.length,
          transcript_preview: fullTranscript 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate summary
    const summary = await generateSummaryWithGemini(fullTranscript);

    // Check if session already exists
    const { data: existingSession } = await supabase
      .from('ai_coaching_sessions')
      .select('id')
      .eq('conversation_id', conversation_id)
      .single();

    if (existingSession) {
      console.log('⚠️ Session already exists, updating with transcript');
      
      const { data: updatedSession, error: updateError } = await supabase
        .from('ai_coaching_sessions')
        .update({
          transcript: fullTranscript,
          summary: JSON.stringify(summary),
          session_title: summary.session_title,
          main_topic: summary.main_topic,
          urgency_level: summary.urgency_level,
          key_points: summary.key_points,
          recommendations: summary.recommendations,
          techniques_taught: summary.techniques_taught,
          next_steps: summary.next_steps,
          progress_notes: summary.progress_notes,
          follow_up_timeline: summary.follow_up_timeline,
          status: 'completed',
          raw_captions: transcript,
        })
        .eq('conversation_id', conversation_id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating session:', updateError);
        return new Response(
          JSON.stringify({ error: 'Database update failed', details: updateError }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Session updated successfully:', updatedSession.id);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Session updated with transcript',
          session_id: updatedSession.id,
          conversation_id: conversation_id,
          transcript_length: fullTranscript.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new session
    const sessionData = {
      conversation_id: conversation_id,
      transcript: fullTranscript,
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
      duration_seconds: estimateSessionDuration(transcript),
      created_at: new Date().toISOString(),
      raw_conversation_data: payload,
      raw_captions: transcript,
    };

    console.log('💾 Saving new session to Supabase...');

    const { data: sessionRecord, error: saveError } = await supabase
      .from('ai_coaching_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving session to Supabase:', saveError);
      return new Response(
        JSON.stringify({ error: 'Database save failed', details: saveError }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Transcription processed and saved successfully:', sessionRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transcription processed successfully',
        session_id: sessionRecord.id,
        conversation_id: conversation_id,
        transcript_length: fullTranscript.length,
        summary_generated: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('💥 Error processing transcription:', error);
    return new Response(
      JSON.stringify({ error: 'Transcription processing failed', details: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle conversation completed events (fallback)
 */
async function handleConversationCompleted(conversationId: string) {
  try {
    console.log('🏁 Processing conversation completion for:', conversationId);

    // Initialize Supabase client
    const supabase = await initSupabaseClient();
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we already have this session from transcription event
    const { data: existingSession } = await supabase
      .from('ai_coaching_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (existingSession) {
      console.log('✅ Session already processed from transcription event');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Session already processed',
          session_id: existingSession.id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 No existing session found, this session may not have transcript yet');
    
    // Create placeholder session that can be updated later
    const placeholderData = {
      conversation_id: conversationId,
      transcript: 'Transcript pending...',
      summary: 'Summary will be generated when transcript is available.',
      session_title: 'Coaching Session (Processing)',
      main_topic: 'Session Completed',
      key_points: ['Session ended, waiting for transcript'],
      recommendations: ['Transcript processing in progress'],
      status: 'pending',
      duration_seconds: 0,
      created_at: new Date().toISOString(),
    };

    const { data: sessionRecord, error: saveError } = await supabase
      .from('ai_coaching_sessions')
      .insert(placeholderData)
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving placeholder session:', saveError);
      return new Response(
        JSON.stringify({ error: 'Database save failed', details: saveError }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Placeholder session created:', sessionRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Placeholder session created, waiting for transcript',
        session_id: sessionRecord.id,
        conversation_id: conversationId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error processing conversation completion:', error);
    return new Response(
      JSON.stringify({ error: 'Conversation completion processing failed', details: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Initialize Supabase client
 */
async function initSupabaseClient() {
  const supabaseUrl = Deno.env.get('EXPO_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  
  console.log('🔧 Environment check:');
  console.log('- Supabase URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.log('- Service Key:', supabaseServiceKey ? 'SET' : 'MISSING');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase configuration missing');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Estimate session duration from message count
 */
function estimateSessionDuration(transcript: Array<{role: string, content: string}>): number {
  // Rough estimation: 1 message per 10-15 seconds of conversation
  const messageCount = transcript.length;
  return Math.max(messageCount * 12, 60); // Minimum 1 minute
}

/**
 * Generate coaching summary using Gemini AI
 */
async function generateSummaryWithGemini(transcript: string): Promise<SessionSummary> {
  try {
    console.log('🤖 Generating summary with Gemini...');
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.warn('⚠️ No Gemini API key, using fallback summary');
      return getFallbackSummary();
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

    const geminiResponse = await fetch(
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

    if (!geminiResponse.ok) {
      console.error(`❌ Gemini API error: ${geminiResponse.status}`);
      return getFallbackSummary();
    }

    const geminiData = await geminiResponse.json();
    const summaryText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!summaryText) {
      console.warn('⚠️ No summary from Gemini, using fallback');
      return getFallbackSummary();
    }

    // Extract JSON from Gemini response
    try {
      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const summary = JSON.parse(jsonMatch[0]);
        console.log('✅ Summary generated successfully');
        return summary;
      } else {
        throw new Error('No JSON found in Gemini response');
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse Gemini JSON, using fallback summary');
      return getFallbackSummary();
    }

  } catch (error) {
    console.error('💥 Error generating summary:', error);
    return getFallbackSummary();
  }
}

/**
 * Fallback summary when AI generation fails
 */
function getFallbackSummary(): SessionSummary {
  return {
    session_title: 'Coaching Session Summary',
    main_topic: 'Dog Training Discussion',
    urgency_level: 'low',
    key_points: ['Session completed successfully'],
    recommendations: ['Continue practicing the discussed techniques'],
    techniques_taught: ['Various training methods'],
    next_steps: ['Practice regularly', 'Monitor progress'],
    progress_notes: 'Session completed. Further analysis needed.',
    follow_up_timeline: 'Check progress in 1 week'
  };
} 