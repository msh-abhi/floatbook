/*
  # Implement User Roles and Super Admin System

  1. New Tables
    - `profiles` - Store user roles and profile information
    - `subscriptions` - Track company subscription plans

  2. User Roles
    - 'member' - Basic user (default)
    - 'manager' - Limited company management (can create bookings, view data)
    - 'company_admin' - Full company management
    - 'super_admin' - Platform-wide access

  3. Security
    - Comprehensive RLS policies for role-based access
    - Helper functions for role checking
    - Automatic profile creation for new users

  4. Manager Restrictions
    - Cannot edit/delete bookings
    - Cannot modify company info
    - Cannot manage rooms
    - Cannot manage team members
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'manager', 'company_admin', 'super_admin')),
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'free' CHECK (plan_name IN ('free', 'basic', 'pro')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'canceled', 'expired')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id_param uuid)
RETURNS text
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE user_id = user_id_param;
  
  RETURN COALESCE(user_role, 'member');
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id_param uuid)
RETURNS boolean
SECURITY DEFINER
AS $$
BEGIN
  RETURN get_user_role(user_id_param) = 'super_admin';
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if user is company admin
CREATE OR REPLACE FUNCTION is_company_admin(user_id_param uuid, company_id_param uuid)
RETURNS boolean
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_users cu
    JOIN profiles p ON cu.user_id = p.user_id
    WHERE cu.user_id = user_id_param 
    AND cu.company_id = company_id_param
    AND p.role = 'company_admin'
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if user can manage company
CREATE OR REPLACE FUNCTION can_manage_company(user_id_param uuid, company_id_param uuid)
RETURNS boolean
SECURITY DEFINER
AS $$
BEGIN
  RETURN is_super_admin(user_id_param) OR is_company_admin(user_id_param, company_id_param);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (user_id, role, full_name)
  VALUES (
    NEW.id,
    'member',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add user_email to company_users if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_users' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE company_users ADD COLUMN user_email text;
  END IF;
END $$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all profiles" ON profiles
  FOR UPDATE USING (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can view company member profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_users cu1
      JOIN company_users cu2 ON cu1.company_id = cu2.company_id
      WHERE cu1.user_id = auth.uid()
      AND cu2.user_id = profiles.user_id
      AND get_user_role(cu1.user_id) = 'company_admin'
    )
  );

-- Updated RLS Policies for companies
DROP POLICY IF EXISTS "Company members can update their company" ON companies;
CREATE POLICY "Company admins can update their company" ON companies
  FOR UPDATE USING (can_manage_company(auth.uid(), id));

CREATE POLICY "Super admins can view all companies" ON companies
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all companies" ON companies
  FOR UPDATE USING (is_super_admin(auth.uid()));

-- Updated RLS Policies for company_users
DROP POLICY IF EXISTS "Users can read their own company_user entry" ON company_users;
DROP POLICY IF EXISTS "Authenticated users can insert their own company_user entry" ON company_users;

CREATE POLICY "Users can read their own company_user entry" ON company_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Company admins can read company users" ON company_users
  FOR SELECT USING (can_manage_company(auth.uid(), company_id));

CREATE POLICY "Super admins can read all company users" ON company_users
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can insert their own company_user entry" ON company_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Company admins can manage company users" ON company_users
  FOR ALL USING (can_manage_company(auth.uid(), company_id));

CREATE POLICY "Super admins can manage all company users" ON company_users
  FOR ALL USING (is_super_admin(auth.uid()));

-- Updated RLS Policies for rooms
DROP POLICY IF EXISTS "Company members can insert rooms" ON rooms;
DROP POLICY IF EXISTS "Company members can update rooms" ON rooms;
DROP POLICY IF EXISTS "Company members can delete rooms" ON rooms;

CREATE POLICY "Company admins can insert rooms" ON rooms
  FOR INSERT WITH CHECK (can_manage_company(auth.uid(), company_id));

CREATE POLICY "Company admins can update rooms" ON rooms
  FOR UPDATE USING (can_manage_company(auth.uid(), company_id));

CREATE POLICY "Company admins can delete rooms" ON rooms
  FOR DELETE USING (can_manage_company(auth.uid(), company_id));

CREATE POLICY "Super admins can manage all rooms" ON rooms
  FOR ALL USING (is_super_admin(auth.uid()));

-- Updated RLS Policies for bookings
DROP POLICY IF EXISTS "Company members can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Company members can update bookings" ON bookings;
DROP POLICY IF EXISTS "Company members can delete bookings" ON bookings;

CREATE POLICY "Company admins and managers can insert bookings" ON bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users cu
      JOIN profiles p ON cu.user_id = p.user_id
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = bookings.company_id
      AND p.role IN ('company_admin', 'manager')
    ) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Only company admins can update bookings" ON bookings
  FOR UPDATE USING (can_manage_company(auth.uid(), company_id));

CREATE POLICY "Only company admins can delete bookings" ON bookings
  FOR DELETE USING (can_manage_company(auth.uid(), company_id));

CREATE POLICY "Super admins can manage all bookings" ON bookings
  FOR ALL USING (is_super_admin(auth.uid()));

-- RLS Policies for subscriptions
CREATE POLICY "Company members can view their subscription" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE user_id = auth.uid() AND company_id = subscriptions.company_id
    )
  );

CREATE POLICY "Super admins can view all subscriptions" ON subscriptions
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all subscriptions" ON subscriptions
  FOR ALL USING (is_super_admin(auth.uid()));

-- Create default subscription for existing companies
INSERT INTO subscriptions (company_id, plan_name, status)
SELECT id, 'free', 'active'
FROM companies
WHERE id NOT IN (SELECT company_id FROM subscriptions);

-- Create a super admin user (you'll need to update this with your actual user ID)
-- This is a placeholder - you'll need to run this manually with your user ID
-- INSERT INTO profiles (user_id, role, full_name) 
-- VALUES ('your-user-id-here', 'super_admin', 'Super Admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';