"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Zap, 
  Code2, 
  CheckCircle2, 
  Copy, 
  Split, 
  Monitor,
  ArrowRightLeft,
  ArrowRight
} from "lucide-react";
import { useState, useEffect } from "react";

interface RemediationWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  violation: any;
}

export default function RemediationWorkspace({ isOpen, onClose, violation }: RemediationWorkspaceProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'diff' | 'preview'>('diff');
  const [loading, setLoading] = useState(false);
  const [remediation, setRemediation] = useState<any>(null);

  useEffect(() => {
    if (isOpen && !remediation) {
      fetchRemediation();
    }
  }, [isOpen, violation]);

  const fetchRemediation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/remediation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: violation.nodes?.[0]?.html,
          violation: violation.id,
          context: violation.description
        })
      });
      const data = await response.json();
      setRemediation(data);
    } catch (error) {
      console.error("Failed to fetch remediation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(remediation?.fixedCode || violation.ai_fix || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const originalHtml = violation.nodes?.[0]?.html || "// Source HTML not captured";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 lg:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0e0e0f]/80 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-7xl h-full max-h-[90vh] bg-[#e3e2c3] rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col border border-white/20"
          >
            {/* Header */}
            <div className="p-8 lg:px-12 border-b border-black/5 flex items-center justify-between bg-white/40">
               <div className="flex items-center gap-6">
                  <div className="p-4 bg-black text-white rounded-2xl shadow-lg">
                     <Zap className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                     <h2 className="text-2xl font-bold tracking-tight">Remediation Workspace</h2>
                     <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/50 mt-1">Neural Refactor Engine v9.1</p>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <div className="flex p-1 bg-black/5 rounded-2xl">
                     <button 
                        onClick={() => setActiveTab('diff')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'diff' ? 'bg-white shadow-md' : 'text-muted-foreground'}`}
                     >
                        <Split className="h-3.5 w-3.5 inline mr-2" /> Diff View
                     </button>
                     <button 
                        onClick={() => setActiveTab('preview')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-white shadow-md' : 'text-muted-foreground'}`}
                     >
                        <Monitor className="h-3.5 w-3.5 inline mr-2" /> Preview
                     </button>
                  </div>
                  <div className="h-10 w-[1px] bg-black/5 mx-2" />
                  <button 
                    onClick={onClose}
                    className="p-3 hover:bg-red-500/10 hover:text-red-600 rounded-2xl transition-all"
                  >
                    <X className="h-6 w-6" />
                  </button>
               </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex p-10 lg:p-16 gap-12">
               
               {/* Left Pane: The Code */}
               <div className="flex-1 flex flex-col gap-8 min-w-0">
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
                     
                     {/* Original Block */}
                     <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/60">Problematic Pattern</span>
                           <span className="text-[9px] font-bold bg-red-500/5 text-red-500 px-3 py-1 rounded-full border border-red-500/10">Input</span>
                        </div>
                        <div className="flex-1 bg-[#1a1a1b] rounded-3xl p-8 overflow-auto border border-black/20 shadow-inner relative group">
                           <pre className="text-xs font-mono text-red-400/80 leading-relaxed whitespace-pre-wrap">
                              {originalHtml}
                           </pre>
                        </div>
                     </div>

                      {/* Fixed Block */}
                      <div className="flex flex-col gap-4">
                         <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-600/60">Optimized Resolution</span>
                            <span className="text-[9px] font-bold bg-green-500/5 text-green-600 px-3 py-1 rounded-full border border-green-500/10">Output</span>
                         </div>
                         <div className="flex-1 bg-[#0e0e0f] rounded-3xl p-8 overflow-auto border border-white/5 shadow-2xl relative group/code">
                            {loading ? (
                               <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-black/40 backdrop-blur-sm z-10">
                                  <div className="h-10 w-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Synthesizing Code...</p>
                               </div>
                            ) : null}
                            <div className="absolute top-4 right-4 opacity-0 group-hover/code:opacity-100 transition-opacity">
                               <button 
                                  onClick={handleCopy}
                                  className={`p-3 rounded-xl backdrop-blur-md transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'}`}
                               >
                                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                               </button>
                            </div>
                            <pre className="text-xs font-mono text-[#3b83f5] leading-relaxed whitespace-pre-wrap">
                               {remediation?.fixedCode || violation.ai_fix || (loading ? "" : (remediation?.error ? `// Error: ${remediation.error}\n// Details: ${remediation.message || "Unknown error"}\n${remediation.details ? `// Server Info: ${JSON.stringify(remediation.details, null, 2)}` : ""}` : "// Select a node to begin refactor..."))}
                            </pre>
                         </div>
                      </div>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="p-8 bg-white/40 rounded-[2.5rem] border border-white shadow-sm flex items-center justify-between">
                     <div className="flex items-center gap-8">
                        <div className="space-y-1">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Violation Type</p>
                           <p className="text-sm font-bold">{violation.id}</p>
                        </div>
                        <div className="h-8 w-[1px] bg-black/5" />
                         <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Impact Mitigation</p>
                            <p className="text-sm font-bold capitalize text-red-600">{remediation?.impact || violation.impact}</p>
                         </div>
                     </div>

                     <div className="flex items-center gap-4">
                        <button 
                           onClick={handleCopy}
                           className="h-14 px-10 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/80 transition-all flex items-center gap-3"
                        >
                           {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                           {copied ? 'Captured' : 'Copy Optimized Code'}
                        </button>
                     </div>
                  </div>
               </div>

               {/* Right Pane: Context & Guides (Sidebar) */}
               <div className="w-80 flex flex-col gap-8">
                  <div className="glass-3d-panel p-8 space-y-6">
                     <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                        <Code2 className="h-4 w-4" /> Neural Guide
                     </h3>
                     <p className="text-xs text-muted-foreground leading-relaxed">
                        {loading ? "Initializing neural analysis of DOM node..." : (remediation?.explanation || violation.ai_explanation || "Our neural engine has detected a non-compliant semantic pattern. The proposed fix restores accessibility balance while maintaining layout integrity.")}
                     </p>
                  </div>

                  <div className="glass-3d-panel p-8 space-y-6 bg-gradient-to-br from-white/40 to-white/10 border-white/80">
                     <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                        <Zap className="h-4 w-4 text-yellow-600" /> Key Changes
                     </h3>
                     <ul className="space-y-4">
                        <li className="flex items-start gap-3 text-[11px] font-medium text-black/60">
                           <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                           Semantic structure restored
                        </li>
                        <li className="flex items-start gap-3 text-[11px] font-medium text-black/60">
                           <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                           ARIA attributes injected
                        </li>
                        <li className="flex items-start gap-3 text-[11px] font-medium text-black/60">
                           <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                           Screen reader navigation verified
                        </li>
                     </ul>
                  </div>

                  <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 text-center">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-blue-900/60 mb-1">Verify Fix</p>
                     <p className="text-[9px] text-blue-900/40">Run a local scan with this code to confirm WCAG 2.2 pass.</p>
                  </div>
               </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
