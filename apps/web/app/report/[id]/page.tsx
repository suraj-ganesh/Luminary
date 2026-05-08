"use client";

import { useParams, useRouter } from "next/navigation";
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
  Sparkles,
  LayoutDashboard,
  Copy,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ViolationCard } from "../../../components/ViolationCard";
import { ScoreChart } from "../../../components/ScoreChart";
import dynamic from "next/dynamic";
import { supabase } from "../../../lib/supabase";
import ShareModal from "../../../components/ShareModal";

const ExportPDF = dynamic(() => import("../../../components/ExportPDF"), { 
  ssr: false,
  loading: () => (
    <button className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-black/5 text-black/20 text-[10px] font-bold uppercase tracking-widest cursor-wait">
      <Download className="h-3.5 w-3.5" /> Loading...
    </button>
  )
});

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/scan/${params.id}`);
        if (!response.ok) throw new Error("Report not found or inaccessible.");
        const data = await response.json();
        setResults(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchReport();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e3e2c3] flex flex-col items-center justify-center space-y-10 font-poppins">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <div className="text-center space-y-3">
           <h2 className="text-2xl font-bold tracking-tight uppercase">Retrieving Report...</h2>
           <p className="text-muted-foreground text-sm font-light tracking-[0.2em]">Accessing neural archive</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#e3e2c3] flex flex-col items-center justify-center p-6 text-center font-poppins">
        <div className="glass-3d-panel !p-16 max-w-lg space-y-8 border-red-500/20">
           <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
           <h2 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Report Not Found</h2>
           <p className="text-muted-foreground leading-relaxed font-light">{error}</p>
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
        url={typeof window !== 'undefined' ? window.location.href : ''}
        title={results?.url || ""}
      />

      {/* Header */}
      <div className="sticky top-0 z-50 px-6 py-6 flex justify-center pointer-events-none">
        <header className="px-10 h-16 w-full max-w-6xl flex items-center justify-between glass-3d-nav pointer-events-auto">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 p-3 rounded-full hover:bg-black/5 transition-colors text-muted-foreground hover:text-black">
              <LayoutDashboard className="h-4 w-4" />
            </Link>
            <div className="h-4 w-[1px] bg-black/10"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 leading-none mb-1">Archived Report</span>
              <span className="text-sm font-bold tracking-tight truncate max-w-[200px]">{results.url}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ExportPDF url={results.url} results={results} />
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-3 rounded-full bg-white border border-black/5 hover:bg-black/5 transition-all shadow-sm flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </header>
      </div>

      <main className="container max-w-6xl mx-auto mt-16 px-6 space-y-16 animate-popup">
        {/* Results Overview */}
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4 glass-3d-panel p-10 flex flex-col items-center justify-center">
            <ScoreChart score={results.score} />
            <div className="mt-10 text-center">
               <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">Health Index</h3>
               <p className="text-4xl font-light tracking-tighter uppercase">Verified Audit</p>
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 gap-6">
             <div className="glass-3d-panel p-8 space-y-8">
                <ShieldAlert className="h-6 w-6 text-red-600" />
                <div>
                   <h4 className="text-4xl font-light tracking-tighter">
                     {results.violations.filter((v: any) => v.impact === 'critical').length}
                   </h4>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-600/60 mt-1">Critical Risks</p>
                </div>
             </div>
             <div className="glass-3d-panel p-8 space-y-8">
                <AlertCircle className="h-6 w-6 text-orange-600" />
                <div>
                   <h4 className="text-4xl font-light tracking-tighter">
                     {results.violations.filter((v: any) => v.impact === 'serious').length}
                   </h4>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600/60 mt-1">Serious Alerts</p>
                </div>
             </div>
             <div className="glass-3d-panel p-8 space-y-8">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                   <h4 className="text-4xl font-light tracking-tighter">
                     {results.violations.filter((v: any) => v.impact === 'moderate' || v.impact === 'minor').length}
                   </h4>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600/60 mt-1">Minor Elements</p>
                </div>
             </div>
             <div className="glass-3d-panel p-8 space-y-8">
                <Clock className="h-6 w-6 text-black/40" />
                <div>
                   <h4 className="text-lg font-bold">{new Date(results.created_at).toLocaleDateString()}</h4>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mt-1">Scan Date</p>
                </div>
             </div>
          </div>
        </div>

        {/* Detailed Findings */}
        <div className="space-y-12">
          <h2 className="text-5xl tracking-tighter font-light uppercase border-b border-black/5 pb-10">Historical Findings</h2>
          <div className="grid gap-8">
            {results.violations.map((violation: any, i: number) => (
              <ViolationCard key={i} violation={violation} index={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
