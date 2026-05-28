"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, 
  ChevronLeft, 
  Download, 
  Share2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Sparkles as SparklesIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ViolationCard } from "../../components/ViolationCard";
import { ScoreChart } from "../../components/ScoreChart";
import dynamic from "next/dynamic";
import { supabase } from "../../lib/supabase";
import ShareModal from "../../components/ShareModal";
import { getApiUrl } from "../../lib/api";

const ExportPDF = dynamic(() => import("../../components/ExportPDF"), { 
  ssr: false,
  loading: () => (
    <button className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-black/5 text-black/20 text-[10px] font-bold uppercase tracking-widest cursor-wait">
      <Download className="h-3.5 w-3.5" /> Loading...
    </button>
  )
});

export default function ScanPage() {
  const router = useRouter();
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // On mount: grab URL from params, save to state, then clean the address bar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawUrl = params.get("url");
    const sessionUrl = typeof window !== 'undefined' ? window.sessionStorage.getItem('luminary_scan_url') : null;
    const selectedUrl = rawUrl || sessionUrl;

    if (!selectedUrl) {
      router.push("/");
      return;
    }

    setScanUrl(selectedUrl);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('luminary_scan_url');
      window.history.replaceState(null, '', '/scan');
    }
  }, [router]);

  // Set dynamic browser tab title
  useEffect(() => {
    if (loading) {
      document.title = 'Luminary — Scanning...';
    } else if (error) {
      document.title = 'Luminary — Scan Failed';
    } else if (results) {
      document.title = `Luminary — Results`;
    }
  }, [loading, error, results]);

  useEffect(() => {
    if (!scanUrl) return;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      try {
        const response = await fetch(`${getApiUrl()}/api/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: scanUrl, userId: user?.id }),
        });

        if (!response.ok) throw new Error("Neural link failed. Target inaccessible.");
        const data = await response.json();
        setResults(data);
        
        // Keep results page displayed for 3 seconds before redirecting to full report
        if (data?.id) {
          setTimeout(() => {
            router.push(`/report/${data.id}`);
          }, 3000);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [scanUrl, router]);

  const handleShare = () => {
    if (!results?.id) return;
    setIsShareModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e3e2c3] via-[#f0eedc] to-[#e3e2c3] flex flex-col items-center justify-center space-y-12 font-poppins overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-20 right-20 w-72 h-72 bg-[#3b83f5]/10 blur-3xl rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            className="absolute bottom-20 left-20 w-96 h-96 bg-[#2ecac5]/10 blur-3xl rounded-full"
          />
        </div>

        {/* Scanning Content */}
        <div className="relative z-10 text-center space-y-8">
          {/* Animated Loader */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-8"
          >
            <div className="relative w-24 h-24">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-transparent border-t-[#3b83f5] border-r-[#2ecac5] rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 border-2 border-transparent border-b-[#3b83f5] rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-[#3b83f5]" />
              </div>
            </div>
          </motion.div>

          {/* Scanning Status */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-4xl font-light tracking-tighter uppercase">Neural Scanning in Progress</h2>
            <p className="text-muted-foreground text-lg font-light tracking-[0.1em]">{scanUrl}</p>
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-4 pt-4"
          >
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="h-2 w-2 rounded-full bg-[#3b83f5]"
                />
              ))}
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-black/10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Loader2 className="h-4 w-4 text-[#3b83f5]" />
              </motion.div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-black/60">Analyzing...</span>
            </div>
          </motion.div>

          {/* Estimated Time */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
          >
            Estimated time: 2-5 seconds
          </motion.p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#e3e2c3] flex flex-col items-center justify-center p-6 text-center font-poppins">
        <div className="glass-3d-panel !p-16 max-w-lg space-y-8 border-red-500/20">
           <div className="p-4 bg-red-500/10 rounded-full w-fit mx-auto text-red-600">
             <AlertCircle className="h-10 w-10" />
           </div>
           <div className="space-y-3">
             <h2 className="text-3xl font-bold tracking-tight">Signal Interrupted</h2>
             <p className="text-muted-foreground leading-relaxed font-light">{error}</p>
           </div>
           <button onClick={() => router.push("/")} className="glass-3d-button w-full h-14 !rounded-full uppercase tracking-widest text-[11px]">Return to Base</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e3e2c3] text-[#1a1a1a] pb-40 font-poppins font-light">
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        url={`${typeof window !== 'undefined' ? window.location.origin : ''}/report/${results?.id}`}
        title={scanUrl || ""}
      />
      
      {/* Dynamic Header */}
      <div className="sticky top-0 z-50 px-6 py-6 flex justify-center pointer-events-none">
        <header className="px-10 h-16 w-full max-w-6xl flex items-center justify-between glass-3d-nav pointer-events-auto">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 p-3 rounded-full hover:bg-black/5 transition-colors text-muted-foreground hover:text-black">
              <LayoutDashboard className="h-4 w-4" />
            </Link>
            <div className="h-4 w-[1px] bg-black/10"></div>
            <button onClick={() => router.back()} className="p-3 rounded-full hover:bg-black/5 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="h-4 w-[1px] bg-black/10 mx-2"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 leading-none mb-1">Target Stream</span>
              <span className="text-sm font-bold tracking-tight truncate max-w-[200px]">{scanUrl}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ExportPDF url={scanUrl || ""} results={results} />
            <button 
              onClick={handleShare}
              disabled={!results?.id}
              className="p-3 rounded-full bg-white border border-black/5 hover:bg-black/5 transition-all shadow-sm flex items-center gap-2 disabled:opacity-30 group"
            >
              <Share2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </header>
      </div>

      <main className="container max-w-6xl mx-auto mt-16 px-6 space-y-16 animate-popup">
        {/* Results Overview */}
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4 glass-3d-panel p-10 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-all duration-1000"></div>
            <div className="relative z-10 w-full">
               <ScoreChart score={results.score} />
            </div>
            <div className="mt-10 text-center space-y-2">
               <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">Health Index</h3>
               <p className="text-4xl font-light tracking-tighter">OPERATIONAL</p>
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 gap-6">
             <div className="glass-3d-panel p-8 space-y-8 group hover:translate-y-[-5px] transition-all duration-700">
                <div className="p-4 bg-red-500/10 text-red-600 rounded-2xl w-fit shadow-sm">
                   <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                   <h4 className="text-4xl font-light tracking-tighter">
                     {results.violations.filter((v: any) => v.impact === 'critical').length}
                   </h4>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-600/60 mt-1">Critical Risks</p>
                </div>
             </div>
             <div className="glass-3d-panel p-8 space-y-8 group hover:translate-y-[-5px] transition-all duration-700">
                <div className="p-4 bg-orange-500/10 text-orange-600 rounded-2xl w-fit shadow-sm">
                   <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                   <h4 className="text-4xl font-light tracking-tighter">
                     {results.violations.filter((v: any) => v.impact === 'serious').length}
                   </h4>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600/60 mt-1">Serious Alerts</p>
                </div>
             </div>
             <div className="glass-3d-panel p-8 space-y-8 group hover:translate-y-[-5px] transition-all duration-700">
                <div className="p-4 bg-green-500/10 text-green-600 rounded-2xl w-fit shadow-sm">
                   <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                   <h4 className="text-4xl font-light tracking-tighter">
                     {results.violations.filter((v: any) => v.impact === 'moderate' || v.impact === 'minor').length}
                   </h4>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600/60 mt-1">Minor Elements</p>
                </div>
             </div>
             <div className="glass-3d-panel p-8 space-y-8 group hover:translate-y-[-5px] transition-all duration-700">
                <div className="p-4 bg-black/5 text-black rounded-2xl w-fit shadow-sm">
                   <Clock className="h-6 w-6" />
                </div>
                <div>
                   <h4 className="text-4xl font-light tracking-tighter">4s</h4>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mt-1">Crawl Time</p>
                </div>
             </div>
          </div>
        </div>

        {/* Detailed Findings */}
        <div className="space-y-12">
          <div className="flex items-center justify-between border-b border-black/5 pb-10">
             <div className="space-y-2">
                <div className="flex items-center gap-2 text-black/30">
                   <Sparkles className="h-4 w-4" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Neural Diagnostics</span>
                </div>
                <h2 className="text-5xl tracking-tighter font-light uppercase">Core Findings</h2>
             </div>
             <div className="flex items-center gap-3 px-6 py-3 bg-white/40 rounded-full border border-black/5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">AI Engine Active</span>
             </div>
          </div>

          <div className="grid gap-8">
            {results.violations.length > 0 ? (
              results.violations.map((violation: any, i: number) => (
                <ViolationCard key={i} violation={violation} index={i} />
              ))
            ) : (
              <div className="glass-3d-panel !p-20 text-center space-y-6">
                 <div className="p-6 bg-green-500/10 text-green-600 rounded-full w-fit mx-auto shadow-sm">
                    <CheckCircle2 className="h-16 w-16" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-3xl font-bold tracking-tight">Zero Risks Detected</h3>
                    <p className="text-muted-foreground font-light max-w-sm mx-auto">Neural scan confirms this target meets all accessibility standards.</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
