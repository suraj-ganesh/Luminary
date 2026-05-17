"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Lock,
  Loader2,
  UserPlus,
  User,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!supabase) {
        throw new Error("Connection issue. Please try again.");
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });

      if (signupError) {
        setError(signupError.message);
      } else if (data.user && data.user.identities?.length === 0) {
        setError("This account already exists. Please log in.");
      } else {
        const pendingToken = sessionStorage.getItem('pending_invite_token');
        setSuccess("Account created! Redirecting...");
        setTimeout(() => {
          if (pendingToken) {
            router.push(`/invite/${pendingToken}`);
          } else {
            router.push("/login");
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error("Signup error details:", err);
      if (err.message === "Failed to fetch") {
        setError("Network error: Failed to reach Supabase. Please check your internet connection, disable any ad-blockers, and ensure your Supabase project is not paused.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "github" | "google") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(`Login failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#e3e2c3] text-[#1a1a1a] flex overflow-hidden font-poppins">
      {/* Left Side: Illustration */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center bg-white/20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#2ecac5]/5 blur-[120px] rounded-full animate-pulse delay-700" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="relative z-10 text-center"
        >
          <div className="relative">
            <motion.div
              animate={{ 
                rotate: [0, 5, 0, -5, 0],
                scale: [1, 1.02, 1]
              }}
              transition={{ 
                duration: 10, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className="relative z-20"
            >
              <Image
                src="/logo.png"
                alt="Luminary Star"
                width={400}
                height={400}
                className="drop-shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
              />
            </motion.div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-blue-500/10 to-[#2ecac5]/10 blur-[100px] rounded-full z-10" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mt-12 space-y-4"
          >
            <h2 className="text-5xl font-bold tracking-tighter text-[#1a1a1a]">
              Luminary
            </h2>
            <p className="text-[#1a1a1a]/40 text-lg font-light tracking-wide max-w-md mx-auto">
              Check your website for accessibility with ease.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 md:p-16 relative">
        <Link
          href="/login"
          className="absolute top-8 right-8 flex items-center gap-2 group"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/40 group-hover:text-[#1a1a1a] transition-colors">
            Log in instead
          </span>
          <div className="p-2 rounded-full bg-black/5 border border-black/5 group-hover:bg-black/10 transition-all">
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="w-full max-w-md space-y-10"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3b83f5]/10 border border-[#3b83f5]/20 mb-4">
              <ShieldCheck className="h-3 w-3 text-[#3b83f5]" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#3b83f5]">New Account</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Sign up</h1>
            <p className="text-[#1a1a1a]/40 font-light">Join Luminary and start auditing.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/30 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20 group-focus-within:text-[#3b83f5] transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-white/50 border border-black/5 rounded-2xl pl-14 pr-5 focus:bg-white focus:border-[#3b83f5]/50 outline-none transition-all text-sm shadow-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/30 ml-1">
                Username
              </label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20 group-focus-within:text-[#3b83f5] transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-14 bg-white/50 border border-black/5 rounded-2xl pl-14 pr-5 focus:bg-white focus:border-[#3b83f5]/50 outline-none transition-all text-sm shadow-sm"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/30 ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20 group-focus-within:text-[#3b83f5] transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-white/50 border border-black/5 rounded-2xl pl-14 pr-5 focus:bg-white focus:border-[#3b83f5]/50 outline-none transition-all text-sm shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-600 text-[11px] font-medium flex items-center gap-3"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 text-green-600 text-[11px] font-medium flex items-center gap-3"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#3b83f5] hover:bg-[#3b83f5]/90 disabled:bg-[#3b83f5]/50 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Sign up
                </>
              )}
            </button>

            <p className="text-center text-[11px] font-medium text-[#1a1a1a]/60 mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-[#3b83f5] hover:underline font-bold">
                Log in
              </Link>
            </p>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-bold">
              <span className="bg-[#e3e2c3] px-4 text-black/20">Other options</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleOAuthLogin("github")}
              className="h-12 bg-white/40 border border-black/5 rounded-xl flex items-center justify-center gap-3 hover:bg-white transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm"
            >
              <FaGithub className="h-4 w-4 text-black/40" />
              Github
            </button>
            <button
              onClick={() => handleOAuthLogin("google")}
              className="h-12 bg-white/40 border border-black/5 rounded-xl flex items-center justify-center gap-3 hover:bg-white transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm"
            >
              <FaGoogle className="h-4 w-4 text-black/40" />
              Google
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
