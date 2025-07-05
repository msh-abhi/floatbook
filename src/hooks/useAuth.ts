import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthChange = async (event: string, session: any) => {
      setLoading(true);
      const currentUser = session?.user;
      setUser(currentUser ?? null);

      if (currentUser) {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching user profile:", profileError);
          setProfile(null);
        } else {
          setProfile(profileData);
        }

        // Fetch user's company if they are not a super admin
        if (profileData?.role !== 'super_admin') {
            const { data: companyData } = await supabase
              .from('company_users')
              .select('company_id')
              .eq('user_id', currentUser.id)
              .maybeSingle(); // Use maybeSingle to handle cases where there is no company yet
            setCompanyId(companyData?.company_id || null);
        }
      } else {
        // Clear all data on sign out
        setProfile(null);
        setCompanyId(null);
      }
      setLoading(false);
    };
    
    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange("INITIAL_SESSION", session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => subscription.unsubscribe();
  }, []);
  
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };

    // Create a profile for the new user immediately after sign-up.
    // This is now safe because the new RLS policy allows it.
    if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ user_id: data.user.id, role: 'member' });
        
        if (profileError) {
            console.error("Error creating profile:", profileError);
            return { error: profileError };
        }
    }
    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };
  
  const refreshCompany = async () => {
      if(user) {
        const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).maybeSingle();
        setCompanyId(data?.company_id || null);
      }
  }
  
  // Role checking helpers
  const isSuperAdmin = profile?.role === 'super_admin';
  const isCompanyAdmin = profile?.role === 'company_admin';
  const isManager = profile?.role === 'manager';

  return {
    user,
    profile,
    loading,
    companyId,
    signIn,
    signUp,
    signOut,
    refreshCompany,
    isSuperAdmin,
    isCompanyAdmin,
    isManager,
    canManageCompany: isSuperAdmin || isCompanyAdmin,
    canCreateBookings: isSuperAdmin || isCompanyAdmin || isManager,
  };
}