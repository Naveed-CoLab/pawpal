/*
  # VetPaw Badge System
  
  This migration creates a comprehensive badge system to reward user engagement
  and make the app more interactive and motivating.
  
  1. New Tables
    - `badges` - Master badge definitions (extend existing)
    - `user_badges` - User-earned badges tracking
  
  2. Initial Badges
    - First Chat badges
    - Mood tracking achievement badges  
    - Live coaching milestone badges
    - Pet care engagement badges
  
  3. Security
    - Enable RLS on both tables
    - Users can view all badges but only their earned badges
  
  4. Functions
    - Helper function to award badges safely
    - Function to check badge eligibility
*/

-- Add missing columns to existing badges table if they don't exist
DO $$
BEGIN
  -- Add title column (aliased as name in existing table)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'title'
  ) THEN
    ALTER TABLE badges ADD COLUMN title text;
  END IF;

  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE badges ADD COLUMN image_url text;
  END IF;

  -- Add requirement_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'requirement_type'
  ) THEN
    ALTER TABLE badges ADD COLUMN requirement_type text;
  END IF;

  -- Add requirement_value column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'requirement_value'
  ) THEN
    ALTER TABLE badges ADD COLUMN requirement_value integer;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE badges ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);

-- Enable Row Level Security
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are public - everyone can view all available badges
CREATE POLICY "Anyone can view all badges"
  ON badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only view their own earned badges
CREATE POLICY "Users can view own earned badges"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Users can insert their own badge achievements (via functions)
CREATE POLICY "Users can earn badges"
  ON user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Function to safely award a badge to a user
CREATE OR REPLACE FUNCTION award_user_badge(
  p_user_id uuid,
  p_badge_name text
)
RETURNS boolean AS $$
DECLARE
  v_badge_id uuid;
  v_badge_exists boolean;
BEGIN
  -- Get badge ID from name (not title)
  SELECT id INTO v_badge_id 
  FROM badges 
  WHERE name = p_badge_name;
  
  IF v_badge_id IS NULL THEN
    RAISE LOG 'Badge not found: %', p_badge_name;
    RETURN false;
  END IF;
  
  -- Check if user already has this badge
  SELECT EXISTS(
    SELECT 1 FROM user_badges 
    WHERE user_id = p_user_id AND badge_id = v_badge_id
  ) INTO v_badge_exists;
  
  IF v_badge_exists THEN
    RAISE LOG 'User already has badge: %', p_badge_name;
    RETURN false;
  END IF;
  
  -- Award the badge
  INSERT INTO user_badges (user_id, badge_id)
  VALUES (p_user_id, v_badge_id);
  
  RAISE LOG 'Badge awarded: % to user %', p_badge_name, p_user_id;
  RETURN true;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error awarding badge: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award milestone badges
CREATE OR REPLACE FUNCTION check_milestone_badges(
  p_user_id uuid,
  p_activity_type text
)
RETURNS void AS $$
DECLARE
  v_count integer;
BEGIN
  CASE p_activity_type
    WHEN 'chat' THEN
      -- Count user's chat sessions
      SELECT COUNT(*) INTO v_count
      FROM chats 
      WHERE user_id = p_user_id AND session_type = 'chat';
      
      -- Award milestone badges
      IF v_count = 1 THEN
        PERFORM award_user_badge(p_user_id, 'First Conversation');
      ELSIF v_count = 5 THEN
        PERFORM award_user_badge(p_user_id, 'Chat Enthusiast');
      ELSIF v_count = 10 THEN
        PERFORM award_user_badge(p_user_id, 'Chat Master');
      END IF;
      
    WHEN 'mood' THEN
      -- Count user's mood logs
      SELECT COUNT(*) INTO v_count
      FROM mood_logs 
      WHERE user_id = p_user_id;
      
      IF v_count = 1 THEN
        PERFORM award_user_badge(p_user_id, 'Mood Detective');
      ELSIF v_count = 5 THEN
        PERFORM award_user_badge(p_user_id, 'Emotion Expert');
      ELSIF v_count = 10 THEN
        PERFORM award_user_badge(p_user_id, 'Mood Master');
      END IF;
      
    WHEN 'coaching' THEN
      -- Count user's coaching sessions
      SELECT COUNT(*) INTO v_count
      FROM chats 
      WHERE user_id = p_user_id AND session_type = 'coaching';
      
      IF v_count = 1 THEN
        PERFORM award_user_badge(p_user_id, 'Coaching Rookie');
      ELSIF v_count = 3 THEN
        PERFORM award_user_badge(p_user_id, 'Coaching Enthusiast');
      ELSIF v_count = 5 THEN
        PERFORM award_user_badge(p_user_id, 'Coaching Pro');
      ELSIF v_count = 10 THEN
        PERFORM award_user_badge(p_user_id, 'Coaching Master');
      END IF;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION award_user_badge TO authenticated;
GRANT EXECUTE ON FUNCTION check_milestone_badges TO authenticated;
GRANT ALL ON badges TO authenticated;
GRANT ALL ON user_badges TO authenticated;

-- Insert initial badge set using the existing column structure (name instead of title)
INSERT INTO badges (name, description, icon, category, points, requirement_type, requirement_value, image_url, title) VALUES
  -- First Time Experience Badges
  ('First Conversation', 'Started your first chat with VetPaw AI! Welcome to the family! 🎉', '💬', 'chat', 10, 'chat_count', 1, 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=100&h=100&fit=crop&crop=faces', 'First Conversation'),
  ('Mood Detective', 'Used Snap My Mood for the first time! You''re helping us understand your pet better! 🔍', '🔍', 'mood', 15, 'mood_count', 1, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=100&h=100&fit=crop&crop=faces', 'Mood Detective'),
  ('Coaching Rookie', 'Completed your first live coaching session with Luna! Great start! 🎯', '🎯', 'coaching', 20, 'coaching_count', 1, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop&crop=faces', 'Coaching Rookie'),
  
  -- Engagement Milestone Badges
  ('Chat Enthusiast', 'Had 5 conversations with VetPaw AI! You''re getting the hang of it! 🌟', '🌟', 'chat', 25, 'chat_count', 5, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=100&h=100&fit=crop&crop=faces', 'Chat Enthusiast'),
  ('Chat Master', 'Completed 10 chat sessions! You''re a VetPaw AI conversation pro! 🏆', '🏆', 'chat', 50, 'chat_count', 10, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=100&h=100&fit=crop&crop=faces', 'Chat Master'),
  
  ('Emotion Expert', 'Tracked your pet''s mood 5 times! You really care about their emotional wellbeing! 💝', '💝', 'mood', 30, 'mood_count', 5, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=100&h=100&fit=crop&crop=faces', 'Emotion Expert'),
  ('Mood Master', 'Used Snap My Mood 10 times! You''re becoming a pet emotion expert! 🧠', '🧠', 'mood', 60, 'mood_count', 10, 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=100&h=100&fit=crop&crop=faces', 'Mood Master'),
  
  ('Coaching Enthusiast', 'Completed 3 coaching sessions! You''re committed to learning! 📚', '📚', 'coaching', 40, 'coaching_count', 3, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop&crop=faces', 'Coaching Enthusiast'),
  ('Coaching Pro', 'Completed 5 coaching sessions! You''re getting really good at this! 🏅', '🏅', 'coaching', 75, 'coaching_count', 5, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=100&h=100&fit=crop&crop=faces', 'Coaching Pro'),
  ('Coaching Master', 'Completed 10 coaching sessions! You''re a true pet parenting champion! 👑', '👑', 'coaching', 150, 'coaching_count', 10, 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=100&h=100&fit=crop&crop=faces', 'Coaching Master'),
  
  -- Special Achievement Badges
  ('Pet Parent', 'Added your first pet to VetPaw! Your furry friend is lucky to have you! 🐕', '🐕', 'pets', 15, 'pet_count', 1, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=100&h=100&fit=crop&crop=faces', 'Pet Parent'),
  ('Pack Leader', 'Added 3 pets to your VetPaw family! You''re managing a whole pack! 🐾', '🐾', 'pets', 35, 'pet_count', 3, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=100&h=100&fit=crop&crop=faces', 'Pack Leader'),
  ('Early Adopter', 'Joined VetPaw in its early days! Thank you for being part of our journey! ⭐', '⭐', 'special', 25, 'manual', 0, 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=100&h=100&fit=crop&crop=faces', 'Early Adopter'),
  ('Premium Member', 'Upgraded to VetPaw Premium! Unlock the full potential for your pet! 💎', '💎', 'subscription', 50, 'premium', 1, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop&crop=faces', 'Premium Member'),
  ('Loyal Companion', 'Used VetPaw for 30 days! Your consistency shows how much you care! 💙', '💙', 'engagement', 40, 'days_active', 30, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=100&h=100&fit=crop&crop=faces', 'Loyal Companion')
ON CONFLICT (name) DO NOTHING;

-- Create triggers to automatically award badges on key actions
CREATE OR REPLACE FUNCTION trigger_badge_check_on_chat()
RETURNS TRIGGER AS $$
BEGIN
  -- Award badges when a new chat is created
  PERFORM check_milestone_badges(NEW.user_id, 'chat');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_badge_check_on_mood()
RETURNS TRIGGER AS $$
BEGIN
  -- Award badges when a new mood log is created
  PERFORM check_milestone_badges(NEW.user_id, 'mood');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS badge_check_on_chat ON chats;
CREATE TRIGGER badge_check_on_chat
  AFTER INSERT ON chats
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check_on_chat();

DROP TRIGGER IF EXISTS badge_check_on_mood ON mood_logs;
CREATE TRIGGER badge_check_on_mood
  AFTER INSERT ON mood_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check_on_mood();

-- Create function to award pet-related badges
CREATE OR REPLACE FUNCTION trigger_badge_check_on_pet()
RETURNS TRIGGER AS $$
DECLARE
  v_pet_count integer;
BEGIN
  -- Count user's pets
  SELECT COUNT(*) INTO v_pet_count
  FROM pets 
  WHERE user_id = NEW.user_id;
  
  -- Award pet milestone badges
  IF v_pet_count = 1 THEN
    PERFORM award_user_badge(NEW.user_id, 'Pet Parent');
  ELSIF v_pet_count = 3 THEN
    PERFORM award_user_badge(NEW.user_id, 'Pack Leader');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create pet badge trigger
DROP TRIGGER IF EXISTS badge_check_on_pet ON pets;
CREATE TRIGGER badge_check_on_pet
  AFTER INSERT ON pets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check_on_pet(); 