import { supabase } from './supabase';

export interface UsageStats {
  monthlyUsage: number;
  remainingChecks: number;
  canUse: boolean;
  isLoading: boolean;
}

export class RateLimitingService {
  private static readonly FREE_MONTHLY_LIMIT = 4;

  /**
   * Check monthly usage for symptom checker
   */
  static async checkMonthlyUsage(userId: string): Promise<number> {
    try {
      // Get the start of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Query assessments from this month
      const { data, error } = await supabase
        .from('symptom_assessments')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());
      
      if (error) {
        console.error('Error checking monthly usage:', error);
        return 0;
      }
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error in checkMonthlyUsage:', error);
      return 0;
    }
  }

  /**
   * Check if user can use symptom checker
   */
  static canUseSymptomChecker(isSubscribed: boolean, monthlyUsage: number): boolean {
    if (isSubscribed) return true;
    return monthlyUsage < this.FREE_MONTHLY_LIMIT;
  }

  /**
   * Get remaining checks for free users
   */
  static getRemainingChecks(isSubscribed: boolean, monthlyUsage: number): number | string {
    if (isSubscribed) return '∞';
    return Math.max(0, this.FREE_MONTHLY_LIMIT - monthlyUsage);
  }

  /**
   * Get usage statistics
   */
  static async getUsageStats(userId: string, isSubscribed: boolean): Promise<UsageStats> {
    const monthlyUsage = await this.checkMonthlyUsage(userId);
    
    return {
      monthlyUsage,
      remainingChecks: this.getRemainingChecks(isSubscribed, monthlyUsage) as number,
      canUse: this.canUseSymptomChecker(isSubscribed, monthlyUsage),
      isLoading: false
    };
  }

  /**
   * Show rate limit exceeded message
   */
  static getRateLimitMessage(): string {
    return `You've used all ${this.FREE_MONTHLY_LIMIT} free symptom checks this month. Upgrade to Premium for unlimited health assessments and priority support!`;
  }

  /**
   * Get usage display text
   */
  static getUsageDisplayText(isSubscribed: boolean, monthlyUsage: number): string {
    if (isSubscribed) {
      return `Premium: Unlimited checks used this month: ${monthlyUsage}`;
    }
    
    const remaining = this.getRemainingChecks(isSubscribed, monthlyUsage);
    return `Free: ${remaining} checks remaining this month (${monthlyUsage}/${this.FREE_MONTHLY_LIMIT} used)`;
  }
} 