import { supabase } from './supabase';
import { MoodLog } from '@/hooks/useMoodLogs';
import { SymptomAssessment } from './database';

export interface BehaviorDataPoint {
  date: string;
  moodScore: number; // 0-10 scale
  healthScore: number; // 0-10 scale
  overallScore: number; // Combined score
  mood?: string;
  symptoms?: string[];
  urgencyLevel?: 'mild' | 'moderate' | 'emergency';
  notes?: string;
}

export interface BehaviorTrendData {
  dataPoints: BehaviorDataPoint[];
  insights: {
    trend: 'improving' | 'stable' | 'declining';
    avgMoodScore: number;
    avgHealthScore: number;
    totalEntries: number;
    lastWeekTrend: number; // % change from previous week
    commonMoods: { mood: string; count: number }[];
    healthAlerts: number;
  };
  timeRange: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

export class BehaviorTrendService {
  
  // Mood to score mapping (higher = better)
  private static moodScoreMap: Record<string, number> = {
    'happy': 10,
    'excited': 9,
    'curious': 8,
    'relaxed': 7,
    'bored': 5,
    'uncertain': 4,
    'anxious': 3,
    'fearful': 2,
    'in pain': 1,
  };

  // Urgency to health score mapping (higher = better/less urgent)
  private static urgencyScoreMap: Record<string, number> = {
    'mild': 8,
    'moderate': 5,
    'emergency': 1,
  };

  // Convert mood to numeric score
  static getMoodScore(mood: string): number {
    return this.moodScoreMap[mood.toLowerCase()] || 5;
  }

  // Convert urgency level to health score
  static getHealthScore(urgencyLevel: string): number {
    return this.urgencyScoreMap[urgencyLevel] || 7; // Default neutral score
  }

  // Get behavior trend data for a specific pet
  static async getBehaviorTrend(
    userId: string, 
    petId: string, 
    days: number = 30
  ): Promise<BehaviorTrendData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log('🔍 Fetching behavior trend data...', {
      userId,
      petId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    try {
      // Fetch mood logs
      const { data: moodLogs, error: moodError } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('pet_id', petId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (moodError) {
        console.error('Error fetching mood logs:', moodError);
      }

      // Fetch symptom assessments  
      const { data: symptoms, error: symptomsError } = await supabase
        .from('symptom_assessments')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (symptomsError) {
        console.error('Error fetching symptom assessments:', symptomsError);
      }

      console.log('📊 Data fetched:', {
        moodLogs: moodLogs?.length || 0,
        symptoms: symptoms?.length || 0
      });

      // Combine and process data
      const dataPoints = this.processDataPoints(
        moodLogs || [],
        symptoms || [],
        startDate,
        endDate
      );

      // Generate insights
      const insights = this.generateInsights(dataPoints, moodLogs || [], symptoms || []);

      return {
        dataPoints,
        insights,
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days
        }
      };

    } catch (error) {
      console.error('Error getting behavior trend:', error);
      return this.getEmptyTrendData(startDate, endDate, days);
    }
  }

  // Process and combine mood and symptom data into daily data points
  private static processDataPoints(
    moodLogs: MoodLog[],
    symptoms: SymptomAssessment[],
    startDate: Date,
    endDate: Date
  ): BehaviorDataPoint[] {
    const dataPoints: BehaviorDataPoint[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Get data for this day
      const dayMoods = moodLogs.filter(log => 
        log.created_at.startsWith(dateStr)
      );
      
      const daySymptoms = symptoms.filter(assessment => 
        assessment.created_at.startsWith(dateStr)
      );

      // Calculate scores for the day
      let moodScore = 7; // Default neutral mood
      let healthScore = 9; // Default good health
      let notes = '';

      if (dayMoods.length > 0) {
        // Average mood score for the day
        const moodScores = dayMoods.map(log => this.getMoodScore(log.mood));
        moodScore = moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length;
        
        // Get most recent mood
        const latestMood = dayMoods[dayMoods.length - 1];
        notes += `Mood: ${latestMood.mood}`;
      }

      if (daySymptoms.length > 0) {
        // Use most severe symptom assessment for health score
        const severestSymptom = daySymptoms.reduce((prev, current) => {
          const prevScore = this.getHealthScore(prev.urgency_level);
          const currentScore = this.getHealthScore(current.urgency_level);
          return currentScore < prevScore ? current : prev;
        });
        
        healthScore = this.getHealthScore(severestSymptom.urgency_level);
        
        if (notes) notes += ', ';
        notes += `Health check: ${severestSymptom.urgency_level}`;
      }

      // Calculate overall score (weighted average: 60% mood, 40% health)
      const overallScore = (moodScore * 0.6) + (healthScore * 0.4);

      dataPoints.push({
        date: dateStr,
        moodScore: Math.round(moodScore * 10) / 10,
        healthScore: Math.round(healthScore * 10) / 10,
        overallScore: Math.round(overallScore * 10) / 10,
        mood: dayMoods.length > 0 ? dayMoods[dayMoods.length - 1].mood : undefined,
        symptoms: daySymptoms.length > 0 ? daySymptoms.flatMap(s => s.symptoms_selected) : undefined,
        urgencyLevel: daySymptoms.length > 0 ? daySymptoms[daySymptoms.length - 1].urgency_level : undefined,
        notes: notes || undefined
      });

      current.setDate(current.getDate() + 1);
    }

    return dataPoints;
  }

  // Generate insights from the data
  private static generateInsights(
    dataPoints: BehaviorDataPoint[],
    moodLogs: MoodLog[],
    symptoms: SymptomAssessment[]
  ) {
    const validPoints = dataPoints.filter(p => p.notes); // Only days with actual data
    
    if (validPoints.length === 0) {
      return {
        trend: 'stable' as const,
        avgMoodScore: 7,
        avgHealthScore: 9,
        totalEntries: 0,
        lastWeekTrend: 0,
        commonMoods: [],
        healthAlerts: 0
      };
    }

    // Calculate averages
    const avgMoodScore = validPoints.reduce((sum, p) => sum + p.moodScore, 0) / validPoints.length;
    const avgHealthScore = validPoints.reduce((sum, p) => sum + p.healthScore, 0) / validPoints.length;

    // Determine trend (compare first half vs second half)
    const midpoint = Math.floor(validPoints.length / 2);
    const firstHalf = validPoints.slice(0, midpoint);
    const secondHalf = validPoints.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.overallScore, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.overallScore, 0) / secondHalf.length;
    
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (secondHalfAvg > firstHalfAvg + 0.5) trend = 'improving';
    else if (secondHalfAvg < firstHalfAvg - 0.5) trend = 'declining';

    // Last week trend
    const lastWeek = validPoints.slice(-7);
    const previousWeek = validPoints.slice(-14, -7);
    let lastWeekTrend = 0;
    
    if (lastWeek.length > 0 && previousWeek.length > 0) {
      const lastWeekAvg = lastWeek.reduce((sum, p) => sum + p.overallScore, 0) / lastWeek.length;
      const previousWeekAvg = previousWeek.reduce((sum, p) => sum + p.overallScore, 0) / previousWeek.length;
      lastWeekTrend = ((lastWeekAvg - previousWeekAvg) / previousWeekAvg) * 100;
    }

    // Common moods
    const moodCounts: Record<string, number> = {};
    moodLogs.forEach(log => {
      moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
    });
    
    const commonMoods = Object.entries(moodCounts)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Health alerts (moderate/emergency assessments)
    const healthAlerts = symptoms.filter(s => 
      s.urgency_level === 'moderate' || s.urgency_level === 'emergency'
    ).length;

    return {
      trend,
      avgMoodScore: Math.round(avgMoodScore * 10) / 10,
      avgHealthScore: Math.round(avgHealthScore * 10) / 10,
      totalEntries: validPoints.length,
      lastWeekTrend: Math.round(lastWeekTrend * 10) / 10,
      commonMoods,
      healthAlerts
    };
  }

  // Return empty trend data structure
  private static getEmptyTrendData(startDate: Date, endDate: Date, days: number): BehaviorTrendData {
    return {
      dataPoints: [],
      insights: {
        trend: 'stable',
        avgMoodScore: 7,
        avgHealthScore: 9,
        totalEntries: 0,
        lastWeekTrend: 0,
        commonMoods: [],
        healthAlerts: 0
      },
      timeRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days
      }
    };
  }

  // Get mood emoji for display
  static getMoodEmoji(mood: string): string {
    const emojiMap: Record<string, string> = {
      'happy': '😊',
      'excited': '🤩',
      'curious': '🤔',
      'relaxed': '😌',
      'bored': '😑',
      'uncertain': '😕',
      'anxious': '😰',
      'fearful': '😨',
      'in pain': '😣'
    };
    return emojiMap[mood] || '🐕';
  }

  // Get mood color for display
  static getMoodColor(mood: string): string {
    const colorMap: Record<string, string> = {
      'happy': '#4CAF50',
      'excited': '#FF9800',
      'curious': '#2196F3',
      'relaxed': '#9C27B0',
      'bored': '#757575',
      'uncertain': '#FFC107',
      'anxious': '#FF5722',
      'fearful': '#F44336',
      'in pain': '#E91E63'
    };
    return colorMap[mood] || '#757575';
  }

  // Get urgency color for display
  static getUrgencyColor(urgency: string): string {
    const colorMap: Record<string, string> = {
      'mild': '#4CAF50',
      'moderate': '#FF9800',
      'emergency': '#F44336'
    };
    return colorMap[urgency] || '#757575';
  }
} 