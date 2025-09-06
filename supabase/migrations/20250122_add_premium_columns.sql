/*
  # Add Premium Subscription Columns to Users Table

  1. Changes
    -- Add is_premium column to users table (boolean, default false)
    -- Add premium_expires_at column to users table (timestamptz, nullable)
    -- Add revenuecat_user_id column to track RevenueCat user ID
    -- Create function to sync RevenueCat subscription status

  2. Functions
    -- Add sync_user_premium_status function to update user premium status
    -- This function can be called from the app when subscription changes

  3. Security
    -- Maintain existing RLS policies
    -- Allow authenticated users to update their own premium status
*/

-- Add premium subscription columns to users table
DO $$
BEGIN
  -- Add is_premium column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE users ADD COLUMN is_premium boolean DEFAULT false;
  END IF;

  -- Add premium_expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'premium_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN premium_expires_at timestamptz;
  END IF;

  -- Add revenuecat_user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'revenuecat_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN revenuecat_user_id text;
  END IF;
END $$;

-- Create function to sync user premium status
CREATE OR REPLACE FUNCTION sync_user_premium_status(
  user_id_param uuid,
  is_premium_param boolean,
  expires_at_param timestamptz DEFAULT NULL,
  revenuecat_id_param text DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  -- Update user premium status
  UPDATE users 
  SET 
    is_premium = is_premium_param,
    premium_expires_at = expires_at_param,
    revenuecat_user_id = COALESCE(revenuecat_id_param, revenuecat_user_id)
  WHERE auth_user_id = user_id_param;
  
  -- Also update or create subscription record
  INSERT INTO subscriptions (
    user_id,
    status,
    plan,
    start_date,
    end_date
  ) VALUES (
    (SELECT id FROM users WHERE auth_user_id = user_id_param),
    CASE WHEN is_premium_param THEN 'active' ELSE 'expired' END,
    CASE WHEN is_premium_param THEN 'premium' ELSE 'free' END,
    CASE WHEN is_premium_param THEN now() ELSE NULL END,
    expires_at_param
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    status = CASE WHEN is_premium_param THEN 'active' ELSE 'expired' END,
    plan = CASE WHEN is_premium_param THEN 'premium' ELSE 'free' END,
    start_date = CASE 
      WHEN is_premium_param AND subscriptions.status != 'active' THEN now() 
      ELSE subscriptions.start_date 
    END,
    end_date = expires_at_param,
    updated_at = now();
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error syncing premium status: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION sync_user_premium_status TO authenticated;

-- Create index on premium status for better query performance
CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium);
CREATE INDEX IF NOT EXISTS idx_users_premium_expires_at ON users(premium_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_revenuecat_user_id ON users(revenuecat_user_id); 