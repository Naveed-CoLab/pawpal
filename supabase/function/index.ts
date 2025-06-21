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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get environment variables
    const tavusApiKey = Deno.env.get('TAVUS_API_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')

    // Parse webhook payload
    const payload: TavusWebhookPayload = await req.json()
    
    console.log('🔔 Tavus webhook received:', payload.event_type, payload.session_id)

    // Only handle transcription_ready events
    if (payload.event_type !== 'application.transcription_ready') {
      console.log('⏭️ Ignoring event type:', payload.event_type)
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Find the coaching session in our database
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('tavus_session_id', payload.session_id)
      .single()

    if (sessionError || !session) {
      console.error('❌ Session not found:', payload.session_id, sessionError)
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    console.log('📝 Processing session:', session.id)

    // Fetch final transcript from Tavus
    const transcript = await fetchTavusTranscript(payload.session_id, tavusApiKey)
    if (!transcript) {
      throw new Error('Failed to fetch transcript from Tavus')
    }

    // Generate summary using Gemini
    const summary = await generateSummaryWithGemini(transcript, geminiApiKey)
    if (!summary) {
      throw new Error('Failed to generate summary with Gemini')
    }

    // Store summary in database
    const { error: summaryError } = await supabase
      .from('session_summaries')
      .insert({
        session_id: session.id,
        urgency_level: summary.urgency_level,
        primary_issue: summary.main_topic,
        recommendations: summary.recommendations,
        follow_up_steps: summary.next_steps,
        analysis_data: {
          session_title: summary.session_title,
          key_points: summary.key_points,
          techniques_taught: summary.techniques_taught,
          progress_notes: summary.progress_notes,
          follow_up_timeline: summary.follow_up_timeline,
          transcript: transcript,
          processed_at: new Date().toISOString(),
        }
      })

    if (summaryError) {
      console.error('❌ Failed to store summary:', summaryError)
      throw summaryError
    }

    console.log('✅ Summary stored successfully')

    // Send push notification if Expo token is available
    if (expoAccessToken) {
      try {
        await sendPushNotification(session.user_id, summary, expoAccessToken, supabase)
      } catch (error) {
        console.error('⚠️ Failed to send push notification:', error)
        // Don't fail the entire request if notification fails
      }
    }

    // Update session status
    await supabase
      .from('coaching_sessions')
      .update({ 
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', session.id)

    return new Response(JSON.stringify({ 
      message: 'Webhook processed successfully',
      session_id: session.id,
      summary_generated: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('💥 Webhook processing error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
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
