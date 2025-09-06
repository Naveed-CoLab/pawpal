import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthRequest {
  symptoms: string[];
  userLocation?: string;
}

interface AIAssessment {
  urgencyLevel: 'mild' | 'moderate' | 'emergency';
  symptomSummary: string[];
  analysis: string;
  immediateActions: string[];
  warnings: string[];
  vetRecommendation: string;
  possibleCauses: string[];
  color: string;
  icon: string;
}

const HEALTH_ANALYSIS_SYSTEM_PROMPT = `You are an expert veterinary consultant providing professional health assessments.

Your role:
- Analyze symptom combinations clinically
- Provide differential diagnoses
- Give specific, actionable recommendations
- Prioritize pet safety and appropriate care timing
- Explain medical reasoning clearly

Always maintain professional veterinary standards while being supportive to concerned pet owners.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🏥 AI Health function called')
    console.log('📋 Headers received:', Object.fromEntries(req.headers.entries()))

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    console.log('🔑 Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'MISSING')
    
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

    // Initialize Supabase client
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
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: HealthRequest = await req.json()
    const { symptoms, userLocation } = body

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Symptoms array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🩺 Processing health assessment for user:', user.id)
    console.log('📝 Symptoms:', symptoms.join(', '))

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.warn('⚠️ No Gemini API key, using fallback assessment')
      const fallbackResponse = getFallbackAssessment(symptoms)
      return new Response(
        JSON.stringify({ success: true, assessment: fallbackResponse, fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const symptomPrompt = `${HEALTH_ANALYSIS_SYSTEM_PROMPT}

CLINICAL CASE PRESENTATION:
Patient: Canine
Chief Complaints: ${symptoms.join(', ')}
Owner Location: ${userLocation || 'Not specified'}

Please provide a comprehensive veterinary assessment in this EXACT JSON format:
{
  "urgencyLevel": "mild|moderate|emergency",
  "symptomSummary": ["${symptoms.join('", "')}"],
  "analysis": "Detailed clinical analysis explaining the pathophysiology and significance of this specific symptom combination.",
  "immediateActions": ["Specific action 1", "Specific action 2", "Monitoring instruction"],
  "warnings": ["Specific red flag", "Complication to watch for"],
  "vetRecommendation": "Precise timeline recommendation with medical justification",
  "possibleCauses": ["Most likely diagnosis", "Secondary differential", "Less likely cause"],
  "color": "#color_code_based_on_urgency",
  "icon": "mild|moderate|emergency"
}

URGENCY CLASSIFICATION:
- emergency: Immediate life threat, 0-2 hours (#F44336)
- moderate: Significant concern, 24-48 hours (#FF9800)  
- mild: Monitoring appropriate, routine care (#4CAF50)

Analyze this SPECIFIC symptom combination: ${symptoms.join(' + ')}`

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: symptomPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      )

      if (!geminiResponse.ok) {
        console.error(`❌ Gemini API error: ${geminiResponse.status}`)
        const fallbackResponse = getFallbackAssessment(symptoms)
        return new Response(
          JSON.stringify({ success: true, assessment: fallbackResponse, fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const geminiData = await geminiResponse.json()
      const aiResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!aiResponse) {
        console.warn('⚠️ No response from Gemini, using fallback')
        const fallbackResponse = getFallbackAssessment(symptoms)
        return new Response(
          JSON.stringify({ success: true, assessment: fallbackResponse, fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      try {
        let cleanedResponse = aiResponse.trim()
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        const parsedResponse = JSON.parse(cleanedResponse)
        
        console.log('✅ Health assessment completed successfully')
        return new Response(
          JSON.stringify({ success: true, assessment: parsedResponse, fallback: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError)
        const fallbackResponse = getFallbackAssessment(symptoms)
        return new Response(
          JSON.stringify({ success: true, assessment: fallbackResponse, fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

    } catch (error) {
      console.error('💥 Error calling Gemini API:', error)
      const fallbackResponse = getFallbackAssessment(symptoms)
      return new Response(
        JSON.stringify({ success: true, assessment: fallbackResponse, fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('💥 Health function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function getFallbackAssessment(symptoms: string[]): AIAssessment {
  const getSpecificAnalysis = (symptomList: string[]) => {
    const symptomString = symptomList.join(', ').toLowerCase()
    
    // Emergency symptoms requiring immediate care
    if (symptomList.some(s => ['Seizures', 'Difficulty Breathing', 'Bloated Abdomen', 'Pale/Blue Gums', 'Collapse/Fainting', 'Bleeding (Non-stop)', 'Inability to Urinate', 'Heatstroke Signs'].includes(s))) {
      return {
        urgencyLevel: 'emergency' as const,
        analysis: `The combination of ${symptomList.join(' and ')} represents a potential veterinary emergency. These symptoms can indicate serious conditions requiring immediate clinical assessment.`,
        immediateActions: [
          'Transport to emergency veterinary hospital immediately',
          'Keep your pet calm during transport',
          'Do not offer food or water until evaluated',
          'Monitor respiratory rate and gum color'
        ],
        warnings: [
          'These symptoms can progress rapidly',
          'Do not delay seeking immediate veterinary care'
        ],
        vetRecommendation: 'EMERGENCY: Seek immediate veterinary care within 0-2 hours.',
        possibleCauses: ['Gastric dilatation-volvulus', 'Cardiovascular emergency', 'Neurological dysfunction', 'Severe toxicity'],
        color: '#F44336'
      }
    }
    
    // Gastrointestinal concerns
    if (symptomString.includes('vomiting') && symptomString.includes('diarrhea')) {
      return {
        urgencyLevel: 'moderate' as const,
        analysis: `Concurrent vomiting and diarrhea indicates acute gastroenteritis which can lead to rapid dehydration and electrolyte imbalances.`,
        immediateActions: [
          'Withhold food for 12-24 hours',
          'Provide small amounts of water frequently',
          'Monitor for signs of dehydration',
          'Document frequency of episodes'
        ],
        warnings: [
          'Watch for signs of dehydration or bloody discharge',
          'Seek immediate care if symptoms worsen'
        ],
        vetRecommendation: 'Schedule veterinary consultation within 24-48 hours.',
        possibleCauses: ['Acute gastroenteritis', 'Dietary indiscretion', 'Parasitic infection', 'Inflammatory condition'],
        color: '#FF9800'
      }
    }
    
    // Default moderate assessment
    return {
      urgencyLevel: 'moderate' as const,
      analysis: `The symptom combination of ${symptomList.join(', ')} requires professional veterinary assessment for proper diagnostic evaluation.`,
      immediateActions: [
        'Monitor symptoms closely',
        'Maintain normal feeding unless contraindicated',
        'Limit strenuous activity',
        'Prepare questions for veterinary visit'
      ],
      warnings: [
        'Contact veterinarian if symptoms worsen',
        'Do not administer human medications'
      ],
      vetRecommendation: 'Schedule veterinary consultation within 24-48 hours.',
      possibleCauses: ['Inflammatory condition', 'Infectious process', 'Metabolic disorder', 'Stress response'],
      color: '#FF9800'
    }
  }

  const analysis = getSpecificAnalysis(symptoms)
  
  return {
    ...analysis,
    symptomSummary: symptoms,
    icon: analysis.urgencyLevel
  }
}