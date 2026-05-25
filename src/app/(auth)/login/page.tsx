'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'sonner';
import { Loader2, KeyRound, Mail, Warehouse, Shield, User, ArrowRight, Activity } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  // Handle URL errors (like from middleware blocks)
  useEffect(() => {
    const errorType = searchParams.get('error');
    if (errorType === 'account_disabled') {
      toast.error('Access Denied', {
        description: 'Your account has been deactivated by an administrator.',
        duration: 5000,
      });
    } else if (errorType === 'unauthorized_admin') {
      toast.error('Access Restricted', {
        description: 'You do not have administrative privileges to access that module.',
        duration: 5000,
      });
    } else if (errorType === 'unauthorized_module') {
      toast.error('Access Restricted', {
        description: 'You do not have permission to view that module. Please contact Admin.',
        duration: 5000,
      });
    } else if (errorType === 'no_module_access') {
      toast.error('Session Invalid', {
        description: 'You do not have active dashboard access permissions assigned.',
        duration: 5000,
      });
    }
  }, [searchParams]);

  // Standard Login Action
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Input Required', { description: 'Please enter both your email and password.' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Authentication Failed', { description: error.message });
      } else if (data?.user) {
        // Successful login, refresh router state and push to dashboard
        toast.success('Access Granted', { description: 'Welcome back to Rosebally Warehouse ERP!' });
        router.refresh();
        
        // Check if there was a redirected path, otherwise go to home
        const redirectTo = searchParams.get('redirected_to') || '/';
        router.push(redirectTo);
      }
    } catch (err: any) {
      toast.error('Runtime Exception', { description: err.message || 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Action
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.warning('Input Required', { description: 'Please enter your email address.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error('Failed to Send Email', { description: error.message });
      } else {
        toast.success('Email Dispatched', {
          description: 'A password reset link has been sent to your email inbox.',
        });
        setMode('login');
      }
    } catch (err: any) {
      toast.error('Runtime Exception', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo credentials helper
  const fillDemo = (role: 'super_admin' | 'warehouse_manager' | 'staff') => {
    if (role === 'super_admin') {
      setEmail('admin@rosebally.com');
      setPassword('admin1234');
    } else if (role === 'warehouse_manager') {
      setEmail('manager@rosebally.com');
      setPassword('manager1234');
    } else if (role === 'staff') {
      setEmail('staff@rosebally.com');
      setPassword('staff1234');
    }
    toast.info('Credentials Copied', { description: `Copied demo login for ${role.replace('_', ' ')}` });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC]">
      <Toaster position="top-right" closeButton richColors />
      
      <div className="w-full max-w-[480px] space-y-6">
        
        {/* Elite Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 border border-blue-100 rounded-xl mb-2 text-blue-600">
            <Warehouse className="w-8 h-8 font-semibold" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-sans">
            Rosebally ERP
          </h1>
          <p className="text-sm text-slate-500 font-medium font-sans">
            Garment Warehouse Cloud Management Console
          </p>
        </div>

        {/* Auth Forms */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-xl">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
          
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-slate-800 font-sans font-bold">
              {mode === 'login' ? 'System Authentication' : 'Account Recovery'}
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              {mode === 'login' 
                ? 'Enter credentials to access warehouse operations.' 
                : 'Enter your email address to receive a recovery link.'}
            </CardDescription>
          </CardHeader>

          {mode === 'login' ? (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-semibold font-sans">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-slate-700 font-semibold font-sans">Security Password</Label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                      required
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md hover:shadow-blue-600/10 transition-all duration-300 cursor-pointer rounded-xl py-2.5"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Decrypting Session...
                    </>
                  ) : (
                    <>
                      Sign In to Console
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-slate-700 font-semibold font-sans">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                      required
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer rounded-xl py-2.5"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    'Request Recovery Link'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl"
                  onClick={() => setMode('login')}
                  disabled={loading}
                >
                  Back to Sign In
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        {/* Demo Fast-Login Selector Panel */}
        {mode === 'login' && (
          <div className="bg-white/95 border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-md ">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 tracking-wider uppercase font-sans">
              <Activity className="w-4 h-4 text-blue-500" />
              Demo Roles Fast-Access
            </div>
            
            <p className="text-xs text-slate-500 leading-normal font-medium">
              Quickly load preset warehouse configuration roles to test route protections and module access control:
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('super_admin')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-rose-100 hover:border-rose-300 bg-rose-50/30 hover:bg-rose-50/80 transition-all text-center group"
              >
                <Shield className="w-5 h-5 text-rose-500 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-rose-600 uppercase font-sans">Super Admin</span>
              </button>
              
              <button
                type="button"
                onClick={() => fillDemo('warehouse_manager')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-sky-100 hover:border-sky-300 bg-sky-50/30 hover:bg-sky-50/80 transition-all text-center group"
              >
                <Warehouse className="w-5 h-5 text-sky-500 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-sky-600 uppercase font-sans">Manager</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('staff')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-100 hover:border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/80 transition-all text-center group"
              >
                <User className="w-5 h-5 text-emerald-500 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase font-sans">Staff</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-medium">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        Securing Operational Console...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
