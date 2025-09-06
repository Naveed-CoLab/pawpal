import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface TavusWebhookPayload {
  event_type?: string;
  type?: string;
  conversation_id: string;
  replica_id?: string;
  transcript?: Array<{
    role: string;
    content: string;
  }>;
  metadata?: any;
  timestamp?: string;
  verbose_transcript_url?: string;
  status?: string;
  data?: any;
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
  // ✅ CRITICAL DEBUG: Log EVERY request that hits this function
  console.log('🚨 WEBHOOK FUNCTION HIT!');
  console.log('🕒 Timestamp:', new Date().toISOString());
  console.log('🌐 Method:', req.method);
  console.log('🔗 URL:', req.url);
  console.log('🏷️ Headers:', Object.fromEntries(req.headers.entries()));
  console.log('📍 Origin:', req.headers.get('origin') || 'unknown');
  console.log('🤖 User-Agent:', req.headers.get('user-agent') || 'unknown');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response('ok', { headers: corsHeaders })
  }

  // ✅ Test endpoint to verify webhook is reachable
  if (req.method === 'GET') {
    console.log('🧪 GET request - webhook test endpoint');
    return new Response(
      JSON.stringify({ 
        message: 'Tavus webhook is running!', 
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method,
        headers_received: Object.fromEntries(req.headers.entries())
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    console.log('🎯 Processing POST request...');
    console.log('🔍 Headers:', Object.fromEntries(req.headers.entries()));
    
    // ✅ ENHANCED: Log raw request body for debugging
    const rawBody = await req.text();
    console.log('📄 Raw webhook body LENGTH:', rawBody.length);
    console.log('📄 Raw webhook body CONTENT:', rawBody);
    
    let body: TavusWebhookPayload;
    try {
      body = JSON.parse(rawBody);
      console.log('✅ JSON parsed successfully');
    } catch (parseError) {
      console.error('❌ JSON parse failed:', parseError);
      console.error('📄 Raw body that failed:', rawBody);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in webhook body', 
          rawBody: rawBody.substring(0, 500),
          parseError: parseError.message 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('📄 Parsed webhook payload:', JSON.stringify(body, null, 2));
    
    // ✅ FIX: Check both 'type' and 'event_type' fields
    const eventType = body.event_type || body.type || (body as any).event || '';
    const { conversation_id, transcript, replica_id } = body;
    
    // 🚨 ENHANCED EVENT DETECTION - Log all events for debugging
    console.log('🔍 DETAILED EVENT DEBUG:');
    console.log('  - Raw Event Type (event_type):', body.event_type);
    console.log('  - Raw Event Type (type):', (body as any).type);
    console.log('  - Determined Event Type:', eventType);
    console.log('  - Event Type (lowercase):', eventType?.toLowerCase());
    console.log('  - All webhook payload keys:', Object.keys(body));
    console.log('  - Webhook timestamp:', new Date().toISOString());

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

    console.log(`📨 Processing event: ${eventType} for conversation: ${conversation_id}`);

    // ✅ FIXED: Handle transcript_ready events with proper field checking
    if (eventType === 'transcript_ready' || 
        eventType === 'transcription_ready' || 
        eventType === 'application.transcription_ready' ||
        eventType === 'conversation.transcript_ready' ||
        eventType === 'application_transcription_ready') {
      console.log('🎯 TRANSCRIPT READY EVENT DETECTED:', eventType);
      return await handleTranscriptionReady(body);
    }
    
    // Handle ANY transcription-related event as fallback
    if (eventType && (
        eventType.toLowerCase().includes('transcript') ||
        eventType.toLowerCase().includes('transcription') ||
        eventType.toLowerCase().includes('captions') ||
        eventType.toLowerCase().includes('ended') ||
        eventType.toLowerCase().includes('completed')
      )) {
      console.log('🎯 POTENTIAL TRANSCRIPTION EVENT DETECTED:', eventType);
      return await handleTranscriptionReady(body);
    }
    
    // Handle conversation completion events  
    if (eventType === 'conversation_completed' || 
        eventType === 'conversation.ended' ||
        eventType === 'conversation.completed' ||
        eventType === 'conversation_ended') {
      console.log('🏁 Processing conversation completion event');
      return await handleConversationCompleted(conversation_id);
    }
    
    // ✅ ENHANCED: Log unhandled events with more detail
    console.log(`⚠️ UNHANDLED EVENT TYPE: "${eventType}"`);
    console.log('📄 Full unhandled payload:', JSON.stringify(body, null, 2));
    console.log('🔍 Payload structure analysis:');
    console.log('  - Has event_type field:', !!body.event_type);
    console.log('  - Has type field:', !!(body as any).type);
    console.log('  - Has conversation_id:', !!conversation_id);
    console.log('  - Has transcript:', !!transcript);
    
    // ✅ RETURN SUCCESS to acknowledge webhook (prevents retries)
    return new Response(
      JSON.stringify({ 
        message: 'Event logged but not handled', 
        event_type: eventType,
        conversation_id: conversation_id,
        debug_info: {
          original_event_type: body.event_type,
          original_type: (body as any).type,
          payload_keys: Object.keys(body),
          has_transcript: !!transcript
        }
      }), 
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
 * Handle transcription ready webhook - FETCHES TRANSCRIPT FROM TAVUS API
 */
async function handleTranscriptionReady(payload: TavusWebhookPayload) {
  try {
    const { conversation_id, event_type } = payload;
    
    console.log('🎯 Processing transcription event:', event_type, 'for conversation:', conversation_id);
    console.log('🔍 Full payload:', JSON.stringify(payload, null, 2));
    
    // Initialize Supabase client
    const supabase = await initSupabaseClient();
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🚨 NEW: Fetch transcript from Tavus API
    console.log('📡 Fetching conversation data from Tavus API...');
    
    const tavusApiKey = Deno.env.get('TAVUS_API_KEY') || Deno.env.get('EXPO_PUBLIC_TAVUS_API_KEY');
    if (!tavusApiKey) {
      console.error('❌ No Tavus API key available');
      return new Response(
        JSON.stringify({ error: 'Tavus API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch transcript from Tavus API
    const transcriptResponse = await fetch(
      `https://tavusapi.com/v2/conversations/${conversation_id}?verbose=true`,
      {
        method: 'GET',
        headers: {
          'x-api-key': tavusApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!transcriptResponse.ok) {
      console.error(`❌ Failed to fetch conversation data: ${transcriptResponse.status}`);
      const errorText = await transcriptResponse.text().catch(() => 'Unknown error');
      console.error('Error details:', errorText);
      
      // If conversation isn't ready yet, create a placeholder
      if (transcriptResponse.status === 404 || transcriptResponse.status === 422) {
        console.log('⏳ Conversation not ready yet, creating placeholder session');
        return await createPlaceholderSession(conversation_id, supabase);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch conversation from Tavus', 
          status: transcriptResponse.status,
          details: errorText
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conversationData = await transcriptResponse.json();
    console.log('✅ Conversation data fetched successfully');
    console.log('📄 Conversation data structure:', Object.keys(conversationData));
    console.log('📄 Sample conversation data:', JSON.stringify(conversationData, null, 2).substring(0, 500));

    // Extract transcript from conversation data (verbose response includes transcript)
    let processedTranscript: Array<{role: string, content: string}> = [];
    
    // ✅ CORRECT: Extract transcript from verbose conversation response
    if (conversationData.transcript && Array.isArray(conversationData.transcript)) {
      processedTranscript = conversationData.transcript;
      console.log('🎯 Found transcript in conversation.transcript');
    } else if (conversationData.messages && Array.isArray(conversationData.messages)) {
      processedTranscript = conversationData.messages;
      console.log('🎯 Found transcript in conversation.messages');
    } else if (conversationData.captions && Array.isArray(conversationData.captions)) {
      // Convert captions to transcript format
      processedTranscript = conversationData.captions.map((caption: any) => ({
        role: caption.speaker === 'participant' ? 'user' : 'ai',
        content: caption.text || caption.content || String(caption)
      }));
      console.log('🎯 Found transcript in conversation.captions');
    } else {
      console.warn('⚠️ No transcript found in conversation data');
      console.log('📄 Available conversation fields:', Object.keys(conversationData));
      // Create minimal session without transcript
      return await createPlaceholderSession(conversation_id, supabase, 'No transcript available in conversation data');
    }

    console.log(`📝 Processing transcript with ${processedTranscript.length} messages`);
    console.log('📝 Sample messages:', processedTranscript.slice(0, 3));

    if (processedTranscript.length === 0) {
      console.warn('⚠️ No transcript messages found');
      return await createPlaceholderSession(conversation_id, supabase, 'No transcript content available');
    }

    // Convert transcript array to formatted text
    const fullTranscript = processedTranscript
      .filter(msg => msg.content && msg.content.trim())
      .map(msg => {
        const speaker = msg.role === 'user' || msg.role === 'participant' ? 'USER' : 'DR_LUNA';
        return `${speaker}: ${msg.content}`;
      })
      .join('\n');

    console.log(`📄 Formatted transcript length: ${fullTranscript.length} characters`);
    console.log(`📝 Transcript preview: ${fullTranscript.substring(0, 200)}...`);

    if (!fullTranscript || fullTranscript.length < 20) {
      console.warn('⚠️ Transcript is too short, creating minimal record');
      return await createPlaceholderSession(conversation_id, supabase, fullTranscript || 'Very short conversation');
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
          raw_captions: processedTranscript,
          duration_seconds: estimateSessionDuration(processedTranscript),
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

      console.log('✅ Session updated successfully with transcript:', updatedSession.id);
      
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
      duration_seconds: estimateSessionDuration(processedTranscript),
      created_at: new Date().toISOString(),
      raw_conversation_data: payload,
      raw_captions: processedTranscript,
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
        transcript_messages: processedTranscript.length,
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
 * Create placeholder session when transcript isn't available yet
 */
async function createPlaceholderSession(conversationId: string, supabase: any, transcriptContent = 'Waiting for transcript...') {
  const minimalData = {
    conversation_id: conversationId,
    transcript: transcriptContent,
    summary: 'Session completed but transcript processing is pending.',
    session_title: 'Coaching Session (Processing)',
    main_topic: 'Session Completed',
    key_points: ['Session ended, transcript processing in progress'],
    recommendations: ['Transcript will be available shortly'],
    status: 'pending',
    duration_seconds: 30,
    created_at: new Date().toISOString(),
  };

  const { data: minimalRecord, error: saveError } = await supabase
    .from('ai_coaching_sessions')
    .insert(minimalData)
    .select()
    .single();

  if (saveError) {
    console.error('❌ Error saving placeholder session:', saveError);
    return new Response(
      JSON.stringify({ error: 'Database save failed', details: saveError }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('✅ Placeholder session created:', minimalRecord.id);

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Placeholder session created, transcript processing pending', 
      session_id: minimalRecord.id,
      transcript_content: transcriptContent 
    }), 
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
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
          message: 'Session already processed from transcription event',
          session_id: existingSession.id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 No existing session found, creating placeholder');
    
    // Create placeholder session that can be updated later by transcription event
    const placeholderData = {
      conversation_id: conversationId,
      transcript: 'Waiting for transcript...',
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
        message: 'Placeholder session created, waiting for transcript event',
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

const listRecentConversations = async () => {
  try {
    const apiKey = ApiConfig.TAVUS.API_KEY;
    if (!apiKey || apiKey === 'your-tavus-api-key-here') {
      Alert.alert('Error', 'Tavus API key not configured');
      return;
    }

    Alert.alert('Loading', 'Fetching recent conversations...', [], { cancelable: false });

    const response = await fetch(
      'https://tavusapi.com/v2/conversations',
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      Alert.alert('Error', `Failed to fetch conversations: ${response.status}`);
      return;
    }

    const data = await response.json();
    console.log('📄 Recent conversations:', data);

    if (data.data && data.data.length > 0) {
      const recent = data.data.slice(0, 5).map((conv, index) => {
        const created = new Date(conv.created_at).toLocaleString();
        return `${index + 1}. ${conv.conversation_id}\n   Created: ${created}\n   Status: ${conv.status}`;
      }).join('\n\n');

      Alert.alert('Recent Conversations', recent, [
        { text: 'Copy Latest ID', onPress: () => {
          const latestId = data.data[0].conversation_id;
          Alert.prompt('Latest Conversation ID', `Use this ID in Custom ID field:\n\n${latestId}`, [], 'plain-text', latestId);
        }},
        { text: 'OK' }
      ]);
    } else {
      Alert.alert('No Conversations', 'No recent conversations found');
    }

  } catch (error) {
    console.error('💥 Error listing conversations:', error);
    Alert.alert('Error', error.message);
  }
}; 