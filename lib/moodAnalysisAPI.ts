// Updated MoodAnalysisAPI with Base64 conversion support
import { ApiConfig, validateGeminiApiKey } from '@/constants/apiConfig';
import * as FileSystem from 'expo-file-system';

export interface MediaResult {
  type: 'image';
  uri: string;
  base64?: string;
  mimeType?: string;
}

export interface MoodAnalysisResult {
  mood: 'happy' | 'relaxed' | 'curious' | 'excited' | 'bored' | 'anxious' | 'fearful' | 'in pain' | 'uncertain';
  confidence: number;
  cues: string[];
  advice: string;
  error?: string;
}

export class MoodAnalysisAPI {
  private static baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';
  private static apiKey = ApiConfig.GEMINI.API_KEY;
  private static useFallback = ApiConfig.GEMINI.USE_FALLBACK_RESPONSES;

  private static readonly MOOD_ANALYSIS_PROMPT = `You are an expert veterinary behavior assistant.  
Your task is to look at a single dog image plus short owner context, then:

1. Detect the dog's likely emotional state.  
2. Explain which visual cues (ears, tail, posture, facial tension) support that guess.  
3. Recommend one simple action the owner can take right now.  
4. Output concise JSON ONLY, structured exactly as below.

Allowed moods: "happy", "relaxed", "curious",  
               "excited", "bored", "anxious",  
               "fearful", "in pain", "uncertain"

--- JSON RESPONSE TEMPLATE ---
{
  "mood": "<one of the allowed moods>",
  "confidence": <0‑0 float>,
  "cues": ["<short cue 1>", "<short cue 2>"],
  "advice": "<single actionable tip, <120 chars>"
}
--------------------------------
Be friendly, supportive, kawaii‑toned, but keep advice factual.  
If image is blurry or dog not clearly visible, set mood = "uncertain"  
and advice = "Please retake a clearer photo in good light."`;

  static async analyzePetMood(media: MediaResult, context?: string): Promise<MoodAnalysisResult> {
    try {
      console.log('🐕 Starting mood analysis for:', media.type);

      // Get current user session for authentication
      const { supabase } = await import('@/lib/supabase');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('🔄 Mood: No active session, using fallback analysis');
        return this.getFallbackMoodAnalysis(context);
      }

             // Ensure base64
       if (!media.base64 && media.uri) {
         const FileSystem = await import('expo-file-system');
         media.base64 = await FileSystem.readAsStringAsync(media.uri, {
           encoding: FileSystem.EncodingType.Base64,
         });
         media.mimeType = 'image/jpeg';
       }

      console.log('📡 Mood: Making request to ai-vision edge function...');

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-vision`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: {
            base64: media.base64,
            mimeType: media.mimeType,
            type: media.type,
            name: media.name
          },
          analysis_type: 'mood',
          context: context
        }),
      });

      console.log('📥 Mood: Received response from edge function, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Mood: Edge function error response:', errorText);
        throw new Error(`Edge function error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success && data.analysis) {
        console.log('✅ Mood: Analysis received successfully from edge function');
        if (data.fallback) {
          console.log('🔄 Mood: Analysis generated using fallback');
        }
        return data.analysis;
      } else {
        console.error('❌ Mood: Invalid response structure from edge function:', data);
        throw new Error('Invalid response structure from edge function');
      }

    } catch (error) {
      console.error('💥 Error in mood analysis:', error);
      return {
        mood: 'uncertain',
        confidence: 0,
        cues: ['Analysis failed'],
        advice: 'Unable to analyze mood. Please try again or consult your vet if concerned.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private static async prepareRequestBody(media: MediaResult, context?: string): Promise<any> {
    const parts: any[] = [
      { text: this.MOOD_ANALYSIS_PROMPT },
    ];
    if (context) parts.push({ text: `Owner's context: ${context}` });
    if (media.base64) {
      parts.push({
        inline_data: {
          mime_type: media.mimeType || 'image/jpeg',
          data: media.base64,
        },
      });
    }
    return {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 256,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ]
    };
  }

  private static extractAnalysis(data: any): string {
    try {
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch {
      return '';
    }
  }

  private static parseMoodAnalysis(analysis: string): MoodAnalysisResult {
    try {
      let jsonStr = analysis.replace(/```json|```/g, '').trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || '{}');
      const allowed = ['happy', 'relaxed', 'curious', 'excited', 'bored', 'anxious', 'fearful', 'in pain', 'uncertain'];
      if (!allowed.includes(parsed.mood)) parsed.mood = 'uncertain';
      return {
        mood: parsed.mood,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        cues: Array.isArray(parsed.cues) ? parsed.cues : [String(parsed.cues)],
        advice: parsed.advice?.slice(0, 120) || 'Try again with a better photo.'
      };
    } catch (err) {
      return {
        mood: 'uncertain',
        confidence: 0.1,
        cues: ['Unable to parse analysis'],
        advice: 'Please retake a clearer photo in good light.'
      };
    }
  }

  private static getFallbackMoodAnalysis(context?: string): MoodAnalysisResult {
    const fallback = [
      {
        mood: 'happy', confidence: 0.85,
        cues: ['Bright eyes', 'Relaxed posture'],
        advice: 'Your pup looks content! 🐶'
      },
      {
        mood: 'relaxed', confidence: 0.8,
        cues: ['Soft body', 'Loose tail'],
        advice: 'Very calm and comfy. 😊'
      }
    ];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  static getMoodEmoji(mood: string): string {
    return {
      happy: '😊', relaxed: '😌', curious: '🤔', excited: '🤩',
      bored: '😐', anxious: '😰', fearful: '😨', 'in pain': '😣', uncertain: '🤷‍♂️'
    }[mood] || '🐶';
  }

  static getMoodColor(mood: string): string {
    return {
      happy: '#4CAF50', relaxed: '#8BC34A', curious: '#FF9800',
      excited: '#FFC107', bored: '#9E9E9E', anxious: '#FF5722',
      fearful: '#F44336', 'in pain': '#E91E63', uncertain: '#607D8B'
    }[mood] || '#8B4513';
  }

  static formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }
}

// Add utility for getting base64 from URI
export async function getBase64FromUri(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
