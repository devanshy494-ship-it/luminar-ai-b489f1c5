import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { lovable } from '@/integrations/lovable/index';
import { guestStorage } from '@/lib/guestStorage';

const GUEST_USER_KEY = 'luminar_guest_user';

interface GuestUser {
  id: string;
  name: string;
  isGuest: true;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  guestUser: GuestUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signInAsGuest: (name: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load guest user from localStorage on init
  useEffect(() => {
    try {
      const savedGuest = localStorage.getItem(GUEST_USER_KEY);
      if (savedGuest) {
        setGuestUser(JSON.parse(savedGuest));
      }
    } catch { /* ignore */ }
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const consumePendingGoogleSignupPassword = async (userId: string, userEmail: string) => {
    try {
      const raw = sessionStorage.getItem('pending_google_signup_password');
      if (!raw) return;
      const { password_id } = JSON.parse(raw);
      sessionStorage.removeItem('pending_google_signup_password');
      if (!password_id) return;

      // Only consume if this is a brand-new user (profile created moments ago)
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (!profile) return;
      const ageMs = Date.now() - new Date(profile.created_at).getTime();
      if (ageMs > 60_000) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-signup-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ action: 'record_usage', password_id, user_email: userEmail }),
        }
      );
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
        if (_event === 'SIGNED_IN' && session.user.app_metadata?.provider === 'google') {
          consumePendingGoogleSignupPassword(session.user.id, session.user.email || '');
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      return { error: result.error as Error };
    }
    return { error: null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error as Error };
    return { error: null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: error as Error };
    return { error: null };
  };

  const signInAsGuest = (name: string) => {
    const guest: GuestUser = {
      id: `guest-${Date.now()}`,
      name,
      isGuest: true,
    };
    setGuestUser(guest);
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(guest));
  };

  const signOut = async () => {
    if (guestUser) {
      setGuestUser(null);
      localStorage.removeItem(GUEST_USER_KEY);
      guestStorage.clearData();
      return;
    }
    await supabase.auth.signOut();
  };

  const isAuthenticated = !!user || !!guestUser;

  return (
    <AuthContext.Provider value={{
      session, user, guestUser, isAuthenticated, loading, isAdmin,
      signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
