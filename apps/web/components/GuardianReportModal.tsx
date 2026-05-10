"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Calendar, ShieldCheck, Activity } from "lucide-react";
import TrendChart from "./TrendChart";

interface GuardianReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  url: string;
  currentScore: number;
}

export default function GuardianReportModal({ isOpen, onClose, siteId, url, currentScore }: GuardianReportModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      fetchHistory();
    }
  }, [isOpen, siteId]);

  const previousScore = history.length > 1 ? history[history.length - 2].score : null;
  const isImproving = previousScore !== null && currentScore > previousScore;
  const isDeclining = previousScore !== null && currentScore < previousScore;

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
                <div className="glass-3d-panel p-6">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">Next Scheduled Scan</p>
                  <p className="text-4xl font-bold flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-black/10" /> 24h
                  </p>
                  <p className="mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Automatic Guardian check</p>
                </div>
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
              <button className="px-8 py-3 rounded-full bg-black text-white font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-black/20 hover:scale-105 transition-all">
                Download PDF History
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
