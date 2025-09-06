import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Get user ID from query params
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Get user badges with badge details
    const { data: userBadges, error: badgesError } = await supabase
      .from('user_badges')
      .select(`
        user_id,
        badge_id,
        earned_at,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });
    
    if (badgesError) {
      console.error('Error fetching user badges:', badgesError);
      return Response.json({ error: 'Failed to fetch badges' }, { status: 500 });
    }
    
    // Calculate user stats
    const totalBadges = userBadges?.length || 0;
    const totalPoints = userBadges?.reduce((sum, userBadge) => {
      return sum + (userBadge.badge?.points || 0);
    }, 0) || 0;
    
    const userLevel = Math.floor(totalPoints / 100) + 1;
    
    // Get next milestone
    const milestones = [
      { points: 50, title: 'Getting Started' },
      { points: 100, title: 'Engaged User' },
      { points: 250, title: 'Pet Expert' },
      { points: 500, title: 'VetPaw Champion' },
      { points: 1000, title: 'Master' }
    ];
    
    const nextMilestone = milestones.find(milestone => totalPoints < milestone.points) || 
                          { points: 1000, title: 'Master' };
    
    // Get all available badges
    const { data: allBadges, error: allBadgesError } = await supabase
      .from('badges')
      .select('*')
      .order('category', { ascending: true });
    
    if (allBadgesError) {
      console.error('Error fetching all badges:', allBadgesError);
      return Response.json({ error: 'Failed to fetch all badges' }, { status: 500 });
    }
    
    // Group badges by category
    const badgesByCategory = allBadges?.reduce((acc, badge) => {
      const category = badge.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(badge);
      return acc;
    }, {} as Record<string, any[]>) || {};
    
    // Mark which badges the user has earned
    const badgesWithEarnedStatus = allBadges?.map(badge => {
      const userBadge = userBadges?.find(ub => ub.badge_id === badge.id);
      return {
        ...badge,
        earned: !!userBadge,
        earned_at: userBadge?.earned_at || null
      };
    }) || [];
    
    return Response.json({
      userBadges,
      stats: {
        totalBadges,
        totalPoints,
        userLevel,
        nextMilestone
      },
      allBadges: badgesWithEarnedStatus,
      badgesByCategory
    });
    
  } catch (error) {
    console.error('Error in badges API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, badgeName } = await request.json();
    
    if (!userId || !badgeName) {
      return Response.json({ error: 'User ID and badge name are required' }, { status: 400 });
    }
    
    // Call the award_user_badge function
    const { data, error } = await supabase.rpc('award_user_badge', {
      p_user_id: userId,
      p_badge_name: badgeName
    });
    
    if (error) {
      console.error('Error awarding badge:', error);
      return Response.json({ error: 'Failed to award badge' }, { status: 500 });
    }
    
    // Get the newly awarded badge details
    if (data) {
      const { data: badgeData, error: badgeError } = await supabase
        .from('badges')
        .select('*')
        .eq('name', badgeName)
        .single();
        
      if (badgeError) {
        console.error('Error fetching badge details:', badgeError);
      }
      
      return Response.json({
        success: true,
        message: `Badge "${badgeName}" awarded successfully`,
        badge: badgeData
      });
    } else {
      return Response.json({
        success: false,
        message: `Badge "${badgeName}" was not awarded (may already be owned)`
      });
    }
    
  } catch (error) {
    console.error('Error in award badge API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}