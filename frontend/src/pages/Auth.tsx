import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { createNewProfile } from '@/services/Profiles';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { mutate: createProfile } = useMutation({
    mutationFn: createNewProfile,
  });

  useEffect(() => {
    // Handle password recovery via query OR hash params (Supabase often uses URL hash)
    const hash = window.location.hash || '';
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

    const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');
    const type = searchParams.get('type') || hashParams.get('type');

    if (type === 'recovery') {
      if (accessToken && refreshToken) {
        // Set the session from URL parameters
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          .then(({ error }) => {
            if (!error) {
              // Clear sensitive tokens from URL
              const url = new URL(window.location.href);
              url.hash = '';
              window.history.replaceState(null, '', url.toString());
              setIsPasswordReset(true);
              setForgotPasswordMode(false);
            } else {
              console.error('Error setting session:', error);
              setError('Invalid reset link. Please request a new password reset.');
            }
          });
      } else {
        // In some cases Supabase establishes the session automatically
        setIsPasswordReset(true);
        setForgotPasswordMode(false);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // Fallback: detect Supabase password recovery event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordReset(true);
        setForgotPasswordMode(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signUp(email, password, fullName);
    if (error) {
      setError(error.message);
    } else {
      toast({
        title: 'Success!',
        description: 'Please check your email to confirm your account.',
      });
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
    } else {
      // Don't redirect if user is on a test page
      if (!window.location.pathname.startsWith('/test/')) {
        navigate('/');
      }
    }

    setLoading(false);
  };

  const enterForgotPasswordMode = () => {
    setForgotPasswordMode(true);
    setError('');
  };

  const handleSendReset = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setResetLoading(true);
    setError('');

    // Use the current origin for redirect URL
    const redirectUrl = `${window.location.origin}/auth`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setError(error.message);
    } else {
      toast({
        title: 'Password reset sent!',
        description: 'Check your email for the password reset link.',
      });
    }

    setResetLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
    } else {
      toast({
        title: 'Password updated!',
        description: 'Your password has been successfully updated.',
      });
      // Don't redirect if user is on a test page
      if (!window.location.pathname.startsWith('/test/')) {
        navigate('/dashboard');
      }
    }

    setLoading(false);
  };

  const handleBackToSignIn = () => {
    setForgotPasswordMode(false);
    setError('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src="/lovable-uploads/4b60f503-c9c0-4dae-9f1f-07bf354b0457.png"
              alt="AT Dawn Technologies"
              className="logo-extra-large object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">ADT Hub</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in or create an account with your @atdawntech.com email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPasswordReset ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Reset Your Password</h3>
                <p className="text-sm text-muted-foreground">Enter your new password below</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating password...' : 'Update Password'}
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your.name@atdawntech.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  {!forgotPasswordMode && (
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {!forgotPasswordMode ? (
                    <>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-primary hover:text-primary/80"
                        onClick={enterForgotPasswordMode}
                      >
                        Forgot Password?
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleSendReset}
                        disabled={resetLoading}
                      >
                        {resetLoading ? 'Sending reset link...' : 'Send reset link'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleBackToSignIn}
                      >
                        Back to Sign In
                      </Button>
                    </>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.name@atdawntech.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Only @atdawntech.com email addresses are allowed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
