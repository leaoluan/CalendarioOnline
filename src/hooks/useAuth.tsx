import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isLocalMode, type Profile } from '../lib/supabase';

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

const LOCAL_USER_KEY = 'chronos_local_profile';
const LOCAL_SESSION_KEY = 'chronos_local_session';

const defaultLocalProfile: Profile = {
  id: 'local-admin-01',
  name: 'Luan Leão',
  email: 'luanleao12@gmail.com',
  role: 'ADMIN',
  avatar: '',
  two_factor_enabled: false,
  two_factor_secret: null,
  preferences: {
    theme: 'dark',
    glassOpacity: 75,
    gesturesEnabled: true,
    swipeSensitivity: 80,
    autoSyncInterval: 5,
    soundAlerts: true,
    defaultView: 'month',
    customGestures: {
      swipeLeft: 'next_period',
      swipeRight: 'prev_period',
      swipeDown: 'sync_now',
      doubleTap: 'quick_create'
    }
  },
  created_at: new Date().toISOString()
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (isLocalMode) {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      if (stored) {
        try {
          const p = JSON.parse(stored);
          setProfile(p);
          return p;
        } catch (_e) {
          // ignore
        }
      }
      setProfile(defaultLocalProfile);
      return defaultLocalProfile;
    }

    try {
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
    } catch (e) {
      console.error('Fetch profile exception:', e);
    }
    return null;
  }, []);

  // Initialization
  useEffect(() => {
    let mounted = true;

    if (isLocalMode) {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      const activeProf = stored ? JSON.parse(stored) : defaultLocalProfile;
      const isLoggedOut = localStorage.getItem(LOCAL_SESSION_KEY) === 'logged_out';

      if (!isLoggedOut) {
        setProfile(activeProf);
        setSession({
          access_token: 'local-token',
          refresh_token: 'local-refresh-token',
          expires_in: 3600 * 24 * 365,
          token_type: 'bearer',
          user: {
            id: activeProf.id,
            email: activeProf.email,
            user_metadata: { name: activeProf.name },
            app_metadata: {},
            aud: 'authenticated',
            created_at: activeProf.created_at
          }
        } as Session);
      } else {
        setProfile(null);
        setSession(null);
      }
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session);

        if (session?.user) {
          for (let i = 0; i < 3; i++) {
            const p = await fetchProfile(session.user.id);
            if (!mounted) return;
            if (p) break;
            await new Promise(r => setTimeout(r, 600));
          }
        }
      } catch (err) {
        console.warn('Supabase auth session error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
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

      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        return;
      }

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
    if (isLocalMode) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      const newProf: Profile = {
        ...defaultLocalProfile,
        email: email || defaultLocalProfile.email,
        name: email.split('@')[0] || defaultLocalProfile.name
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newProf));
      setProfile(newProf);
      setSession({
        access_token: 'local-token',
        refresh_token: 'local-refresh-token',
        expires_in: 3600 * 24 * 365,
        token_type: 'bearer',
        user: {
          id: newProf.id,
          email: newProf.email,
          user_metadata: { name: newProf.name },
          app_metadata: {},
          aud: 'authenticated',
          created_at: newProf.created_at
        }
      } as Session);
      setLoading(false);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      setSession(data.session);

      if (data.user) {
        let loadedProfile: Profile | null = null;
        for (let i = 0; i < 3; i++) {
          loadedProfile = await fetchProfile(data.user.id);
          if (loadedProfile) break;
          await new Promise(r => setTimeout(r, 600));
        }

        if (!loadedProfile) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              name: data.user.user_metadata?.name || email.split('@')[0],
              role: 'ADMIN',
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
    } catch (error) {
      console.error('Sign-in request failed:', error);
      return {
        error: 'Não foi possível acessar o Supabase. Confira se VITE_SUPABASE_URL é a URL da API do projeto (terminando em .supabase.co) e VITE_SUPABASE_ANON_KEY está configurada.',
      };
    }
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, name: string, role?: string) => {
    if (isLocalMode) {
      const newProf: Profile = {
        ...defaultLocalProfile,
        id: `local-${Date.now()}`,
        name: name || email.split('@')[0],
        email: email,
        role: (role as any) || 'ADMIN'
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newProf));
      localStorage.removeItem(LOCAL_SESSION_KEY);
      setProfile(newProf);
      return { error: null };
    }

    try {
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
    } catch (err: any) {
      return { error: err?.message || 'Falha no cadastro com o Supabase' };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isLocalMode) {
      localStorage.setItem(LOCAL_SESSION_KEY, 'logged_out');
      setSession(null);
      setProfile(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (isLocalMode) {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      if (stored) {
        setProfile(JSON.parse(stored));
      }
      return;
    }
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (isLocalMode) {
      setProfile((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
        return updated;
      });
      return;
    }

    if (!profile) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (e) {
      console.error('Profile update failed:', e);
    }
  }, [profile]);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
