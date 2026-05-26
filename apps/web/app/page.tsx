"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  History,
  ChevronRight,
  Globe,
  User as UserIcon,
  LogOut,
  X,
  Trash2,
  ExternalLink,
  Activity,
  Loader2
} from "lucide-react";
import dynamic from "next/dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const ExportPDF = dynamic(() => import("../components/ExportPDF"), { 
  ssr: false,
  loading: () => (
    <div className="h-14 w-14 rounded-full bg-black/5 flex items-center justify-center animate-pulse">
      <Activity className="h-5 w-5 text-black/10" />
    </div>
  )
});

export default function Home() {

  const [url, setUrl] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, url: string } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const router = useRouter();


  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('scans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (data) setRecentScans(data);
      }
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowProfile(false);
    router.refresh();
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('luminary_scan_url', url);
    }
    setIsScanning(true);
    router.push('/scan');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteScan = (id: string, url: string) => {
    setConfirmDelete({ id, url });
  };

  const executeDelete = async () => {
    if (!confirmDelete || !user) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/scan/bulk/site`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: confirmDelete.url, userId: user.id })
      });

      if (response.ok) {
        setRecentScans(recentScans.filter(s => s.url !== confirmDelete.url));
        showToast("Audit log cleared for this site");
      } else {
        showToast("Failed to clear audit log", "error");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      showToast("Error connecting to server", "error");
    } finally {
      setConfirmDelete(null);
    }
  };


  const features = [
    {
      title: "Deep Crawling",
      desc: "Our headless browsers render your site exactly like a real user, finding issues static analyzers miss.",
      icon: <Globe className="h-6 w-6 text-blue-500" />,
    },
    {
      title: "AI Explanations",
      desc: "Stop Googling rule IDs. We use advanced LLMs to explain exactly what is wrong and how to fix it in plain English.",
      icon: <Sparkles className="h-6 w-6 text-teal-500" />,
    },
    {
      title: "WCAG 2.2 Ready",
      desc: "Always up-to-date with the latest accessibility standards to keep your business compliant and inclusive.",
      icon: <ShieldCheck className="h-6 w-6 text-green-500" />,
    }
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 40, scale: 0.98 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, amount: 0.3 }, // Triggers when 30% of the element is visible
    transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] as any }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#e3e2c3] text-[#1a1a1a] selection:bg-primary/20 overflow-x-hidden font-poppins font-light w-full">
      {/* Dynamic Floating Navbar */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="fixed top-8 left-0 right-0 z-50 flex justify-center px-4 md:px-6 pointer-events-none w-full"
      >
        <header className="px-6 md:px-10 h-16 w-full max-w-5xl flex items-center justify-between glass-3d-nav pointer-events-auto overflow-hidden">
          <Link href="/" className="flex items-center gap-2 md:gap-4 group shrink-0">
            <div className="relative h-10 w-10 md:h-12 md:w-12 flex items-center justify-center overflow-hidden transition-transform duration-1000 group-hover:scale-110">
              <Image
                src="/logo.png"
                alt="Luminary Logo"
                width={120}
                height={120}
                className="scale-[2.8] object-contain"
              />
            </div>
            <span className="font-bold text-xl md:text-2xl tracking-tight text-gradient">
              Luminary
            </span>
          </Link>
          <nav className="hidden lg:flex gap-10 shrink-0">
            {!user && <Link className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 hover:text-black transition-all" href="/#features">Features</Link>}
            {user && <Link className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 hover:text-black transition-all" href="/#history">History</Link>}
            <Link className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 hover:text-black transition-all" href="/pricing">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            {user ? (
              <div className="flex items-center gap-4 md:gap-6">
                <Link href="/dashboard" className="glass-3d-button px-6 md:px-8 py-2 text-[9px] font-bold uppercase tracking-widest !rounded-full">Dashboard</Link>
                <button 
                  onClick={() => setShowProfile(true)}
                  className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/80 border border-black/5 flex items-center justify-center hover:bg-white transition-all shadow-sm group"
                >
                  <UserIcon className="h-5 w-5 text-muted-foreground group-hover:text-black transition-colors" />
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 hover:text-black transition-all">Sign In</Link>
                <Link href="/signup" className="glass-3d-button px-6 md:px-8 py-2.5 text-[9px] font-bold uppercase tracking-widest !rounded-full shadow-2xl">Get Started</Link>
              </>
            )}
          </div>
        </header>
      </motion.div>

      <main className="flex-1 flex flex-col pt-32 pb-40 w-full overflow-hidden">
        {/* Hero Section */}
        <section className="w-full relative min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="container max-w-5xl space-y-12">
            <motion.div {...fadeInUp} className="space-y-8">
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-white mb-4 shadow-xl">
                <Sparkles className="h-4 w-4 text-black/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/60">Neural Accessibility Audit</span>
              </div>
              <h1 className="text-5xl tracking-tighter sm:text-7xl lg:text-8xl leading-[1.0] font-light">
                Making the <br />
                <span className="text-gradient font-semibold">invisible visible.</span>
              </h1>
              <p className="mx-auto max-w-xl text-muted-foreground text-base md:text-xl font-light leading-relaxed opacity-80">
                Analyze any website, identify violations, and receive production-ready code fixes in seconds.
              </p>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="w-full max-w-2xl mx-auto">
              <form onSubmit={handleScan} className="url-box-container flex items-center gap-3">
                <div className="flex-1 url-box-input-wrapper overflow-hidden">
                  <input className="w-full bg-transparent border-none focus:ring-0 outline-none text-lg text-[#1a1a1a] placeholder:text-[#1a1a1a]/30 font-medium" placeholder="Enter website URL..." type="url" required value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>
                <button type="submit" disabled={isScanning} className="glass-3d-button h-16 px-8 md:px-12 text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-4 !rounded-full shadow-2xl shrink-0 disabled:cursor-not-allowed disabled:opacity-80">
                  {isScanning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Scanning
                    </>
                  ) : (
                    <>
                      Scan Now <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </section>

        {/* Features Section - Only for Guests */}
        {!user && (
          <section id="features" className="w-full py-20 flex justify-center px-6 overflow-hidden">
            <div className="container max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <motion.div 
                  key={feature.title}
                  {...fadeInUp}
                  transition={{ delay: i * 0.15 }}
                  className="bg-white/90 rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-black/[0.02] group hover:translate-y-[-8px] transition-all duration-700"
                >
                  <div className="p-5 rounded-full bg-white shadow-[0_10px_25px_rgba(0,0,0,0.05)] group-hover:scale-110 transition-transform duration-700">
                    {feature.icon}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight">{feature.title}</h3>
                    <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed font-light">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* History Preview Section */}
        {user && (
          <section id="history" className="w-full py-24 flex justify-center px-6 overflow-hidden">
            <div className="container max-w-5xl space-y-12">
              <motion.div {...fadeInUp} className="flex flex-col md:flex-row items-end justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-black/20">
                    <History className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">SAVED OPERATIONS</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl tracking-tighter font-light uppercase">Audit Log</h2>
                </div>
                <Link href="/dashboard" className="text-[11px] font-bold uppercase tracking-widest text-black hover:underline decoration-2 underline-offset-8">ARCHIVE</Link>
              </motion.div>

              <div className="grid gap-4">
                {recentScans.map((scan, i) => (
                  <motion.div 
                    key={scan.id} 
                    {...fadeInUp} 
                    transition={{ delay: i * 0.1 }} 
                    className="glass-3d-panel !p-6 md:!p-8 flex flex-col md:flex-row items-center justify-between hover:bg-white transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-6 md:gap-8">
                      <div className="h-14 w-20 bg-black/5 rounded-2xl flex items-center justify-center font-bold text-[10px] text-black/20 uppercase shrink-0">
                        {scan.url.replace('https://', '').split(".")[0]}
                      </div>
                      <div className="overflow-hidden">
                        <Link href={`/report/${scan.id}`} className="text-lg md:text-xl font-bold tracking-tight truncate hover:text-primary transition-colors flex items-center gap-2">
                          {scan.url}
                          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 md:gap-12 mt-4 md:mt-0">
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 mb-1">SCORE</p>
                        <p className={`text-xl md:text-2xl font-bold ${scan.score >= 90 ? "text-green-600" : "text-primary"}`}>
                          {scan.score}%
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <ExportPDF 
                          url={scan.url} 
                          results={{ score: scan.score, violations: scan.results ? JSON.parse(scan.results) : [] }} 
                          iconOnly 
                        />
                        <Link 
                          href={`/report/${scan.id}`} 
                          className="h-14 w-14 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-500 shadow-sm"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Link>
                        <button 
                          onClick={() => handleDeleteScan(scan.id, scan.url)}
                          className="h-14 w-14 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all duration-500 shadow-sm"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {recentScans.length === 0 && (
                  <div className="py-16 text-center border-2 border-dashed border-black/5 rounded-[2.5rem]">
                    <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">No recent scans found.</p>
                  </div>
                )}
              </div>

            </div>
          </section>
        )}
      </main>

      <motion.footer {...fadeInUp} className="py-12 border-t border-black/5 w-full">
        <div className="container px-6 max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4 shrink-0">
            <div className="h-10 w-10 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={80} height={80} className="scale-[2.5]" />
            </div>
            <div className="font-bold text-xl tracking-tight text-gradient">Luminary</div>
          </div>
          <div className="flex gap-8 md:gap-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0">
            <Link href="#" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/developer" className="hover:text-black transition-colors">API</Link>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 shrink-0">© {new Date().getFullYear()} Luminary</div>
        </div>
      </motion.footer>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && user && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfile(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white/90 backdrop-blur-2xl rounded-[3rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] border border-white overflow-hidden"
            >
              <button 
                onClick={() => setShowProfile(false)}
                className="absolute top-8 right-8 p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-[#3b83f5] to-[#2ecac5] p-1 shadow-2xl">
                  <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-3xl font-bold text-gradient">
                    {(user?.user_metadata?.username || user?.email)?.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {user?.user_metadata?.username || "Neural Operative"}
                  </h3>
                  <p className="text-sm text-muted-foreground font-light">{user?.email}</p>
                </div>

                <div className="w-full pt-6 border-t border-black/5 flex flex-col gap-3">
                  <Link 
                    href="/dashboard" 
                    onClick={() => setShowProfile(false)}
                    className="w-full h-14 flex items-center justify-center rounded-2xl bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all"
                  >
                    Go to Dashboard
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="w-full h-14 flex items-center justify-center rounded-2xl bg-red-500/10 text-red-600 text-[11px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all gap-3"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Confirmation & Toast Modals */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 max-w-sm w-full mx-4"
            >
              <h3 className="text-xl font-bold mb-2">Are you sure?</h3>
              <p className="text-muted-foreground text-sm mb-8 font-light">
                This will permanently remove all scan history for this site from your audit log.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-full bg-black/5 hover:bg-black/10 font-bold text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-500/30"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full flex items-center gap-3 shadow-2xl z-[200] backdrop-blur-xl border border-white/20 text-[10px] font-bold tracking-widest uppercase ${
              toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-black/90 text-white'
            }`}
          >
            {toast.type === 'success' ? <ShieldCheck className="h-4 w-4 text-green-400" /> : <Activity className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}
