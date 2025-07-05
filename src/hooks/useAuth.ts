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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
        setCompanyId(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ user_id: userId, role: 'member' }])
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating profile:', createError);
        } else {
          setProfile(newProfile);
        }
      } else {
        setProfile(profileData);
      }

      // Fetch user's company if not super admin
      if (profileData?.role !== 'super_admin') {
        const { data: companyUserData, error: companyError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', userId);

        if (companyError) {
          console.error('Error fetching user company:', companyError);
        } else if (companyUserData && companyUserData.length > 0) {
          setCompanyId(companyUserData[0].company_id);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updateUserRole = async (userId: string, role: Profile['role']) => {
    if (!profile || profile.role !== 'super_admin') {
      throw new Error('Unauthorized');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('user_id', userId);

    return { error };
  };

  // Role checking helpers
  const isSuperAdmin = profile?.role === 'super_admin';
  const isCompanyAdmin = profile?.role === 'company_admin';
  const isManager = profile?.role === 'manager';
  const isMember = profile?.role === 'member';

  return {
    user,
    profile,
    loading,
    companyId,
    signIn,
    signUp,
    signOut,
    updateUserRole,
    refreshProfile: () => user && fetchUserProfile(user.id),
    refreshCompany: () => user && fetchUserProfile(user.id),
    // Role flags
    isSuperAdmin,
    isCompanyAdmin,
    isManager,
    isMember,
    // Permission helpers
    canManageCompany: isSuperAdmin || isCompanyAdmin,
    canCreateBookings: isSuperAdmin || isCompanyAdmin || isManager,
    canEditBookings: isSuperAdmin || isCompanyAdmin,
    canManageRooms: isSuperAdmin || isCompanyAdmin,
    canManageTeam: isSuperAdmin || isCompanyAdmin,
  };
}