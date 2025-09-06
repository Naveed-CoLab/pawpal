import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  message: string;
  userId?: string;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  fallback?: boolean;
}

const VETERINARY_SYSTEM_PROMPT = `You are VetPaw AI, an adorable and knowledgeable veterinary assistant! 🐾✨ 

Your personality:
- Caring, warm, and supportive 💕
- Use kawaii-style emojis generously 🐶🐱✨
- Professional but friendly tone
- Always prioritize pet safety and health 🏥

Guidelines:
- Provide helpful veterinary guidance 
- Always recommend consulting a vet for serious concerns 👩‍⚕️
- Use cute emojis throughout your responses 
- Keep responses informative but conversational
- Show empathy for pet owners' concerns 💖
- Include practical, actionable advice when appropriate

Remember: You're here to help and support pet parents! 🌟`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('💬 Chat function called')
    console.log('📋 Headers received:', Object.fromEntries(req.headers.entries()))

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    console.log('🔑 Auth header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'MISSING')
    
    if (!authHeader) {
      console.error('❌ No authorization header provided')
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

    // Initialize Supabase client for auth verification
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extract JWT token from Authorization header
    const jwt = authHeader.replace('Bearer ', '')
    console.log('🔓 JWT token extracted, length:', jwt.length)

    // Verify the user is authenticated using the JWT token
    console.log('👤 Verifying user authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    
    console.log('🔍 Auth verification result:')
    console.log('- Auth error:', authError)
    console.log('- User found:', !!user)
    console.log('- User ID:', user?.id)
    console.log('- User email:', user?.email)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: ChatRequest = await req.json()
    const { message } = body

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 Processing chat request for user:', user.id)
    console.log('📝 Message:', message.substring(0, 100) + '...')

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.warn('⚠️ No Gemini API key, using fallback response')
      const fallbackResponse = getFallbackChatResponse(message)
      return new Response(
        JSON.stringify({ 
          success: true, 
          response: fallbackResponse,
          fallback: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Gemini API
    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${VETERINARY_SYSTEM_PROMPT}\n\nUser: ${message}\n\nVetPaw AI:`
              }]
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

      if (!geminiResponse.ok) {
        console.error(`❌ Gemini API error: ${geminiResponse.status}`)
        const fallbackResponse = getFallbackChatResponse(message)
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: fallbackResponse,
            fallback: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const geminiData = await geminiResponse.json()
      const aiResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!aiResponse) {
        console.warn('⚠️ No response from Gemini, using fallback')
        const fallbackResponse = getFallbackChatResponse(message)
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: fallbackResponse,
            fallback: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ Chat response generated successfully')
      return new Response(
        JSON.stringify({ 
          success: true, 
          response: aiResponse,
          fallback: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('💥 Error calling Gemini API:', error)
      const fallbackResponse = getFallbackChatResponse(message)
      return new Response(
        JSON.stringify({ 
          success: true, 
          response: fallbackResponse,
          fallback: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('💥 Chat function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function getFallbackChatResponse(message: string): string {
  const input = message.toLowerCase()

  if (input.includes('feeding') || input.includes('food')) {
    return "For feeding 🍽️🐕, adult dogs typically need 2 meals per day! The amount depends on your pup's size, age, and activity level ⚡. Always use high-quality dog food 🥘 and avoid human foods that can be toxic like chocolate 🍫❌, grapes 🍇❌, and onions 🧅❌. Keep your furry friend healthy and happy! 🐾💕"
  }

  if (input.includes('sick') || input.includes('vomit') || input.includes('diarrhea')) {
    return "Oh no! 😟 If your precious pup 🐶 is showing signs of illness like vomiting 🤢 or diarrhea 💩, monitor them closely 👀. Withhold food for 12-24 hours but ensure they have fresh water 💧. If symptoms persist for more than 24 hours or you notice blood 🩸, lethargy 😴, or severe dehydration, please contact your veterinarian immediately! 🏥🚨 Your pup's health is precious! 💕"
  }

  if (input.includes('training') || input.includes('behavior')) {
    return "Training time! 🎾✨ Positive reinforcement is the most effective method! Use treats 🦴, praise 👏, and consistency 📅. Start with basic commands like 'sit' 🪑, 'stay' ✋, and 'come' 🏃‍♂️. Keep training sessions short (5-10 minutes) ⏰ and always end on a positive note! 🎉 Remember, patience is key! Your pup is learning! 🐕📚💕"
  }

  if (input.includes('puppy') || input.includes('baby')) {
    return "Aww, a puppy! 🐶💕 Puppies are so precious and need extra special care! 👶🐾 Make sure they get proper vaccinations 💉, lots of love 💖, gentle training 🎓, and appropriate puppy food 🍼. Socialization is super important too! 👥🐕 Your little fur baby will grow up to be amazing! ✨🌟"
  }

  return "That's such a wonderful question! 🤔💭 For specific health concerns, I recommend consulting with your local veterinarian 👩‍⚕️🏥. In the meantime, ensure your precious pup has fresh water 💧, a comfortable environment 🏠, and regular exercise 🏃‍♂️🐕! Is there anything specific about your furry friend's behavior or health you'd like to discuss? I'm here to help! 🐾💕✨"
} 