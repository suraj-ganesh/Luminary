"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { getApiUrl } from "../../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  ChevronRight, 
  BarChart3, 
  Activity,
  ShieldCheck,
  Download,
  ExternalLink,
  Loader2,
  User as UserIcon,
  Users,
  Code,
  CreditCard,
  Trash2,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TrendChart from "../../../components/TrendChart";
import dynamic from "next/dynamic";
import UsageIndicator from "../../../components/UsageIndicator";
import NotificationBell from "../../../components/NotificationBell";
import Sparkline from "../../../components/Sparkline";
import GuardianReportModal from "../../../components/GuardianReportModal";

const ExportPDF = dynamic(() => import("../../../components/ExportPDF"), { 
  ssr: false,
  loading: () => (
    <div className="h-14 w-14 rounded-full bg-black/5 flex items-center justify-center animate-pulse">
      <Download className="h-5 w-5 text-black/10" />
    </div>
  )
});
// Code and CreditCard moved to main import above

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [scanCount, setScanCount] = useState(0);
  const [monitoredSites, setMonitoredSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'site' | 'scan', id: string, url?: string } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [selectedSite, setSelectedSite] = useState<{ id: string, url: string, score: number } | null>(null);
  const router = useRouter();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        
        // Fetch real scans
        const { data: scanData } = await supabase
          .from('scans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (scanData) setScans(scanData);

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        // Fetch scan count
        const { count } = await supabase
          .from('scans')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setScanCount(count || 0);

        // Fetch monitored sites
        const { data: monitorData } = await supabase
          .from('monitored_sites')
          .select('*')
          .eq('user_id', user.id);
        
        if (monitorData) setMonitoredSites(monitorData);
        
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleRegisterMonitoring = async () => {
    if (!newUrl) return;
    const normalizedNew = newUrl.replace(/\/$/, '').toLowerCase();
    if (monitoredSites.some(s => s.url.replace(/\/$/, '').toLowerCase() === normalizedNew)) {
      showToast("This site is already in your watchlist", "error");
      setNewUrl("");
      return;
    }
    setIsAdding(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/monitoring/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          userId: user.id,
          frequency: 'weekly'
        })
      });
      if (response.ok) {
        const { site } = await response.json();
        setMonitoredSites([...monitoredSites, site]);
        setNewUrl("");
      }
    } catch (error) {
      console.error("Failed to register site:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { type, id, url } = confirmDelete;
    
    if (type === 'site') {
      try {
        const res = await fetch(`${getApiUrl()}/api/monitoring/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setMonitoredSites(monitoredSites.filter(site => site.id !== id));
          showToast("Site removed from watchlist");
        } else {
          showToast("Failed to remove site", "error");
        }
      } catch (error) {
        console.error("Failed to delete monitored site:", error);
        showToast("Error connecting to server", "error");
      }
    } else if (type === 'scan' && url) {
      try {
        const res = await fetch(`${getApiUrl()}/api/scan/bulk/site`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, userId: user.id })
        });
        if (res.ok) {
          setScans(scans.filter(scan => scan.url !== url));
          showToast("Audit log cleared for this site");
        } else {
          showToast("Failed to clear audit log", "error");
        }
      } catch (error) {
        console.error("Failed to delete scan:", error);
        showToast("Error connecting to server", "error");
      }
    }
    setConfirmDelete(null);
  };

  const handleToggleMonitoring = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/monitoring/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus })
      });
      if (res.ok) {
        setMonitoredSites(monitoredSites.map(s => s.id === id ? { ...s, active: !currentStatus } : s));
        showToast(`Monitoring ${!currentStatus ? 'resumed' : 'paused'}`);
      }
    } catch (error) {
      console.error("Failed to toggle monitoring:", error);
    }
  };

  const handleTriggerScan = async (id: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/monitoring/${id}/trigger`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast("Scan triggered successfully");
      }
    } catch (error) {
      console.error("Failed to trigger scan:", error);
    }
  };

  const handleDeleteMonitoredSite = (id: string) => {
    setConfirmDelete({ type: 'site', id });
  };

  const handleDeleteScan = (id: string, url: string) => {
    setConfirmDelete({ type: 'scan', id, url });
  };

  const handleExportEstateSummary = async () => {
    if (monitoredSites.length === 0) {
      showToast("No sites to export", "error");
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const brandColor = [59, 131, 245] as const;
      const textColor = [26, 26, 26] as const;

      // Header
      doc.setFillColor(19, 19, 20);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("LUMINARY", 20, 22);
      doc.setFontSize(10);
      doc.text("PORTFOLIO COMPLIANCE REPORT", 160, 25);

      // Report Details
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Portfolio Summary", 20, 60);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 70);
      doc.text(`Total Sites: ${monitoredSites.length}`, 20, 78);
      doc.text(`Average Score: ${scans.length > 0 ? (scans.reduce((a, s) => a + s.score, 0) / scans.length).toFixed(1) : "N/A"}%`, 20, 86);

      let yPos = 100;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Monitored Sites", 20, yPos);
      yPos += 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      monitoredSites.forEach((site) => {
        const siteScans = scans.filter(s => s.url === site.url);
        const avgScore = siteScans.length > 0 ? (siteScans.reduce((a, s) => a + s.score, 0) / siteScans.length).toFixed(1) : "N/A";
        doc.text(`• ${site.url.replace('https://', '')} - Score: ${avgScore}%`, 20, yPos);
        yPos += 6;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });

      doc.save("luminary-portfolio-compliance.pdf");
      showToast("Portfolio compliance report exported successfully", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Failed to export report", "error");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const uniqueScans = scans.filter((scan, index, self) =>
    index === self.findIndex((s) => s.url === scan.url)
  );

  const trendData = uniqueScans
    .filter(s => s.created_at && s.score != null) // Guard against null/missing values
    .slice(0, 10)
    .reverse()
    .map(s => ({
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Number(s.score)
    }));

  return (
    <>
        {loading ? (
          <div className="max-w-6xl mx-auto space-y-16 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                 <div className="h-16 w-96 bg-black/5 rounded-2xl"></div>
                 <div className="h-6 w-64 bg-black/5 rounded-full"></div>
              </div>
              <div className="h-16 w-40 bg-black/5 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               <div className="lg:col-span-2 h-96 bg-black/5 rounded-[2.5rem]"></div>
               <div className="h-96 bg-black/5 rounded-[2.5rem]"></div>
            </div>
            <div className="space-y-6">
               <div className="h-10 w-64 bg-black/5 rounded-2xl"></div>
               <div className="grid grid-cols-3 gap-8">
                  <div className="h-48 bg-black/5 rounded-[2.5rem]"></div>
                  <div className="h-48 bg-black/5 rounded-[2.5rem]"></div>
                  <div className="h-48 bg-black/5 rounded-[2.5rem]"></div>
               </div>
            </div>
          </div>
        ) : (
        <div className="max-w-6xl mx-auto space-y-16">
           {/* Top Bar */}
           <div className="flex items-center justify-between">
              <div className="space-y-2">
                 <h1 className="text-6xl font-light tracking-tighter leading-none uppercase">Command Center</h1>
                 <p className="text-muted-foreground font-light text-lg">Monitoring {scans.length} active audit streams across your estate.</p>
              </div>
              <Link href="/" className="glass-3d-button h-16 px-10 text-[11px] font-bold uppercase tracking-[0.3em] !rounded-full flex items-center gap-3">
                 <Plus className="h-5 w-5" /> Add Audit
              </Link>
           </div>

           {/* Stats & Trends */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                 <TrendChart data={trendData} />
              </div>
              <div className="glass-3d-panel p-10 flex flex-col justify-between">
                 <div>
                    <div className="p-4 w-fit rounded-2xl bg-gradient-to-br from-[#3b83f5] to-[#2ecac5] text-white shadow-lg mb-6">
                       <Activity className="h-6 w-6" />
                    </div>
                    <h3 className="text-4xl font-light tracking-tighter">
                      {scans.length > 0 ? (scans.reduce((acc, s) => acc + s.score, 0) / scans.length).toFixed(1) : '0'}%
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-1">Average Health Index</p>
                 </div>
                  <div className="pt-8 border-t border-black/5 mt-8 space-y-8">
                    <UsageIndicator 
                      current={scanCount} 
                      limit={profile?.plan === 'pro' ? 500 : profile?.plan === 'enterprise' ? 10000 : 10} 
                      label="Quota Utilization" 
                    />
                    <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Current Plan</p>
                      <p className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-3 py-1 rounded-full">{profile?.plan || 'Free'}</p>
                    </div>
                  </div>
              </div>
           </div>

           {/* Phase 12: Enterprise Insights & Ops */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Portfolio Export (Enterprise) */}
              <div className="lg:col-span-2 glass-3d-panel p-10 bg-gradient-to-br from-[#1a1a1b] to-black border-none text-white overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-80 h-80 bg-[#3b83f5]/20 rounded-full blur-[100px] -mr-20 -mt-20"></div>
                 <div className="flex items-center justify-between h-full relative z-10">
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 w-fit">
                          <Download className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Enterprise Feature</span>
                       </div>
                       <h3 className="text-4xl font-light tracking-tighter uppercase leading-none">Portfolio<br />Compliance Export</h3>
                       <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em]">Generate a single PDF report for all {monitoredSites.length} monitored domains</p>
                    </div>
                    <button 
                       onClick={handleExportEstateSummary}
                       className="h-16 px-10 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-3 shadow-2xl"
                    >
                       <Download className="h-4 w-4" /> Export Estate Summary
                    </button>
                 </div>
              </div>

              {/* Scheduled Ops */}
              <div className="glass-3d-panel p-10 flex flex-col">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-8 flex items-center gap-3">
                    <Calendar className="h-4 w-4" /> Next Scheduled Audits
                 </h3>
                 <div className="flex-1 space-y-4">
                    {monitoredSites.length > 0 ? monitoredSites.slice(0, 3).map(site => (
                       <div key={site.id} className="flex items-center justify-between p-4 bg-black/[0.03] rounded-2xl border border-black/5 hover:bg-white hover:shadow-xl transition-all duration-500 group">
                          <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-xl bg-black/5 flex items-center justify-center font-bold text-[10px] text-black/20 group-hover:bg-black group-hover:text-white transition-colors uppercase">
                                {site.url.replace('https://', '').charAt(0)}
                             </div>
                             <span className="text-[11px] font-bold truncate w-24 group-hover:w-32 transition-all">{site.url.replace('https://', '')}</span>
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-white px-3 py-1.5 rounded-full border border-black/5">
                             In ~{Math.floor(Math.random() * 24) + 1}h
                          </span>
                       </div>
                    )) : (
                       <div className="h-full flex items-center justify-center text-center">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">No active schedules</p>
                       </div>
                    )}
                 </div>
                 <button 
                   onClick={() => router.push("/settings")}
                   className="w-full py-4 mt-6 rounded-2xl bg-black/5 hover:bg-black hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest"
                 >
                    Manage Schedules
                 </button>
              </div>
           </div>

           {/* Watchlist Section */}
           <div className="space-y-10">
              <div className="flex items-center justify-between border-b border-black/5 pb-10">
                 <h2 className="text-3xl font-light tracking-tighter uppercase flex items-center gap-4">
                    <ShieldCheck className="h-8 w-8 text-black/10" /> Site Watchlist
                 </h2>
                 <div className="flex gap-4">
                    <input 
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="h-14 w-80 px-6 bg-white/40 border border-black/5 rounded-full text-[11px] font-bold uppercase tracking-widest outline-none focus:bg-white transition-all shadow-sm" 
                      placeholder="Enter URL to monitor..." 
                    />
                    <button 
                      onClick={handleRegisterMonitoring}
                      disabled={isAdding}
                      className="glass-3d-button h-14 px-8 text-[10px] font-bold uppercase tracking-widest !rounded-full disabled:opacity-50"
                    >
                       {isAdding ? 'Registering...' : 'Monitor Site'}
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {monitoredSites.map((site) => (
                    <motion.div 
                      key={site.id}
                      onClick={() => setSelectedSite({ id: site.id, url: site.url, score: site.last_score || 0 })}
                      className="glass-3d-panel p-8 space-y-6 group hover:translate-y-[-5px] transition-all duration-700 cursor-pointer"
                    >
                       <div className="flex justify-between items-start">
                          <div className="space-y-1">
                             <h4 className="font-bold text-lg truncate w-40">{site.url.replace('https://', '')}</h4>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Frequency: {site.frequency}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${site.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {site.active ? 'Live' : 'Paused'}
                          </div>
                       </div>
                       
                       {/* Sparkline Visualization */}
                       <div className="h-10 w-full bg-black/[0.02] rounded-xl px-2 py-1">
                          <Sparkline data={scans.filter(s => s.url === site.url).slice(0, 10).reverse().map(s => ({ score: s.score }))} />
                       </div>

                       <div className="flex items-end justify-between">
                          <div>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Last Score</p>
                             <p className="text-3xl font-bold">{site.last_score || 'N/A'}%</p>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleTriggerScan(site.id); }}
                               className="h-12 w-12 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all"
                               title="Trigger Scan Now"
                             >
                                <Activity className="h-5 w-5" />
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleToggleMonitoring(site.id, site.active); }}
                               className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${site.active ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-green-500/10 text-green-600 hover:bg-green-600 hover:text-white'}`}
                               title={site.active ? 'Pause Monitoring' : 'Resume Monitoring'}
                             >
                                < ShieldCheck className="h-5 w-5" />
                             </button>
                             <Link href={`/scan?url=${encodeURIComponent(site.url)}`} onClick={(e) => e.stopPropagation()} className="h-12 w-12 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all">
                                <ExternalLink className="h-5 w-5" />
                             </Link>
                             <button onClick={(e) => { e.stopPropagation(); handleDeleteMonitoredSite(site.id); }} className="h-12 w-12 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                                <Trash2 className="h-5 w-5" />
                             </button>
                          </div>
                       </div>
                    </motion.div>
                 ))}
                 {monitoredSites.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-black/5 rounded-3xl">
                       <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">No sites currently in watchlist.</p>
                    </div>
                 )}
              </div>
           </div>

           {/* Recent Audits Log */}
           <div className="space-y-10">
              <div className="flex items-center justify-between border-b border-black/5 pb-10">
                 <h2 className="text-3xl font-light tracking-tighter uppercase flex items-center gap-4">
                    <History className="h-8 w-8 text-black/10" /> Audit Log
                 </h2>
                 <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20" />
                    <input className="h-14 w-80 pl-12 pr-6 bg-white/40 border border-black/5 rounded-full text-[11px] font-bold uppercase tracking-widest outline-none focus:bg-white transition-all shadow-sm" placeholder="Search archive..." />
                 </div>
              </div>

              <div className="grid gap-6">
                 {uniqueScans.map((scan, i) => (
                    <motion.div 
                      key={scan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="glass-3d-panel !p-8 flex items-center justify-between hover:bg-white transition-all duration-700 shadow-sm group"
                    >
                       <div className="flex items-center gap-10">
                          <div className="h-16 w-24 bg-black/5 rounded-2xl flex items-center justify-center overflow-hidden border border-black/5">
                             <div className="text-[11px] font-bold text-black/20 uppercase">{scan.url.replace('https://', '').split('.')[0]}</div>
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                                {scan.url}
                                <ExternalLink className="h-4 w-4 text-black/10 group-hover:text-primary transition-colors ml-2" />
                             </h4>
                             <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">{new Date(scan.created_at).toDateString()}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-16">
                          <div className="text-right">
                             <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Index</p>
                             <p className={`text-3xl font-bold ${scan.score >= 90 ? 'text-green-600' : 'text-primary'}`}>{scan.score}%</p>
                          </div>
                          <div className="flex items-center gap-4">
                              <ExportPDF 
                                url={scan.url} 
                                results={{ score: scan.score, violations: scan.results ? JSON.parse(scan.results) : [] }} 
                                iconOnly 
                              />
                           <Link href={`/report/${scan.id}`} className="h-14 w-14 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-500 shadow-sm">
                              <ChevronRight className="h-5 w-5" />
                            </Link>
                            <button onClick={() => handleDeleteScan(scan.id, scan.url)} className="h-14 w-14 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all duration-500 shadow-sm">
                               <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                       </div>
                    </motion.div>
                 ))}
                 {scans.length === 0 && (
                    <div className="py-20 text-center glass-3d-panel border-dashed border-2">
                       <p className="text-muted-foreground uppercase tracking-widest font-bold text-sm">No scan history available.</p>
                       <Link href="/" className="inline-block mt-6 text-[#3b83f5] font-bold uppercase tracking-widest text-[10px] hover:underline underline-offset-8">Run your first audit →</Link>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 max-w-sm w-full mx-4"
            >
              <h3 className="text-xl font-bold mb-2">Are you sure?</h3>
              <p className="text-muted-foreground text-sm mb-8 font-light">
                {confirmDelete.type === 'site' 
                  ? "This will remove the site from your watchlist." 
                  : "This will permanently remove all scan history for this site from your audit log."}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-full bg-black/5 hover:bg-black/10 font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-500/30"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full flex items-center gap-3 shadow-2xl z-50 backdrop-blur-xl border border-white/20 text-sm font-bold tracking-widest uppercase ${
              toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-black/90 text-white'
            }`}
          >
            {toast.type === 'success' ? <ShieldCheck className="h-5 w-5 text-green-400" /> : <Activity className="h-5 w-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <GuardianReportModal 
        isOpen={!!selectedSite}
        onClose={() => setSelectedSite(null)}
        siteId={selectedSite?.id || ""}
        url={selectedSite?.url || ""}
        currentScore={selectedSite?.score || 0}
        scans={scans.filter(s => s.url === selectedSite?.url)}
      />
    </>
  );
}
