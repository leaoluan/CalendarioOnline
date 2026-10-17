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

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
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
      return data as Profile;
    }
    return null;
  }, []);

  // Only used for initial load and sign-out detection
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);

      if (session?.user) {
        // Try to load profile, retry up to 3 times
        for (let i = 0; i < 3; i++) {
          const p = await fetchProfile(session.user.id);
          if (!mounted) return;
          if (p) break;
          await new Promise(r => setTimeout(r, 600));
        }
      }
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        profileRef.current = null;
        setProfile(null);
        setSession(null);
        setLoading(false);
        return;
      }

      // For SIGNED_IN, the signIn() function handles profile loading directly.
      // We only update the session here.
      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        return;
      }

      // For TOKEN_REFRESHED, just update session silently
      if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(newSession);
        return;
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Immediately set session and fetch profile — don't wait for onAuthStateChange
    setSession(data.session);

    if (data.user) {
      // Try to load profile with retries
      let loadedProfile: Profile | null = null;
      for (let i = 0; i < 3; i++) {
        loadedProfile = await fetchProfile(data.user.id);
        if (loadedProfile) break;
        await new Promise(r => setTimeout(r, 600));
      }

      if (!loadedProfile) {
        // Profile doesn't exist — create it as a fallback
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || email.split('@')[0],
            role: 'VIEWER',
          });
        if (!insertError) {
          loadedProfile = await fetchProfile(data.user.id);
        }
      }

      if (loadedProfile) {
        setLoading(false);
        return { error: null };
      } else {
        return { error: 'Não foi possível carregar o perfil do usuário.' };
      }
    }

    return { error: null };
  }, [fetchProfile]);

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
    setLoading(false);
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
