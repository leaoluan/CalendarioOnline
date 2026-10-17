-- Fix: The select_own_or_all_for_admin policy causes infinite RLS recursion
-- because the subquery reads from `profiles` which is itself RLS-protected.
-- Solution: extract the admin check into a SECURITY DEFINER function that
-- bypasses RLS, then reference it in the policy.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Replace the recursive policy with one that uses the function
DROP POLICY IF EXISTS "select_own_or_all_for_admin" ON profiles;
CREATE POLICY "select_own_or_all_for_admin"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_admin()
);
