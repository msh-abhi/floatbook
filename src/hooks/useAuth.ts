// src/hooks/useAuth.ts

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Add role state

  useEffect(() => {
    // Get initial session with error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error.message);
          // Clear any invalid session state
          await supabase.auth.signOut();
          setUser(null);
          setCompanyId(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserCompanyAndRole(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear session on any error
        await supabase.auth.signOut();
        setUser(null);
        setCompanyId(null);
        setUserRole(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserCompanyAndRole(session.user.id);
      } else {
        setCompanyId(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserCompanyAndRole = async (userId: string) => {
    try {
      // Fetch both company and profile in one go - use maybeSingle() to handle cases where no rows exist
      const { data: companyUserData, error: companyUserError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (companyUserError) console.error('Error fetching user company:', companyUserError.message);
      if (profileError) console.error('Error fetching user role:', profileError.message);

      setCompanyId(companyUserData?.company_id || null);
      setUserRole(profileData?.role || null);

    } catch (error) {
      console.error('Error fetching user data:', error);
      // If there's an authentication-related error, clear the session
      if (error instanceof Error && error.message.includes('refresh_token_not_found')) {
        await supabase.auth.signOut();
        setUser(null);
        setCompanyId(null);
        setUserRole(null);
      }
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

  return {
    user,
    loading,
    companyId,
    userRole, // Expose the role
    signIn,
    signUp,
    signOut,
    refreshCompany: () => user && fetchUserCompanyAndRole(user.id),
  };
}