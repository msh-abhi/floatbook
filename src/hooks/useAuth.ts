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
    const session = supabase.auth.getSession();
    
    const handleAuthChange = async (event: string, session: any) => {
      setLoading(true);
      const currentUser = session?.user;
      setUser(currentUser ?? null);

      if (currentUser) {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching user profile:", profileError);
        }
        setProfile(profileData);
        
        // Fetch company
        const { data: companyData, error: companyError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', currentUser.id);

        if (companyError) {
          console.error('Error fetching user company:', companyError);
        } else if (companyData && companyData.length > 0) {
          setCompanyId(companyData[0].company_id);
        } else {
          setCompanyId(null);
        }
      } else {
        setProfile(null);
        setCompanyId(null);
      }
      setLoading(false);
    };
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    
    // Initial load
    session.then(({ data }) => handleAuthChange("INITIAL_SESSION", data.session));

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };

    // *** THIS IS THE FIX ***
    // Create a profile for the new user immediately after sign-up
    if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ user_id: data.user.id, role: 'member' });
        
        if (profileError) {
            console.error("Error creating profile:", profileError);
            // This is a critical error, you might want to handle it more gracefully
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
        const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', user.id);
        if (companyData && companyData.length > 0) {
            setCompanyId(companyData[0].company_id);
        } else {
            setCompanyId(null);
        }
    }
  }

  return {
    user,
    profile,
    loading,
    companyId,
    signIn,
    signUp,
    signOut,
    refreshCompany,
    isSuperAdmin: profile?.role === 'super_admin',
  };
}