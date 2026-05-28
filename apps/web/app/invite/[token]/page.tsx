"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Shield, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getApiUrl } from "../../../lib/api";

export default function InvitePage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthenticated'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleInvite = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus('unauthenticated');
        // Store the invite link to redirect back after login
        sessionStorage.setItem('pending_invite_token', params.token);
        return;
      }

      try {
        const res = await fetch(`${getApiUrl()}/api/orgs/invites/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: params.token, userId: user.id })
        });

        const data = await res.json();

        if (res.ok) {
          sessionStorage.removeItem('pending_invite_token');
          setStatus('success');
          setMessage("You have successfully joined the organization.");
          setTimeout(() => {
            router.push('/team');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || "Failed to accept invitation.");
        }
      } catch (error) {
        setStatus('error');
        setMessage("An unexpected error occurred while accepting the invitation.");
      }
    };

    handleInvite();
  }, [params.token, router]);

  return (
    <div className="min-h-screen bg-black/5 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-3d-panel max-w-md w-full p-10 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#3b83f5]/10 to-[#2ecac5]/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

        <Shield className="h-12 w-12 text-black/20 mx-auto mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-2">Team Invitation</h1>
        
        <div className="mt-8">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-xs uppercase tracking-widest font-bold">Verifying Invitation...</p>
            </div>
          )}

          {status === 'unauthenticated' && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">You need to sign in or create an account to accept this invitation.</p>
              <div className="flex flex-col gap-3">
                <Link href="/login" className="w-full h-12 bg-black text-white rounded-xl flex items-center justify-center text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-all shadow-xl shadow-black/10">
                  Sign In to Accept
                </Link>
                <Link href="/signup" className="w-full h-12 bg-white border border-black/10 text-black rounded-xl flex items-center justify-center text-xs font-bold uppercase tracking-widest hover:bg-black/5 transition-all">
                  Create Account
                </Link>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Redirecting to workspace...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-sm text-red-600 font-bold">{message}</p>
              <Link href="/dashboard" className="inline-block px-8 h-12 bg-black text-white rounded-xl flex items-center justify-center text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-all shadow-xl shadow-black/10">
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
