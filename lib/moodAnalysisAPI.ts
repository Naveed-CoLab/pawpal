import { ApiConfig, validateGeminiApiKey } from '@/constants/apiConfig';
import { MediaResult } from './mediaUtils';

export interface MoodAnalysisResult {
  mood: 'happy' | 'relaxed' | 'curious' | 'excited' | 'bored' | 'anxious' | 'fearful' | 'in pain' | 'uncertain';
  confidence: number; // 0-1 float
  cues: string[]; // Array of visual cues
  advice: string; // Actionable tip, <120 chars
  error?: string;
}

export class MoodAnalysisAPI {
  private static baseUrl = ApiConfig.GEMINI.API_URL;
  private static apiKey = ApiConfig.GEMINI.API_KEY;
  private static useFallback = ApiConfig.GEMINI.USE_FALLBACK_RESPONSES;

  // The exact prompt template from the specification
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
  "confidence": <0‑1 float>,
  "cues": ["<short cue 1>", "<short cue 2>"],
  "advice": "<single actionable tip, <120 chars>"
}
--------------------------------
Be friendly, supportive, kawaii‑toned, but keep advice factual.  
If image is blurry or dog not clearly visible, set mood = "uncertain"  
and advice = "Please retake a clearer photo in good light."`;

  static async analyzePetMood(
    media: MediaResult,
    context?: string
  ): Promise<MoodAnalysisResult> {
    try {
      console.log('🐕 Starting mood analysis for:', media.type);

      // Check if API key is properly configured
      if (!this.apiKey || this.apiKey === '' || !validateGeminiApiKey(this.apiKey)) {
        console.log('🔄 Mood: Using fallback analysis - API key not configured');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
        return this.getFallbackMoodAnalysis(context);
      }

      // If fallback is enabled, use fallback responses
      if (this.useFallback) {
        console.log('🔄 Mood: Using fallback analysis - Gemini API disabled');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
        return this.getFallbackMoodAnalysis(context);
      }

      // Prepare the request body
      const requestBody = await this.prepareRequestBody(media, context);

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Mood Analysis API error:', response.status, errorText);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Mood Analysis API response received');

      // Extract and parse the mood analysis
      const analysis = this.extractAnalysis(data);
      const result = this.parseMoodAnalysis(analysis);
      
      console.log('🎯 Mood analysis completed:', result.mood, `(${Math.round(result.confidence * 100)}%)`);
      return result;

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

  private static async prepareRequestBody(
    media: MediaResult,
    context?: string
  ): Promise<any> {
    const parts: any[] = [
      { text: this.MOOD_ANALYSIS_PROMPT }
    ];

    // Add context if provided
    if (context && context.trim()) {
      parts.push({ text: `Owner's context: ${context}` });
    }

    if (media.type === 'image' && media.base64) {
      const mimeType = media.mimeType || 'image/jpeg';
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: media.base64
        }
      });
    } else {
      // For non-image media, indicate limitation
      parts.push({
        text: `Note: Only image analysis is supported for mood detection. Please provide a clear photo of your dog.`
      });
    }

    return {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent mood detection
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 256, // Shorter response for mood analysis
        stopSequences: []
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
  }

  private static extractAnalysis(data: any): string {
    try {
      if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
          return candidate.content.parts[0].text || '';
        }
      }
      throw new Error('No valid response content found');
    } catch (error) {
      console.error('Error extracting analysis:', error);
      return '';
    }
  }

  private static parseMoodAnalysis(analysis: string): MoodAnalysisResult {
    try {
      // Clean the response to extract JSON
      let jsonStr = analysis.trim();
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr);
      
      // Validate the structure
      if (!parsed.mood || !parsed.hasOwnProperty('confidence') || !parsed.cues || !parsed.advice) {
        throw new Error('Invalid mood analysis structure');
      }

      // Validate mood is one of allowed values
      const allowedMoods = ['happy', 'relaxed', 'curious', 'excited', 'bored', 'anxious', 'fearful', 'in pain', 'uncertain'];
      if (!allowedMoods.includes(parsed.mood)) {
        parsed.mood = 'uncertain';
        parsed.confidence = 0.1;
      }

      // Ensure confidence is between 0 and 1
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

      // Ensure cues is an array
      if (!Array.isArray(parsed.cues)) {
        parsed.cues = [String(parsed.cues)];
      }

      // Truncate advice if too long
      if (parsed.advice.length > 120) {
        parsed.advice = parsed.advice.substring(0, 117) + '...';
      }

      return {
        mood: parsed.mood,
        confidence: parsed.confidence,
        cues: parsed.cues,
        advice: parsed.advice
      };

    } catch (error) {
      console.error('Error parsing mood analysis:', error);
      console.log('Raw analysis:', analysis);
      
      // Return fallback result
      return {
        mood: 'uncertain',
        confidence: 0.1,
        cues: ['Unable to parse analysis'],
        advice: 'Please retake a clearer photo in good light.'
      };
    }
  }

  private static getFallbackMoodAnalysis(context?: string): MoodAnalysisResult {
    // Generate realistic fallback responses based on context
    const fallbackResponses = [
      {
        mood: 'happy' as const,
        confidence: 0.85,
        cues: ['Bright eyes', 'Relaxed posture', 'Mouth slightly open'],
        advice: 'Keep up the great care! Your pup looks content and healthy. 🐕💕'
      },
      {
        mood: 'relaxed' as const,
        confidence: 0.78,
        cues: ['Soft eyes', 'Neutral ears', 'Comfortable position'],
        advice: 'Perfect! Your dog seems calm and comfortable. Continue this routine. 😌'
      },
      {
        mood: 'curious' as const,
        confidence: 0.82,
        cues: ['Alert ears', 'Focused gaze', 'Attentive posture'],
        advice: 'Great engagement! Try some puzzle toys to satisfy that curiosity. 🧩'
      }
    ];

    // If context suggests anxiety (fireworks, loud noises, etc.)
    if (context && (context.toLowerCase().includes('firework') || 
                   context.toLowerCase().includes('loud') || 
                   context.toLowerCase().includes('scared') ||
                   context.toLowerCase().includes('hiding'))) {
      return {
        mood: 'anxious',
        confidence: 0.75,
        cues: ['Tense posture', 'Alert expression', 'Possible stress signals'],
        advice: 'Create a calm, safe space. Consider calming music or a comfort blanket. 🎵'
      };
    }

    // Return random positive response for general cases
    const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
    return fallbackResponses[randomIndex];
  }

  // Helper function to get mood emoji
  static getMoodEmoji(mood: string): string {
    const emojiMap: { [key: string]: string } = {
      'happy': '😊',
      'relaxed': '😌',
      'curious': '🤔',
      'excited': '🤩',
      'bored': '😐',
      'anxious': '😰',
      'fearful': '😨',
      'in pain': '😣',
      'uncertain': '🤷‍♂️'
    };
    return emojiMap[mood] || '🐕';
  }

  // Helper function to get mood color
  static getMoodColor(mood: string): string {
    const colorMap: { [key: string]: string } = {
      'happy': '#4CAF50',      // Green
      'relaxed': '#8BC34A',    // Light Green
      'curious': '#FF9800',    // Orange
      'excited': '#FFC107',    // Amber
      'bored': '#9E9E9E',      // Grey
      'anxious': '#FF5722',    // Deep Orange
      'fearful': '#F44336',    // Red
      'in pain': '#E91E63',    // Pink
      'uncertain': '#607D8B'   // Blue Grey
    };
    return colorMap[mood] || '#8B4513';
  }

  // Helper function to format confidence as percentage
  static formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }
} 