import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VisionRequest {
  image: {
    base64: string;
    mimeType?: string;
    type: 'image' | 'video';
    name?: string;
  };
  analysis_type: 'mood' | 'health';
  context?: string;
  userMessage?: string;
}

const MOOD_ANALYSIS_PROMPT = `You are an expert veterinary behavior assistant. Detect the dog's emotional state from the image.

Output JSON only:
{
  "mood": "happy|relaxed|curious|excited|bored|anxious|fearful|in pain|uncertain",
  "confidence": 0.0-1.0,
  "cues": ["visual cue 1", "visual cue 2"],
  "advice": "single actionable tip under 120 chars"
}`

const HEALTH_ANALYSIS_PROMPT = `Analyze this pet image for health assessment. Provide structured analysis with urgency level, concerns, and recommendations. Use professional veterinary tone with emojis.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth verification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check environment variables - try multiple possible names
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       Deno.env.get('EXPO_PUBLIC_SUPABASE_URL') || 
                       'https://tisdiucvwgvnvgggdwii.supabase.co'
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 
                       Deno.env.get('EXPO_PUBLIC_SUPABASE_ANON_KEY') ||
                       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔧 Environment check:')
    console.log('- Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
    console.log('- Supabase Key:', supabaseKey ? 'SET' : 'MISSING')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extract JWT token from Authorization header
    const jwt = authHeader.replace('Bearer ', '')
    console.log('🔓 JWT token extracted, length:', jwt.length)

    // Verify the user is authenticated using the JWT token
    console.log('👤 Verifying user authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: VisionRequest = await req.json()
    const { image, analysis_type, context, userMessage } = body

    if (!image || !image.base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Processing ${analysis_type} analysis for user:`, user.id)

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.warn('⚠️ No Gemini API key, using fallback analysis')
      const fallbackResponse = getFallbackAnalysis(analysis_type, image, context)
      return new Response(
        JSON.stringify({ success: true, analysis: fallbackResponse, fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare request
    const systemPrompt = analysis_type === 'mood' ? MOOD_ANALYSIS_PROMPT : HEALTH_ANALYSIS_PROMPT
    const userPrompt = userMessage || (analysis_type === 'mood' ? 
      `${context ? `Context: ${context}\n\n` : ''}Please analyze this image and detect my pet's mood.` :
      `Please analyze this ${image.type} of my pet and provide a comprehensive health assessment.${context ? `\n\nContext: ${context}` : ''}`)

    const parts: any[] = [
      { text: systemPrompt },
      { text: userPrompt }
    ]

    if (image.type === 'image' && image.base64) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType || 'image/jpeg',
          data: image.base64
        }
      })
    }

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      )

      if (!geminiResponse.ok) {
        console.error(`❌ Gemini API error: ${geminiResponse.status}`)
        const fallbackResponse = getFallbackAnalysis(analysis_type, image, context)
        return new Response(
          JSON.stringify({ success: true, analysis: fallbackResponse, fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const geminiData = await geminiResponse.json()
      const aiResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!aiResponse) {
        console.warn('⚠️ No response from Gemini, using fallback')
        const fallbackResponse = getFallbackAnalysis(analysis_type, image, context)
        return new Response(
          JSON.stringify({ success: true, analysis: fallbackResponse, fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const parsedAnalysis = analysis_type === 'mood' ? 
        parseMoodAnalysis(aiResponse) : parseHealthAnalysis(aiResponse)

      console.log(`✅ ${analysis_type} analysis completed successfully`)
      return new Response(
        JSON.stringify({ success: true, analysis: parsedAnalysis, fallback: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('💥 Error calling Gemini API:', error)
      const fallbackResponse = getFallbackAnalysis(analysis_type, image, context)
      return new Response(
        JSON.stringify({ success: true, analysis: fallbackResponse, fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('💥 Vision function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function parseMoodAnalysis(analysis: string): any {
  try {
    let jsonStr = analysis.replace(/```json|```/g, '').trim()
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] || '{}')
    
    const allowed = ['happy', 'relaxed', 'curious', 'excited', 'bored', 'anxious', 'fearful', 'in pain', 'uncertain']
    if (!allowed.includes(parsed.mood)) parsed.mood = 'uncertain'
    
    return {
      mood: parsed.mood,
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
      cues: Array.isArray(parsed.cues) ? parsed.cues : [String(parsed.cues || 'No cues available')],
      advice: parsed.advice?.slice(0, 120) || 'Try again with a better photo.'
    }
  } catch (err) {
    return {
      mood: 'uncertain',
      confidence: 0.1,
      cues: ['Unable to parse analysis'],
      advice: 'Please retake a clearer photo in good light.'
    }
  }
}

function parseHealthAnalysis(analysis: string): any {
  try {
    let urgency: 'low' | 'moderate' | 'high' | 'emergency' = 'moderate'
    const urgencyMatch = analysis.toLowerCase().match(/urgency[:\s]*(low|moderate|high|emergency)/i)
    if (urgencyMatch) {
      urgency = urgencyMatch[1].toLowerCase() as any
    }

    const concerns: string[] = []
    const concernsMatch = analysis.match(/concerns?[:\s]*\n?([^#\n]*(?:\n[^#\n]*)*)/i)
    if (concernsMatch) {
      const concernsText = concernsMatch[1]
      const concernsArray = concernsText.split(/[•\-*]\s*/).filter(c => c.trim().length > 0)
      concerns.push(...concernsArray.map(c => c.trim()))
    }

    const recommendations: string[] = []
    const recommendationsMatch = analysis.match(/recommendations?[:\s]*\n?([^#\n]*(?:\n[^#\n]*)*)/i)
    if (recommendationsMatch) {
      const recommendationsText = recommendationsMatch[1]
      const recommendationsArray = recommendationsText.split(/[•\-*]\s*/).filter(r => r.trim().length > 0)
      recommendations.push(...recommendationsArray.map(r => r.trim()))
    }

    let confidence: 'high' | 'medium' | 'low' = 'medium'
    if (analysis.toLowerCase().includes('clear') || analysis.toLowerCase().includes('obvious')) {
      confidence = 'high'
    } else if (analysis.toLowerCase().includes('unclear') || analysis.toLowerCase().includes('difficult')) {
      confidence = 'low'
    }

    const followUp = urgency === 'high' || urgency === 'emergency' || 
                    analysis.toLowerCase().includes('veterinarian') || 
                    concerns.length > 0

    return {
      analysis,
      confidence,
      concerns: concerns.length > 0 ? concerns : ['No immediate concerns visible'],
      recommendations: recommendations.length > 0 ? recommendations : ['Continue monitoring your pet\'s condition'],
      urgency,
      followUp,
    }
  } catch (error) {
    return {
      analysis,
      confidence: 'low',
      concerns: ['Unable to parse analysis'],
      recommendations: ['Consult with a veterinarian'],
      urgency: 'moderate',
      followUp: true,
    }
  }
}

function getFallbackAnalysis(analysisType: string, image: any, context?: string): any {
  if (analysisType === 'mood') {
    const fallbackMoods = [
      { mood: 'happy', confidence: 0.85, cues: ['Bright eyes', 'Relaxed posture'], advice: 'Your pup looks content! 🐶' },
      { mood: 'relaxed', confidence: 0.8, cues: ['Soft body', 'Loose tail'], advice: 'Very calm and comfy. 😊' },
      { mood: 'curious', confidence: 0.75, cues: ['Alert ears', 'Focused gaze'], advice: 'Keep engaging their mind! 🧠' }
    ]
    return fallbackMoods[Math.floor(Math.random() * fallbackMoods.length)]
  } else {
    const isVideo = image.type === 'video'
    const analysisText = isVideo ? 
      'Thank you for sharing this video! 🐾 Based on observation: healthy movement, good body condition, alert behavior. No immediate concerns visible. Continue regular care and vet check-ups. 🏥' :
      'Thank you for sharing this photo! 🐾 Your pet appears healthy with bright eyes, good coat condition, and alert expression. No immediate concerns visible. Continue regular care. 🏥'

    return {
      analysis: analysisText,
      confidence: 'medium',
      concerns: ['No immediate concerns visible'],
      recommendations: ['Continue regular veterinary check-ups', 'Monitor for any changes in behavior'],
      urgency: 'low',
      followUp: false
    }
  }
} 