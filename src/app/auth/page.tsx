"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';
import { Card, Button, TextInput } from '@/components/ui';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        ensureProfile(uid).catch(() => {});
        // Redirect to dashboard if authenticated
        router.push('/dashboard');
      }
    });
    
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        ensureProfile(uid).catch(() => {});
        router.push('/dashboard');
      }
    });
    
    return () => sub.subscription.unsubscribe();
  }, [supabase.auth, router]);

  async function ensureProfile(uid: string) {
    // Create or keep existing; grant starter coins if first time
    await supabase
      .from('profiles')
      .upsert({ user_id: uid, coins: 2000 }, { onConflict: 'user_id', ignoreDuplicates: false });
  }

  async function signInWithPassword() {
    if (!email || !password) {
      setMessage('Please enter both email and password');
      return;
    }

    setLoading(true);
    setMessage(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Sign in successful!');
    }
    
    setLoading(false);
  }

  async function signUpWithPassword() {
    if (!email || !password) {
      setMessage('Please enter both email and password');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage(null);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`
      }
    });
    
    if (error) {
      setMessage(error.message);
    } else if (data.user && !data.session) {
      setMessage('Account created! Please check your email to verify your account, then return here to sign in.');
      // Switch to sign in mode after a delay
      setTimeout(() => {
        setAuthMode('signin');
        setMessage('Account created! You can now sign in with your email and password.');
      }, 3000);
    } else {
      setMessage('Account created and signed in successfully!');
      // User will be automatically redirected by useEffect
    }
    
    setLoading(false);
  }


  async function signOut() {
    try {
      console.log('AuthPage: Signing out...')
      await supabase.auth.signOut();
      console.log('AuthPage: Sign out successful')
      router.push('/');
    } catch (error) {
      console.error('AuthPage: Sign out error:', error)
      // Still redirect even if there's an error
      router.push('/');
    }
  }

  if (userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-4">Welcome Back!</h2>
          <p className="text-gray-400 mb-6">You are successfully signed in.</p>
          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/dashboard')} 
              variant="primary" 
              fullWidth
            >
              Go to Dashboard
            </Button>
            <Button 
              onClick={signOut} 
              variant="ghost" 
              fullWidth
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-white mb-2">⚡</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {authMode === 'signin' ? 'Welcome Back' : 'Join YAP Sports'}
          </h1>
          <p className="text-gray-400">
            {authMode === 'signin' 
              ? 'Sign in to your account to continue' 
              : 'Create your account to get started'
            }
          </p>
        </div>


        {/* Form */}
        <div className="space-y-4">
          {/* Email Input */}
          <TextInput
            type="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
          />

          {/* Password Input */}
          <TextInput
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
          />

          {/* Confirm Password (only for signup) */}
          {authMode === 'signup' && (
            <TextInput
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={loading}
            />
          )}

          {/* Submit Button */}
          <Button
            onClick={() => {
              if (authMode === 'signin') {
                signInWithPassword();
              } else {
                signUpWithPassword();
              }
            }}
            variant="primary"
            fullWidth
            loading={loading}
          >
            {authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>

          {/* Toggle Auth Mode */}
          <div className="text-center pt-4">
            <button
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setMessage(null);
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
              disabled={loading}
            >
              {authMode === 'signin' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('successful') || message.includes('Check your email') || message.includes('Account created')
                ? 'bg-green-900/20 border border-green-500 text-green-300'
                : 'bg-red-900/20 border border-red-500 text-red-300'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-6 border-t text-center text-xs text-gray-500" style={{ borderColor: 'var(--color-steel)' }}>
          <p>Your password should be at least 6 characters long for security.</p>
        </div>
      </Card>
    </div>
  );
}


