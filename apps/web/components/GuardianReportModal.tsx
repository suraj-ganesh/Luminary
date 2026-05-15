"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Calendar, ShieldCheck, Activity, Award, Info, ExternalLink, Loader2 } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { supabase } from "../lib/supabase";
import TrendChart from "./TrendChart";
import dynamic from "next/dynamic";
const ExportPDF = dynamic(() => import("./ExportPDF"), { ssr: false });

interface GuardianReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  url: string;
  currentScore: number;
  scans?: any[];
}

export default function GuardianReportModal({ isOpen, onClose, siteId, url, currentScore, scans = [] }: GuardianReportModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [repoFullName, setRepoFullName] = useState("");
  const [isFixing, setIsFixing] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<{ percentile: number, neuralInsights: string[], portfolioAvg: number } | null>(null);

  useEffect(() => {
    if (isOpen && siteId) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const res = await fetch(`http://localhost:8080/api/history/site/${siteId}`);
          if (res.ok) {
            const data = await res.json();
            const formatted = data.map((d: any) => ({
              date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              score: d.score
            }));
            setHistory(formatted);
          }
        } catch (error) {
          console.error("Failed to fetch history:", error);
        } finally {
          setLoading(setLoading(false) as any); // Type hack for simplicity in this snippet
          setLoading(false);
        }
      };
      const fetchBenchmarks = async () => {
        try {
          const res = await fetch(`http://localhost:8080/api/monitoring/${siteId}/benchmarks`);
          if (res.ok) {
            const data = await res.json();
            setBenchmarks(data);
          }
        } catch (error) {
          console.error("Failed to fetch benchmarks:", error);
        }
      };
      fetchHistory();
      fetchBenchmarks();
    }
  }, [isOpen, siteId]);

  const previousScore = history.length > 1 ? history[history.length - 2].score : null;
  const isImproving = previousScore !== null && currentScore > previousScore;
  const isDeclining = previousScore !== null && currentScore < previousScore;

  const handleFixInWorkspace = async () => {
    if (!repoFullName) return;
    setIsFixing(true);
    setPrUrl(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('http://localhost:8080/api/remediation/github/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          repoFullName,
          violation: scans[0]?.results ? JSON.parse(scans[0].results)[0] : {}
        })
      });
      const data = await res.json();
      if (data.success) {
        setPrUrl(data.url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-black/5 flex items-center justify-between bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-black text-white flex items-center justify-center shadow-xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{url.replace('https://', '')}</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Guardian Intelligence Report</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="h-12 w-12 rounded-full hover:bg-black/5 flex items-center justify-center transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-3d-panel p-6">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">Current Score</p>
                  <p className="text-4xl font-bold">{currentScore}%</p>
                  <div className="mt-2 flex items-center gap-2">
                    {isImproving && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {isDeclining && <TrendingDown className="h-4 w-4 text-red-500" />}
                    <span className={`text-[10px] font-bold ${isImproving ? 'text-green-500' : isDeclining ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {previousScore !== null ? `${(currentScore - previousScore).toFixed(1)}% from last scan` : 'First scan data'}
                    </span>
                  </div>
                </div>
                <div className="glass-3d-panel p-6">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">Audit Velocity</p>
                  <p className="text-4xl font-bold">{history.length}</p>
                  <p className="mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Activity className="h-3 w-3" /> Total historical points
                  </p>
                </div>
                <div className="glass-3d-panel p-6 bg-gradient-to-br from-[#3b83f5]/5 to-[#2ecac5]/5 border-blue-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-blue-600/60 mb-2">Portfolio Ranking</p>
                  <p className="text-4xl font-bold">Top {benchmarks?.percentile || 15}%</p>
                  <p className="mt-2 text-[10px] font-bold text-blue-600/40 uppercase tracking-widest flex items-center gap-2">
                    <Award className="h-3 w-3" /> {benchmarks ? 'Outperforming portfolio' : 'Estate benchmark'}
                  </p>
                </div>
              </div>
              {/* Intelligence Insight */}
              <div className="glass-3d-panel p-8 relative overflow-hidden bg-black text-white border-none">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 mb-6 flex items-center gap-3">
                    <Info className="h-4 w-4" /> Guardian Intelligence Insight
                 </h3>
                 <p className="text-xl font-light leading-relaxed tracking-tight relative z-10">
                    {benchmarks?.neuralInsights.map((insight, idx) => (
                       <span key={idx} className={idx === 0 ? "text-blue-400 font-bold" : ""}>{insight} </span>
                    )) || "Analyzing portfolio data to generate neural compliance insights..."}
                    The recent {isImproving ? 'improvement' : 'audit'} suggests that your remediation efforts are taking effect.
                 </p>
              </div>

              {/* Fix in Workspace Section */}
              <div className="glass-3d-panel p-8 space-y-6 border-blue-500/20 bg-blue-500/[0.02]">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 flex items-center gap-2">
                       <FaGithub className="h-4 w-4" /> Fix in Workspace
                    </h3>
                    <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-[9px] font-bold uppercase tracking-widest">
                       Phase 12 Beta
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                       <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-2">GitHub Repository</label>
                       <input 
                         value={repoFullName}
                         onChange={(e) => setRepoFullName(e.target.value)}
                         placeholder="username/repository"
                         className="w-full h-14 px-6 bg-white border border-black/5 rounded-2xl text-xs font-bold outline-none focus:border-blue-500/30 transition-all shadow-sm"
                       />
                    </div>
                    <button 
                      onClick={handleFixInWorkspace}
                      disabled={isFixing || !repoFullName}
                      className="h-14 px-10 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/80 transition-all disabled:opacity-50 flex items-center gap-3 mt-auto"
                    >
                       {isFixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaGithub className="h-4 w-4" />}
                       {isFixing ? "Generating PR..." : "Create Remediation PR"}
                    </button>
                 </div>

                 {prUrl && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between"
                   >
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-lg bg-green-500 text-white flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4" />
                         </div>
                         <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Pull Request Created Successfully!</p>
                      </div>
                      <a 
                        href={prUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white border border-green-200 rounded-xl text-[9px] font-bold uppercase tracking-widest text-green-600 hover:bg-green-100 transition-all flex items-center gap-2"
                      >
                         View on GitHub <ExternalLink className="h-3 w-3" />
                      </a>
                   </motion.div>
                 )}
              </div>

              {/* Chart */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest ml-4">Historical Trajectory</h3>
                <div className="h-80 w-full">
                  {loading ? (
                    <div className="h-full w-full bg-black/5 animate-pulse rounded-3xl" />
                  ) : (
                    <TrendChart data={history} />
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-black/5 border-t border-black/5 flex justify-end gap-4">
              <button 
                onClick={onClose}
                className="px-8 py-3 rounded-full bg-white border border-black/5 font-bold text-[10px] uppercase tracking-widest hover:bg-black/5 transition-all"
              >
                Dismiss
              </button>
              <ExportPDF 
                url={url} 
                results={{ score: currentScore, violations: scans[0]?.results ? JSON.parse(scans[0].results) : [] }} 
                history={history}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
