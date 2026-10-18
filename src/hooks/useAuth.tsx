import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isLocalMode, type Profile } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string, newPassword?: string) => Promise<{ error: string | null }>;
  changePassword: (newPassword: string, oldPassword?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'chronos_local_profile';
const LOCAL_ACTIVE_SESSION = 'chronos_active_session';
const ADMIN_PASSWORD_KEY = 'chronos_admin_password';
const USER_ACCOUNTS_KEY = 'chronos_user_accounts';

export const DEFAULT_ADMIN_EMAIL = 'luanleao12@gmail.com';
export const DEFAULT_ADMIN_PASS = '78da769da';

interface StoredAccount {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: string;
}

function getAdminPassword(): string {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_PASS;
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASS;
}

function getStoredAccounts(): Record<string, StoredAccount> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(USER_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredAccount(account: StoredAccount): void {
  if (typeof window === 'undefined') return;
  const accounts = getStoredAccounts();
  accounts[account.email.toLowerCase().trim()] = account;
  localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(accounts));
}

const defaultAdminProfile: Profile = {
  id: 'admin-01',
  name: 'Luan Leão',
  email: DEFAULT_ADMIN_EMAIL,
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
  created_at: '2026-01-01T00:00:00.000Z'
};

function buildSession(userProf: Profile): Session {
  return {
    access_token: `token-${userProf.id}-${Date.now()}`,
    refresh_token: `refresh-${userProf.id}`,
    expires_in: 3600 * 24 * 365,
    token_type: 'bearer',
    user: {
      id: userProf.id,
      email: userProf.email,
      user_metadata: { name: userProf.name },
      app_metadata: {},
      aud: 'authenticated',
      created_at: userProf.created_at
    }
  } as Session;
}

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
        } catch {
          // fallback
        }
      }
      return null;
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

  // Initialization: check if there is an active session
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const hasActiveSession = typeof window !== 'undefined' && localStorage.getItem(LOCAL_ACTIVE_SESSION) === 'true';

        if (hasActiveSession) {
          const storedProfRaw = localStorage.getItem(LOCAL_USER_KEY);
          if (storedProfRaw) {
            try {
              const parsedProf: Profile = JSON.parse(storedProfRaw);
              if (mounted) {
                setProfile(parsedProf);
                setSession(buildSession(parsedProf));
                setLoading(false);
                return;
              }
            } catch {
              // ignore
            }
          }
        }

        // If in Supabase mode and no local session found
        if (!isLocalMode) {
          try {
            const { data: { session: supaSession } } = await supabase.auth.getSession();
            if (!mounted) return;
            if (supaSession?.user) {
              setSession(supaSession);
              await fetchProfile(supaSession.user.id);
            }
          } catch (e) {
            console.warn('Supabase session load error:', e);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  // Sign In function: validates against admin credentials (78da769da) or stored user accounts
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const normEmail = email.trim().toLowerCase();
    const inputPass = password.trim();

    if (!normEmail || !inputPass) {
      return { error: 'Por favor, informe seu email e sua senha.' };
    }

    const currentAdminPass = getAdminPassword();
    const isAdminEmail = normEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() || normEmail === 'luanleao12' || normEmail === 'admin';

    // 1. Check Administrator credentials (with custom or default password 78da769da)
    if (isAdminEmail && inputPass === currentAdminPass) {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      let activeAdminProf = defaultAdminProfile;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.email === DEFAULT_ADMIN_EMAIL) {
            activeAdminProf = parsed;
          }
        } catch {
          // fallback
        }
      }
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(activeAdminProf));
      localStorage.setItem(LOCAL_ACTIVE_SESSION, 'true');
      setProfile(activeAdminProf);
      setSession(buildSession(activeAdminProf));
      setLoading(false);
      return { error: null };
    }

    // 2. Check Stored User Accounts
    const accounts = getStoredAccounts();
    const existing = accounts[normEmail];
    if (existing && existing.password === inputPass) {
      const userProf: Profile = {
        id: `user-${normEmail}`,
        name: existing.name || normEmail.split('@')[0],
        email: existing.email,
        role: existing.role || 'USER',
        avatar: '',
        two_factor_enabled: false,
        two_factor_secret: null,
        preferences: defaultAdminProfile.preferences,
        created_at: existing.createdAt || new Date().toISOString()
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userProf));
      localStorage.setItem(LOCAL_ACTIVE_SESSION, 'true');
      setProfile(userProf);
      setSession(buildSession(userProf));
      setLoading(false);
      return { error: null };
    }

    // 3. If in Supabase mode, attempt Supabase cloud login
    if (!isLocalMode) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normEmail, password: inputPass });
        if (!error && data.session && data.user) {
          setSession(data.session);
          let loadedProf = await fetchProfile(data.user.id);
          if (!loadedProf) {
            const { error: insErr } = await supabase.from('profiles').insert({
              id: data.user.id,
              email: data.user.email || normEmail,
              name: data.user.user_metadata?.name || normEmail.split('@')[0],
              role: 'ADMIN'
            });
            if (!insErr) {
              loadedProf = await fetchProfile(data.user.id);
            }
          }
          if (loadedProf) {
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(loadedProf));
            localStorage.setItem(LOCAL_ACTIVE_SESSION, 'true');
            setProfile(loadedProf);
            setLoading(false);
            return { error: null };
          }
        }
      } catch (e) {
        console.warn('Supabase sign-in error:', e);
      }
    }

    return { error: 'Email ou senha incorretos. Verifique suas credenciais.' };
  }, [fetchProfile]);

  // Sign Up function: registers a new account
  const signUp = useCallback(async (email: string, password: string, name: string, role?: string): Promise<{ error: string | null }> => {
    const normEmail = email.trim().toLowerCase();
    const inputPass = password.trim();

    if (!normEmail || !inputPass) {
      return { error: 'Preencha todos os campos obrigatórios.' };
    }

    if (inputPass.length < 6) {
      return { error: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    const accounts = getStoredAccounts();
    if (accounts[normEmail] || normEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      return { error: 'Este email já está cadastrado. Alterne para a aba "Entrar".' };
    }

    const newAccount: StoredAccount = {
      email: normEmail,
      name: name.trim() || normEmail.split('@')[0],
      password: inputPass,
      role: (role as any) || 'ADMIN',
      createdAt: new Date().toISOString()
    };
    saveStoredAccount(newAccount);

    if (!isLocalMode) {
      try {
        await supabase.auth.signUp({
          email: normEmail,
          password: inputPass,
          options: { data: { name: newAccount.name } }
        });
      } catch (e) {
        console.warn('Supabase signUp warning:', e);
      }
    }

    return { error: null };
  }, []);

  // Change Password within user profile / settings
  const changePassword = useCallback(async (newPassword: string, oldPassword?: string): Promise<{ error: string | null }> => {
    const newPass = newPassword.trim();
    if (newPass.length < 6) {
      return { error: 'A nova senha deve conter pelo menos 6 caracteres.' };
    }

    const currentEmail = (profile?.email || DEFAULT_ADMIN_EMAIL).toLowerCase().trim();

    // Verify old password if specified
    if (oldPassword && oldPassword.trim()) {
      const activePass = currentEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ? getAdminPassword() : getStoredAccounts()[currentEmail]?.password;
      if (activePass && oldPassword.trim() !== activePass) {
        return { error: 'A senha atual informada está incorreta.' };
      }
    }

    // Update password in persistent storage
    if (currentEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() || profile?.role === 'ADMIN') {
      localStorage.setItem(ADMIN_PASSWORD_KEY, newPass);
    }

    const accounts = getStoredAccounts();
    if (accounts[currentEmail]) {
      accounts[currentEmail].password = newPass;
      localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(accounts));
    } else {
      accounts[currentEmail] = {
        email: currentEmail,
        name: profile?.name || currentEmail.split('@')[0],
        password: newPass,
        role: profile?.role || 'ADMIN',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(accounts));
    }

    // Also update in Supabase if logged in with Supabase
    if (!isLocalMode && session?.user) {
      try {
        await supabase.auth.updateUser({ password: newPass });
      } catch (e) {
        console.warn('Supabase updateUser password notice:', e);
      }
    }

    return { error: null };
  }, [profile, session]);

  // Reset Password for recovery on login screen
  const resetPassword = useCallback(async (email: string, newPassword?: string): Promise<{ error: string | null }> => {
    const normEmail = email.trim().toLowerCase();
    const newPass = (newPassword && newPassword.trim()) ? newPassword.trim() : DEFAULT_ADMIN_PASS;

    if (newPass.length < 6) {
      return { error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    if (normEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() || normEmail === 'admin' || normEmail === 'luanleao12') {
      localStorage.setItem(ADMIN_PASSWORD_KEY, newPass);
    }

    const accounts = getStoredAccounts();
    if (accounts[normEmail]) {
      accounts[normEmail].password = newPass;
      localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(accounts));
    } else {
      accounts[normEmail] = {
        email: normEmail,
        name: normEmail.split('@')[0],
        password: newPass,
        role: 'ADMIN',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(accounts));
    }

    if (!isLocalMode) {
      try {
        await supabase.auth.resetPasswordForEmail(normEmail, {
          redirectTo: window.location.origin
        });
      } catch (e) {
        console.warn('Supabase resetPassword error:', e);
      }
    }

    return { error: null };
  }, []);

  // Sign Out: clear session and return to Login Screen
  const signOut = useCallback(async () => {
    localStorage.removeItem(LOCAL_ACTIVE_SESSION);
    if (!isLocalMode) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const stored = localStorage.getItem(LOCAL_USER_KEY);
    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
    if (!isLocalMode && session?.user) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    setProfile((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
      return updated;
    });

    if (!isLocalMode && profile?.id) {
      try {
        await supabase.from('profiles').update(updates).eq('id', profile.id);
      } catch (e) {
        console.error('Profile update failed:', e);
      }
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
        resetPassword,
        changePassword,
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
