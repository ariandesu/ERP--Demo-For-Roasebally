'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast, Toaster } from 'sonner';
import { Loader2, KeyRound, Warehouse, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.warning('Input Required', { description: 'Please fill out both password fields.' });
      return;
    }

    if (password.length < 6) {
      toast.warning('Password Too Weak', { description: 'Password must be at least 6 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Mismatch Detected', { description: 'The passwords do not match. Please verify.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error('Failed to Update', { description: error.message });
      } else {
        setSuccess(true);
        toast.success('Password Updated', { description: 'Your security credentials have been updated.' });
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      toast.error('Runtime Exception', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC]">
      <Toaster position="top-right" closeButton richColors theme="light" />

      <div className="w-full max-w-[440px] space-y-6">
        
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 border border-blue-100 rounded-xl mb-2 text-blue-600">
            <Warehouse className="w-8 h-8 font-semibold" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-sans">
            Rosebally ERP
          </h1>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm rounded-xl">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />
          
          <CardHeader>
            <CardTitle className="text-xl text-slate-800 font-sans font-bold">Reset Security Password</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Establish a new secure access credential for your ERP user account.
            </CardDescription>
          </CardHeader>

          {success ? (
            <CardContent className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-slate-850">Credentials Synchronized</h3>
                <p className="text-sm text-slate-500 font-medium">
                  Redirecting to login dashboard...
                </p>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-semibold font-sans">New Password</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold font-sans">Confirm New Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 rounded-xl"
                      required
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md hover:shadow-blue-600/10 transition-all duration-300 cursor-pointer rounded-xl py-2.5"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Synchronizing Keys...
                    </>
                  ) : (
                    'Establish New Password'
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
