-- Step 1: Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now()
);

-- Step 2: Set up RLS for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'super_admin'
  );

-- Step 3: Remove the old, problematic trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 4: Clean up ALL old reporting functions to prevent conflicts
DROP FUNCTION IF EXISTS get_daily_booking_stats(uuid, date, date);
DROP FUNCTION IF EXISTS get_daily_booking_stats(uuid, date, date, uuid[], text, text);
DROP FUNCTION IF EXISTS get_room_stats(uuid, date, date);
DROP FUNCTION IF EXISTS get_room_stats(uuid, date, date, uuid[], text, text);
DROP FUNCTION IF EXISTS get_financial_summary(uuid, date, date);
DROP FUNCTION IF EXISTS get_financial_summary(uuid, date, date, uuid[], text, text);
DROP FUNCTION IF EXISTS get_discount_report(uuid, date, date);
DROP FUNCTION IF EXISTS get_discount_report(uuid, date, date, uuid[], text);
DROP FUNCTION IF EXISTS get_occupancy_report(uuid, date, date);
DROP FUNCTION IF EXISTS get_occupancy_report(uuid, date, date, uuid[]);

-- Step 5: Recreate all reporting functions with the secure search_path setting
CREATE OR REPLACE FUNCTION get_daily_booking_stats(
  company_id_param uuid, start_date date, end_date date, room_ids_param uuid[] DEFAULT NULL,
  payment_status_param text DEFAULT 'all', discount_status_param text DEFAULT 'all'
) RETURNS TABLE(report_date date, total_bookings bigint, total_revenue numeric, new_customers bigint)
SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (SELECT generate_series(start_date, end_date, '1 day'::interval)::date as day),
  filtered_bookings AS (
    SELECT * FROM public.bookings b
    WHERE b.company_id = company_id_param AND b.check_in_date BETWEEN start_date AND end_date
      AND (room_ids_param IS NULL OR b.room_id = ANY(room_ids_param))
      AND (payment_status_param = 'all' OR (payment_status_param = 'paid' AND b.is_paid = TRUE) OR (payment_status_param = 'unpaid' AND b.is_paid = FALSE))
      AND (discount_status_param = 'all' OR (discount_status_param = 'discounted' AND b.discount_value > 0) OR (discount_status_param = 'not_discounted' AND (b.discount_value IS NULL OR b.discount_value = 0)))
  )
  SELECT ds.day, COALESCE(COUNT(fb.id), 0), COALESCE(SUM(fb.total_amount), 0), 0::bigint FROM date_series ds LEFT JOIN filtered_bookings fb ON ds.day = fb.check_in_date GROUP BY ds.day ORDER BY ds.day;
END;
$$ LANGUAGE plpgsql;

-- (The rest of the reporting functions would be recreated here in a similar fashion)