import { ApiConfig, validateGeminiApiKey } from '@/constants/apiConfig';

export interface DailyTip {
  id: string;
  text: string;
  category: 'nutrition' | 'exercise' | 'health' | 'behavior' | 'grooming' | 'safety';
  timestamp: string;
}

export class DailyTipsAPI {
  private static baseUrl = ApiConfig.GEMINI.API_URL;
  private static apiKey = ApiConfig.GEMINI.API_KEY;
  private static useFallback = ApiConfig.GEMINI.USE_FALLBACK_RESPONSES;

  // Generate AI-powered daily tip
  static async generateDailyTip(
    petName?: string,
    petBreed?: string,
    petAge?: number
  ): Promise<DailyTip> {
    console.log('💡 Generating daily tip for:', { petName, petBreed, petAge });

    // Check if API is configured
    if (!this.apiKey || this.apiKey === '' || !validateGeminiApiKey(this.apiKey)) {
      console.log('🔄 Tips: Using fallback tip - Gemini API disabled');
      return this.getFallbackTip();
    }

    try {
      const prompt = this.buildTipPrompt(petName, petBreed, petAge);

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.8,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 100, // Increased for longer tips
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', response.status, errorText);
        return this.getFallbackTip();
      }

      const data = await response.json();
      console.log('✅ Daily tip generated successfully');

      const tipText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (!tipText) {
        console.warn('⚠️ Empty tip response, using fallback');
        return this.getFallbackTip();
      }

      // Clean and validate the tip (ensure it's short and appropriate)
      const cleanedTip = this.cleanTipText(tipText);
      
      return {
        id: `ai-tip-${Date.now()}`,
        text: cleanedTip,
        category: this.determineTipCategory(cleanedTip),
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('💥 Error generating daily tip:', error);
      return this.getFallbackTip();
    }
  }

  // Build personalized prompt for tip generation
  private static buildTipPrompt(
    petName?: string, 
    petBreed?: string, 
    petAge?: number
  ): string {
    const petInfo = petName ? `${petName}` : 'your pup';
    const breedInfo = petBreed ? ` (${petBreed})` : '';
    const ageInfo = petAge ? ` who is ${petAge} years old` : '';

    return `You are a compassionate and knowledgeable AI pet care assistant focused on helping first-time dog owners. Generate a short, friendly, and actionable daily pet care tip for a mobile app called "VetPaw" for ${petInfo}${breedInfo}${ageInfo}.

The app includes:
- AI-powered symptom checker
- Emergency first-response advice  
- Feeding guidance
- Dog behavior coaching
- Live video coaching sessions
- Pet mood detection (Snap My Mood)
- Health tracking and care badges
- Kawaii, Duolingo-style design and tone

📌 Instructions for the tip:
- Keep it **under 10 words**
- Use a **supportive, cheerful tone** (think: friendly coach or pet expert)
- Make it relevant to dog health, daily habits, safety, nutrition, or behavior
- Occasionally encourage the user to try VetPaw features (e.g. "Try the Symptom Checker if your pup seems off!")
- Add a single relevant emoji if it fits naturally

Examples:
- "Worried about that sneeze? Use the Symptom Checker to ease your mind!"
- "Dogs love routine—walks at the same time daily reduce anxiety 🐕"
- "Hydration is key! Make sure your pup has fresh water every few hours."
- "Try Snap My Mood to track ${petInfo}'s emotions through photos! 📸"

Generate a new tip for today:`;
  }

  // Clean and validate the generated tip text
  private static cleanTipText(rawTip: string): string {
    // Remove common AI prefixes and clean up
    let cleaned = rawTip
      .replace(/^(Tip:|Daily tip:|Here's a tip:|Daily tip for|Tip for|Generate a new tip for today:)/i, '')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/^\s*[•\-*]\s*/, '') // Remove bullet points
      .replace(/^-\s*/, '') // Remove leading dashes
      .trim();

    // Take first 1-2 sentences (split by periods, but keep complete thoughts)
    const sentences = cleaned.split(/\.\s+/);
    if (sentences.length > 2) {
      cleaned = sentences.slice(0, 2).join('. ').trim();
      if (!cleaned.endsWith('.')) cleaned += '.';
    } else {
      cleaned = sentences.join('. ').trim();
      if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
        cleaned += '.';
      }
    }

    // Ensure it's reasonable length (10-150 characters for practical tips)
    if (cleaned.length > 150) {
      // Trim to first complete sentence under 150 chars
      const words = cleaned.split(' ');
      let trimmed = '';
      for (const word of words) {
        if ((trimmed + ' ' + word).length > 147) break;
        trimmed += (trimmed ? ' ' : '') + word;
      }
      cleaned = trimmed.trim() + '...';
    }

    // Fallback if too short or empty
    if (cleaned.length < 10) {
      return this.getRandomFallbackTip().text;
    }

    return cleaned;
  }

  // Determine tip category based on content
  private static determineTipCategory(tipText: string): DailyTip['category'] {
    const text = tipText.toLowerCase();
    
    if (text.includes('water') || text.includes('food') || text.includes('eat') || text.includes('nutrition')) {
      return 'nutrition';
    }
    if (text.includes('walk') || text.includes('exercise') || text.includes('play') || text.includes('run')) {
      return 'exercise';
    }
    if (text.includes('health') || text.includes('vet') || text.includes('check') || text.includes('teeth')) {
      return 'health';
    }
    if (text.includes('train') || text.includes('behavior') || text.includes('command') || text.includes('sit')) {
      return 'behavior';
    }
    if (text.includes('brush') || text.includes('groom') || text.includes('clean') || text.includes('bath')) {
      return 'grooming';
    }
    
    return 'health'; // Default category
  }

  // Get a random fallback tip when AI is unavailable
  private static getRandomFallbackTip(): DailyTip {
    const fallbackTips = [
      { text: 'Practice "sit" before meals—it builds patience and good manners! 🍽️', category: 'behavior' as const },
      { text: 'Check those adorable ears weekly for redness or odor. Healthy ears = happy pup!', category: 'health' as const },
      { text: 'Evening walks boost digestion and strengthen your bond. Win-win! 🚶‍♀️', category: 'exercise' as const },
      { text: 'Brush teeth 2-3 times weekly for fresh breath and healthy smiles! 😁', category: 'health' as const },
      { text: 'Consistent meal times create routine and reduce begging behaviors.', category: 'nutrition' as const },
      { text: 'Teaching "stay" during food prep builds amazing impulse control!', category: 'behavior' as const },
      { text: 'Post-walk paw checks prevent cuts and infections. Show those beans some love! 🐾', category: 'health' as const },
      { text: 'Quick praise works magic—reward good behavior within 3 seconds!', category: 'behavior' as const },
      { text: 'Rotate toys weekly to keep that brilliant mind engaged and happy! 🧸', category: 'exercise' as const },
      { text: 'Daily brushing during shedding season = less fur, more cuddles!', category: 'grooming' as const },
      { text: 'Sudden water changes? Try the Symptom Checker to ease your mind!', category: 'health' as const },
      { text: 'Practice recall in safe, fenced areas before going off-leash. Safety first! 🔒', category: 'behavior' as const },
      { text: 'Fresh bowls daily prevent bacteria buildup. Clean bowls = healthy pup!', category: 'nutrition' as const },
      { text: 'Regular vet visits every 6-12 months keep your furry friend thriving! 🩺', category: 'health' as const },
      { text: 'Master "leave it" to prevent those sneaky sidewalk snack attacks! 🚫', category: 'behavior' as const },
      { text: 'Feeling anxious about symptoms? The Symptom Checker is here to help!', category: 'health' as const },
      { text: 'Try Snap My Mood to track your pup\'s emotions through photos! 📸', category: 'behavior' as const },
      { text: 'New to training? Our Behavior Coach has tips tailored just for you!', category: 'behavior' as const },
    ];

    const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
    
    return {
      id: `fallback-tip-${Date.now()}`,
      text: randomTip.text,
      category: randomTip.category,
      timestamp: new Date().toISOString(),
    };
  }

  // Main fallback method
  private static getFallbackTip(): DailyTip {
    console.log('🎯 Using fallback daily tip');
    return this.getRandomFallbackTip();
  }

  // Check if we should generate a new tip (once per day)
  static shouldGenerateNewTip(lastTipTimestamp?: string): boolean {
    if (!lastTipTimestamp) return true;

    const lastTipDate = new Date(lastTipTimestamp);
    const today = new Date();
    
    // Check if it's a new day
    return lastTipDate.toDateString() !== today.toDateString();
  }

  // Generate multiple tips for the slider
  static async generateMultipleTips(
    count: number = 3,
    petName?: string,
    petBreed?: string,
    petAge?: number
  ): Promise<DailyTip[]> {
    console.log(`💡 Generating ${count} daily tips...`);
    
    const tips: DailyTip[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        // Add small delay between requests to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const tip = await this.generateDailyTip(petName, petBreed, petAge);
        tips.push(tip);
      } catch (error) {
        console.error(`Error generating tip ${i + 1}:`, error);
        // Add fallback tip if generation fails
        tips.push(this.getFallbackTip());
      }
    }
    
    return tips;
  }
} 