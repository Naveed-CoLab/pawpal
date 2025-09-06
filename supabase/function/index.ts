import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TavusWebhookPayload {
  event_type: string;
  session_id: string;
  status: string;
  metadata?: any;
  timestamp: string;
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
    console.log('🎯 Tavus webhook received:', req.method);
    
    // Parse the webhook payload from Tavus
    const body = await req.json();
    console.log('📄 Webhook payload:', JSON.stringify(body, null, 2));
    
    const conversationId = body?.conversation_id;
    const eventType = body?.event_type;
    
    if (!conversationId) {
      console.error('❌ No conversation ID in webhook');
      return new Response('No conversation ID', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Only process conversation completion events
    if (eventType !== 'conversation_completed' && eventType !== 'conversation.ended') {
      console.log(`⏭️ Ignoring event type: ${eventType}`);
      return new Response('Event ignored', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    console.log(`🎬 Processing conversation completion for: ${conversationId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Wait a bit for Tavus to process the conversation fully
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 🎯 Step 1: Fetch conversation details and transcript from Tavus
    console.log('📝 Fetching conversation transcript from Tavus...');
    
    const tavusApiKey = Deno.env.get('TAVUS_API_KEY');
    if (!tavusApiKey) {
      throw new Error('TAVUS_API_KEY not configured');
    }

    const conversationResponse = await fetch(
      `https://tavusapi.com/v2/conversations/${conversationId}?include_captions=1`,
      {
        method: 'GET',
        headers: {
          'x-api-key': tavusApiKey,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!conversationResponse.ok) {
      console.error(`❌ Failed to fetch conversation: ${conversationResponse.status}`);
      throw new Error(`Tavus API error: ${conversationResponse.status}`);
    }

    const conversationData = await conversationResponse.json();
    console.log('✅ Conversation data retrieved');
    
    const captions = conversationData?.captions || [];
    const metadata = conversationData?.metadata || {};
    
    // Build full transcript
    const fullTranscript = captions
      .filter((caption: any) => caption.text && caption.text.trim())
      .map((caption: any) => {
        const speaker = caption.speaker === 'participant' ? 'USER' : 'JAMES';
        return `${speaker}: ${caption.text}`;
      })
      .join('\n');

    console.log(`📄 Transcript length: ${fullTranscript.length} characters`);

    if (!fullTranscript || fullTranscript.length < 50) {
      console.warn('⚠️ Transcript is too short, saving minimal data');
      // Save minimal session data
      const { error: saveError } = await supabase
        .from('ai_coaching_sessions')
        .insert({
          conversation_id: conversationId,
          transcript: fullTranscript || 'No transcript available',
          summary: 'Session was too short to generate a meaningful summary.',
          session_title: 'Brief Coaching Session',
          main_topic: 'Quick conversation',
          key_points: ['Session completed'],
          recommendations: ['Continue practicing'],
          status: 'completed',
          duration_seconds: 0,
          created_at: new Date().toISOString(),
        });

      if (saveError) {
        console.error('❌ Error saving minimal session:', saveError);
        throw saveError;
      }

      return new Response('Minimal session saved ✅', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // 🎯 Step 2: Generate summary using Gemini
    console.log('🤖 Generating session summary with Gemini...');
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const summaryPrompt = `Analyze this dog coaching session transcript and provide a comprehensive summary in JSON format.

TRANSCRIPT:
${fullTranscript}

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

    if (!geminiResponse.ok) {
      console.error(`❌ Gemini API error: ${geminiResponse.status}`);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const summaryText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!summaryText) {
      throw new Error('No summary generated by Gemini');
    }

    // Extract JSON from Gemini response
    let summary;
    try {
      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
        console.log('✅ Summary generated successfully');
      } else {
        throw new Error('No JSON found in Gemini response');
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse Gemini JSON, using fallback summary');
      summary = {
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

    // Calculate session duration
    const durationSeconds = captions.length > 0 ? 
      Math.floor((new Date(captions[captions.length - 1]?.timestamp || new Date()).getTime() - 
                  new Date(captions[0]?.timestamp || new Date()).getTime()) / 1000) : 0;

    // 🎯 Step 3: Save complete session data to Supabase
    console.log('💾 Saving session data to Supabase...');

    const sessionData = {
      conversation_id: conversationId,
      transcript: fullTranscript,
      summary: summaryText,
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
      duration_seconds: durationSeconds,
      created_at: new Date().toISOString(),
      // Store raw data for debugging
      raw_conversation_data: conversationData,
      raw_captions: captions,
    };

    const { data: sessionRecord, error: saveError } = await supabase
      .from('ai_coaching_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving session to Supabase:', saveError);
      throw saveError;
    }

    console.log('✅ Session saved successfully:', sessionRecord.id);

    // 🎯 Step 4: Optional - Send notification or trigger other workflows
    // You could add email notifications, push notifications, etc. here

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Session processed successfully',
        session_id: sessionRecord.id,
        conversation_id: conversationId,
        summary_generated: true,
        transcript_length: fullTranscript.length,
        duration_seconds: durationSeconds,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
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
 * Fetch final transcript from Tavus API
 */
async function fetchTavusTranscript(sessionId: string, apiKey: string): Promise<string | null> {
  try {
    console.log('📄 Fetching transcript for session:', sessionId)
    
    const response = await fetch(`https://api.tavus.io/v2/sessions/${sessionId}/captions/final`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('❌ Tavus API error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    
    // Extract text from captions or use full_text if available
    let transcript = ''
    
    if (data.full_text) {
      transcript = data.full_text
    } else if (data.captions && Array.isArray(data.captions)) {
      transcript = data.captions
        .filter((caption: any) => caption.is_final)
        .map((caption: any) => `${caption.speaker === 'participant' ? 'USER' : 'JAMES'}: ${caption.text}`)
        .join('\n')
    }

    console.log('✅ Transcript fetched, length:', transcript.length)
    return transcript || 'No transcript available'

  } catch (error) {
    console.error('💥 Error fetching transcript:', error)
    return null
  }
}

/**
 * Generate coaching summary using Gemini AI
 */
async function generateSummaryWithGemini(transcript: string, apiKey: string): Promise<SessionSummary | null> {
  try {
    console.log('🤖 Generating summary with Gemini...')
    
    const prompt = `You are an expert veterinary coach summarizing a live coaching session. Create a comprehensive but concise summary in JSON format.

**Required JSON Structure:**
{
  "session_title": "Brief descriptive title of the session",
  "main_topic": "Primary focus area (e.g., 'leash training', 'separation anxiety')",
  "urgency_level": "low|moderate|high",
  "key_points": ["Main discussion points and insights"],
  "recommendations": ["Specific actionable steps for the owner"],
  "techniques_taught": ["Training techniques or methods covered"],
  "next_steps": ["Follow-up actions and timeline"],
  "progress_notes": "Assessment of current situation and expected outcomes",
  "follow_up_timeline": "When to check progress or schedule next session"
}

**Guidelines:**
- Keep each array item concise but specific
- Focus on actionable advice rather than general statements
- Include specific techniques or methods mentioned
- Note any behavioral observations or insights
- Provide realistic timelines for seeing results
- Maintain encouraging and supportive tone

**SESSION TRANSCRIPT:**
${transcript}

Please analyze this coaching session and provide a comprehensive summary in the required JSON format.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
    )

    if (!response.ok) {
      console.error('❌ Gemini API error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!summaryText) {
      console.error('❌ No summary text returned from Gemini')
      return null
    }

    // Extract JSON from response
    const jsonMatch = summaryText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('❌ Invalid JSON format in Gemini response')
      return null
    }

    const summary: SessionSummary = JSON.parse(jsonMatch[0])
    console.log('✅ Summary generated successfully')
    
    return summary

  } catch (error) {
    console.error('💥 Error generating summary:', error)
    return null
  }
}

/**
 * Send push notification to user
 */
async function sendPushNotification(
  userId: string, 
  summary: SessionSummary, 
  expoAccessToken: string,
  supabase: any
): Promise<void> {
  try {
    console.log('📱 Sending push notification to user:', userId)

    // Get user's push tokens (you'd need to implement push token storage)
    const { data: user, error } = await supabase
      .from('users')
      .select('expo_push_token')
      .eq('id', userId)
      .single()

    if (error || !user?.expo_push_token) {
      console.log('⚠️ No push token found for user:', userId)
      return
    }

    const message = {
      to: user.expo_push_token,
      sound: 'default',
      title: '✅ Your coaching summary is ready!',
      body: `James has analyzed your session about ${summary.main_topic}. Check out your personalized recommendations!`,
      data: {
        sessionSummary: summary,
        screen: 'coach/summary',
      },
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expoAccessToken}`,
      },
      body: JSON.stringify(message),
    })

    if (response.ok) {
      console.log('✅ Push notification sent successfully')
    } else {
      console.error('❌ Failed to send push notification:', await response.text())
    }

  } catch (error) {
    console.error('💥 Error sending push notification:', error)
    throw error
  }
}

/* To deploy this function to Supabase:

1. Install Supabase CLI:
   npm install -g supabase

2. Login to Supabase:
   supabase login

3. Link your project:
   supabase link --project-ref YOUR_PROJECT_REF

4. Deploy the function:
   supabase functions deploy tavus-webhook

5. Set environment variables:
   supabase secrets set TAVUS_API_KEY=your_tavus_api_key
   supabase secrets set GEMINI_API_KEY=your_gemini_api_key
   supabase secrets set EXPO_ACCESS_TOKEN=your_expo_access_token

6. Configure Tavus webhook URL:
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/tavus-webhook

*/
