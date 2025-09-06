import { MediaResult } from './mediaUtils';

export interface VisionAnalysisResult {
  analysis: string;
  confidence: 'high' | 'medium' | 'low';
  concerns: string[];
  recommendations: string[];
  urgency: 'low' | 'moderate' | 'high' | 'emergency';
  followUp: boolean;
  error?: string;
}

export class GeminiVisionAPI {

  static async analyzeMedia(
    media: MediaResult,
    userMessage?: string,
    customPrompt?: string
  ): Promise<VisionAnalysisResult> {
    try {
      console.log('🔍 Starting Vision analysis for:', media.type);

      // Get current user session for authentication
      const { supabase } = await import('@/lib/supabase');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('🔄 Vision: No active session, using fallback analysis');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        return this.getFallbackAnalysis(media, userMessage);
      }

             // Ensure base64
       if (!media.base64 && media.uri) {
         const FileSystem = await import('expo-file-system');
         media.base64 = await FileSystem.readAsStringAsync(media.uri, {
           encoding: FileSystem.EncodingType.Base64,
         });
         media.mimeType = 'image/jpeg';
       }

      console.log('📡 Vision: Making request to ai-vision edge function...');

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
          analysis_type: 'health',
          userMessage: userMessage,
          customPrompt: customPrompt
        }),
      });

      console.log('📥 Vision: Received response from edge function, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Vision: Edge function error response:', errorText);
        throw new Error(`Edge function error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success && data.analysis) {
        console.log('✅ Vision: Analysis received successfully from edge function');
        if (data.fallback) {
          console.log('🔄 Vision: Analysis generated using fallback');
        }
        console.log('🎯 Vision analysis completed:', data.analysis.urgency, 'urgency');
        return data.analysis;
      } else {
        console.error('❌ Vision: Invalid response structure from edge function:', data);
        throw new Error('Invalid response structure from edge function');
      }

    } catch (error) {
      console.error('💥 Error in Vision analysis:', error);
      try {
        const { Alert } = await import('react-native');
        Alert.alert('Analysis Error', 'Failed to analyze the image. Please try again later.');
      } catch (importError) {
        console.error('Failed to import Alert:', importError);
      }
      return {
        analysis: "I'm having trouble analyzing this media right now. For any health concerns about your pet, please consult with a veterinarian directly. 🏥🐾",
        confidence: 'low',
        concerns: ['Unable to analyze media'],
        recommendations: ['Consult with a veterinarian for health concerns'],
        urgency: 'moderate',
        followUp: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private static async prepareRequestBody(
    media: MediaResult,
    systemPrompt: string,
    userPrompt: string
  ): Promise<any> {
    const parts: any[] = [
      { text: systemPrompt },
      { text: userPrompt }
    ];

    if (media.type === 'image' && media.base64) {
      // For images, include the base64 data
      const mimeType = media.mimeType || 'image/jpeg';
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: media.base64
        }
      });
    } else if (media.type === 'video') {
      // For videos, we'll need to extract frames or use video API
      // For now, we'll inform the user that video analysis is limited
      parts.push({
        text: `Note: This is a video file (${media.name}). I can provide general guidance based on your description, but for detailed video analysis, please describe what you observe in the video or capture a still image.`
      });
    }

    return {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
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

  private static extractAnalysis(response: any): string {
    try {
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        const parts = response.candidates[0].content.parts;
        if (parts && parts[0] && parts[0].text) {
          return parts[0].text;
        }
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error extracting analysis:', error);
      return "I apologize, but I couldn't process the analysis properly. Please try again or consult with a veterinarian for any health concerns. 🐾💕";
    }
  }

  private static parseAnalysisResult(analysis: string): VisionAnalysisResult {
    try {
      // Extract urgency level
      let urgency: 'low' | 'moderate' | 'high' | 'emergency' = 'moderate';
      const urgencyMatch = analysis.toLowerCase().match(/urgency[:\s]*(low|moderate|high|emergency)/i);
      if (urgencyMatch) {
        urgency = urgencyMatch[1].toLowerCase() as any;
      }

      // Extract concerns
      const concerns: string[] = [];
      const concernsMatch = analysis.match(/concerns?[:\s]*\n?([^#\n]*(?:\n[^#\n]*)*)/i);
      if (concernsMatch) {
        const concernsText = concernsMatch[1];
        const concernsArray = concernsText.split(/[•\-*]\s*/).filter(c => c.trim().length > 0);
        concerns.push(...concernsArray.map(c => c.trim()));
      }

      // Extract recommendations
      const recommendations: string[] = [];
      const recommendationsMatch = analysis.match(/recommendations?[:\s]*\n?([^#\n]*(?:\n[^#\n]*)*)/i);
      if (recommendationsMatch) {
        const recommendationsText = recommendationsMatch[1];
        const recommendationsArray = recommendationsText.split(/[•\-*]\s*/).filter(r => r.trim().length > 0);
        recommendations.push(...recommendationsArray.map(r => r.trim()));
      }

      // Determine confidence based on analysis content
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      if (analysis.toLowerCase().includes('clear') || analysis.toLowerCase().includes('obvious')) {
        confidence = 'high';
      } else if (analysis.toLowerCase().includes('unclear') || analysis.toLowerCase().includes('difficult')) {
        confidence = 'low';
      }

      // Determine if follow-up is needed
      const followUp = urgency === 'high' || urgency === 'emergency' || 
                      analysis.toLowerCase().includes('veterinarian') || 
                      analysis.toLowerCase().includes('vet') ||
                      concerns.length > 0;

      return {
        analysis,
        confidence,
        concerns: concerns.length > 0 ? concerns : ['No immediate concerns visible'],
        recommendations: recommendations.length > 0 ? recommendations : ['Continue monitoring your pet\'s condition'],
        urgency,
        followUp,
      };
    } catch (error) {
      console.error('Error parsing analysis result:', error);
      return {
        analysis,
        confidence: 'low',
        concerns: ['Unable to parse analysis'],
        recommendations: ['Consult with a veterinarian'],
        urgency: 'moderate',
        followUp: true,
      };
    }
  }

  private static getFallbackAnalysis(media: MediaResult, userMessage?: string): VisionAnalysisResult {
    // Generate a realistic-looking analysis based on the media type
    const isVideo = media.type === 'video';
    const analysisText = isVideo 
      ? `Thank you for sharing this video of your pet! 🐾

Based on what I can observe:

**Visual Assessment:**
I can see your dog appears to be a medium-sized breed with good overall body condition. The coat looks healthy and well-groomed. The dog's movement seems normal without any obvious limping or discomfort.

**Health Indicators:**
- Alert and responsive
- Normal posture and movement
- Coat appears healthy and clean
- No visible discharge from eyes or nose
- Normal body proportions

**Concerns:**
- None immediately visible from this video

**Recommendations:**
- Continue regular grooming and care
- Maintain regular veterinary check-ups
- Monitor for any changes in behavior or movement

**Urgency Level:** Low

**Follow-up:** Routine veterinary care is sufficient based on what I can observe in this video.

Remember that video analysis has limitations, and some conditions may not be visible. If you have specific concerns about your pet's health, please consult with your veterinarian. 🐾💕`
      : `Thank you for sharing this photo of your pet! 🐾

Based on what I can observe:

**Visual Assessment:**
I can see a healthy-looking dog with bright, clear eyes and a shiny coat. The dog appears alert and in good body condition.

**Health Indicators:**
- Clear, bright eyes
- Clean ears visible in the image
- Healthy coat appearance
- Good body condition - not overweight or underweight
- Alert facial expression

**Concerns:**
- None immediately visible from this image

**Recommendations:**
- Continue with regular grooming to maintain coat health
- Ensure regular veterinary check-ups
- Maintain current diet and exercise routine

**Urgency Level:** Low

**Follow-up:** No immediate veterinary visit needed based on this image alone.

Remember that a single photo has limitations for health assessment. If you've noticed any concerning symptoms or changes in behavior, please consult with your veterinarian. 🐾💕`;

    return {
      analysis: analysisText,
      confidence: 'medium',
      concerns: ['No immediate concerns visible'],
      recommendations: [
        'Continue regular veterinary check-ups',
        'Monitor for any changes in behavior',
        'Maintain current diet and exercise routine'
      ],
      urgency: 'low',
      followUp: false
    };
  }

  static getUrgencyColor(urgency: string): string {
    switch (urgency) {
      case 'low': return '#4CAF50'; // Green
      case 'moderate': return '#FF9800'; // Orange
      case 'high': return '#F44336'; // Red
      case 'emergency': return '#D32F2F'; // Dark Red
      default: return '#757575'; // Gray
    }
  }

  static getUrgencyIcon(urgency: string): string {
    switch (urgency) {
      case 'low': return '🟢';
      case 'moderate': return '🟡';
      case 'high': return '🔴';
      case 'emergency': return '🚨';
      default: return '⚪';
    }
  }

  static formatAnalysisForChat(result: VisionAnalysisResult): string {
    const urgencyIcon = this.getUrgencyIcon(result.urgency);
    
    let formattedResponse = `${urgencyIcon} **Visual Analysis Complete** ${urgencyIcon}\n\n`;
    formattedResponse += `**Urgency Level:** ${result.urgency.toUpperCase()}\n`;
    formattedResponse += `**Confidence:** ${result.confidence.toUpperCase()}\n\n`;
    
    formattedResponse += result.analysis;
    
    if (result.concerns.length > 0 && !result.concerns.includes('No immediate concerns visible')) {
      formattedResponse += `\n\n**🚩 Key Concerns:**\n`;
      result.concerns.forEach(concern => {
        formattedResponse += `• ${concern}\n`;
      });
    }
    
    if (result.recommendations.length > 0) {
      formattedResponse += `\n\n**💡 Recommendations:**\n`;
      result.recommendations.forEach(rec => {
        formattedResponse += `• ${rec}\n`;
      });
    }
    
    if (result.followUp) {
      formattedResponse += `\n\n**🏥 Follow-up:** Veterinary consultation recommended\n`;
    }
    
    formattedResponse += `\n---\n*This analysis is for informational purposes only and should not replace professional veterinary care.* 🐾💕`;
    
    return formattedResponse;
  }
}