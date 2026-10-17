import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    if (data) {
      profileRef.current = userId;
      setProfile(data as Profile);
    }
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;

    const loadProfile = async (userId: string) => {
      const data = await fetchProfile(userId);
      if (!mounted) return;
      if (!data && retryCount < 3) {
        retryCount++;
        setTimeout(() => mounted && loadProfile(userId), 800);
      } else {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSession(session);

      if (event === 'SIGNED_OUT') {
        profileRef.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Reset retry counter for new sign-in
        retryCount = 0;
        // Only fetch if we don't already have this user's profile
        if (profileRef.current !== session.user.id) {
          setProfile(null);
          setLoading(true);
          loadProfile(session.user.id);
        }
      }
      // For TOKEN_REFRESHED and other events, do nothing — keep current state
    });

    // Safety timeout: never stay loading forever
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, role?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };

    if (data.user && role) {
      await supabase
        .from('profiles')
        .update({ role })
        .eq('id', data.user.id);
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    profileRef.current = null;
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!session?.user) return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);
    if (error) {
      console.error('Error updating profile:', error);
      return;
    }
    await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
