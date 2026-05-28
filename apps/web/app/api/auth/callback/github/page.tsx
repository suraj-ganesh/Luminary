"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getApiUrl } from "../../../../../lib/api";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("Authenticating with GitHub...");

  useEffect(() => {
    const code = searchParams.get('code');
    const userId = typeof window !== 'undefined' ? localStorage.getItem('luminary_integration_user') : null;

    if (!code || !userId) {
      setStatus('error');
      setMessage("Invalid callback parameters. Please try again.");
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/integrations/github/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, userId })
        });

        if (res.ok) {
          setStatus('success');
          setMessage("GitHub connected successfully! Redirecting...");
          setTimeout(() => router.push('/developer'), 2000);
        } else {
          const data = await res.json();
          setStatus('error');
          setMessage(data.error || "Failed to exchange code for token.");
        }
      } catch (error) {
        setStatus('error');
        setMessage("Server connection error during authentication.");
      }
    };

    exchangeCode();
  }, [searchParams, router]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-3d-panel max-w-md w-full p-12 text-center space-y-8"
    >
      <div className="flex justify-center">
        {status === 'loading' && (
           <div className="h-20 w-20 rounded-3xl bg-black/5 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-black/20 animate-spin" />
           </div>
        )}
        {status === 'success' && (
           <div className="h-20 w-20 rounded-3xl bg-green-50 text-green-500 flex items-center justify-center shadow-lg shadow-green-200">
              <ShieldCheck className="h-10 w-10" />
           </div>
        )}
        {status === 'error' && (
           <div className="h-20 w-20 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center shadow-lg shadow-red-200">
              <AlertCircle className="h-10 w-10" />
           </div>
        )}
      </div>

      <div className="space-y-2">
         <h2 className="text-2xl font-bold tracking-tight">GitHub Integration</h2>
         <p className="text-muted-foreground font-light text-sm leading-relaxed">{message}</p>
      </div>

      {status === 'error' && (
         <button 
           onClick={() => router.push('/developer')}
           className="w-full py-4 rounded-2xl bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black/80 transition-all"
         >
            Back to Developer Hub
         </button>
      )}
    </motion.div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="glass-3d-panel max-w-md w-full p-12 text-center">
          <Loader2 className="h-10 w-10 text-black/20 animate-spin mx-auto" />
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
