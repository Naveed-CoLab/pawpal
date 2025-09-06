import { supabase } from './supabase';

export interface FeedbackSubmission {
  feedback_text: string;
  rating: number;
  category: 'bug' | 'feature' | 'improvement' | 'general' | 'complaint' | 'compliment';
  user_email?: string;
  user_name?: string;
}

export interface Feedback extends FeedbackSubmission {
  id: string;
  user_id: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'closed';
  admin_response?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export class FeedbackService {
  // Submit new feedback
  static async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        return { success: false, error: 'Authentication required' };
      }

      const { error } = await supabase
        .from('feedback')
        .insert([{
          user_id: user?.id,
          feedback_text: feedback.feedback_text,
          rating: feedback.rating,
          category: feedback.category,
          user_email: feedback.user_email || user?.email,
          user_name: feedback.user_name || user?.user_metadata?.full_name || user?.user_metadata?.name,
          created_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error('Feedback submission error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Feedback submission error:', error);
      return { success: false, error: 'Failed to submit feedback' };
    }
  }

  // Get user's feedback history
  static async getUserFeedback(userId: string): Promise<Feedback[]> {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user feedback:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user feedback:', error);
      return [];
    }
  }

  // Get feedback statistics (for admin use)
  static async getFeedbackStats(): Promise<{
    totalFeedback: number;
    avgRating: number;
    categoryBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_feedback_stats');

      if (error) {
        console.error('Error fetching feedback stats:', error);
        return {
          totalFeedback: 0,
          avgRating: 0,
          categoryBreakdown: {},
          statusBreakdown: {},
        };
      }

      const stats = data?.[0];
      return {
        totalFeedback: stats?.total_feedback || 0,
        avgRating: stats?.avg_rating || 0,
        categoryBreakdown: stats?.category_counts || {},
        statusBreakdown: stats?.status_counts || {},
      };
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      return {
        totalFeedback: 0,
        avgRating: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
      };
    }
  }

  // Get all feedback (admin only)
  static async getAllFeedback(limit = 50, offset = 0): Promise<Feedback[]> {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching all feedback:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching all feedback:', error);
      return [];
    }
  }

  // Update feedback status (admin only)
  static async updateFeedbackStatus(
    feedbackId: string, 
    status: 'pending' | 'reviewed' | 'resolved' | 'closed',
    adminResponse?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'reviewed' || status === 'resolved') {
        updateData.reviewed_at = new Date().toISOString();
        
        // Get current user for reviewed_by
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateData.reviewed_by = user.id;
        }
      }

      if (adminResponse) {
        updateData.admin_response = adminResponse;
      }

      const { error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', feedbackId);

      if (error) {
        console.error('Error updating feedback status:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating feedback status:', error);
      return { success: false, error: 'Failed to update feedback status' };
    }
  }

  // Get feedback by category
  static async getFeedbackByCategory(category: string): Promise<Feedback[]> {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching feedback by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching feedback by category:', error);
      return [];
    }
  }

  // Get feedback by rating
  static async getFeedbackByRating(rating: number): Promise<Feedback[]> {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('rating', rating)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching feedback by rating:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching feedback by rating:', error);
      return [];
    }
  }
} 