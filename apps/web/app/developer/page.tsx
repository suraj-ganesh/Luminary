"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  Code,
  Key,
  TerminalSquare,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  User as UserIcon,
  CreditCard,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "../../components/NotificationBell";

export default function DeveloperPage() {
  const [user, setUser] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  
  // Modal state for showing the full key once
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        fetchKeys(user.id);
        fetchWebhooks(user.id);
      }
    };
    checkUser();
  }, [router]);

  const fetchKeys = async (userId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/keys/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error("Failed to fetch keys:", error);
    }
  };

  const fetchWebhooks = async (userId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/webhooks/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data);
      }
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName || !user) return;
    setIsGenerating(true);
    try {
      const res = await fetch('http://localhost:8080/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: newKeyName })
      });
      if (res.ok) {
        const data = await res.json();
        setRevealedKey(data.key); // Show the full key in the modal
        setApiKeys([data.metadata, ...apiKeys]);
        setNewKeyName("");
      }
    } catch (error) {
      console.error("Failed to generate key:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegisterWebhook = async () => {
    if (!newWebhookUrl || !user) return;
    setIsRegisteringWebhook(true);
    try {
      const res = await fetch('http://localhost:8080/api/webhooks/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          url: newWebhookUrl,
          events: ['scan.completed']
        })
      });
      if (res.ok) {
        const data = await res.json();
        // The backend returns { message: '...', webhook: { ... } }
        const webhook = data.webhook || data;
        setWebhooks([webhook, ...webhooks]);
        setNewWebhookUrl("");
      }
    } catch (error) {
      console.error("Failed to register webhook:", error);
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/keys/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        setApiKeys(apiKeys.filter(k => k.id !== id));
      }
    } catch (error) {
      console.error("Failed to revoke key:", error);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Delete this webhook listener?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/webhooks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setWebhooks(webhooks.filter(w => w.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete webhook:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="min-h-screen bg-[#e3e2c3] text-[#1a1a1a] flex overflow-hidden font-poppins font-light">
      {/* Sidebar */}
      <aside className="w-80 border-r border-black/5 bg-white/60 backdrop-blur-3xl p-10 flex flex-col gap-16 relative z-20 shadow-xl shadow-black/[0.02]">
        <Link href="/" className="flex items-center gap-4 group px-2">
          <div className="h-12 w-12 flex items-center justify-center transition-transform duration-1000 group-hover:scale-110">
             <Image src="/logo.png" alt="Logo" width={60} height={60} className="scale-[2.8]" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-gradient">Luminary</span>
        </Link>

        <nav className="flex-1 space-y-3">
            <Link href="/dashboard" className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl hover:bg-black/5 transition-all text-muted-foreground hover:text-black group">
               <LayoutDashboard className="h-5 w-5 group-hover:text-black transition-colors" />
               <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Command Center</span>
            </Link>
            <Link href="/team" className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl hover:bg-black/5 transition-all text-muted-foreground hover:text-black group">
               <Users className="h-5 w-5 group-hover:text-black transition-colors" />
               <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Team Workspace</span>
            </Link>
           <button className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl bg-black text-white shadow-2xl shadow-black/20 group transition-all">
              <Code className="h-5 w-5" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Developer API</span>
           </button>
           <Link href="/pricing" className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl hover:bg-black/5 transition-all text-muted-foreground hover:text-black group">
              <CreditCard className="h-5 w-5 group-hover:text-black transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Pricing</span>
           </Link>
           <Link href="/profile" className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl hover:bg-black/5 transition-all text-muted-foreground hover:text-black group">
              <UserIcon className="h-5 w-5 group-hover:text-black transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Profile</span>
           </Link>
           <Link href="/settings" className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl hover:bg-black/5 transition-all text-muted-foreground hover:text-black group">
              <Settings className="h-5 w-5 group-hover:text-black transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Settings</span>
           </Link>
        </nav>

        <div className="pt-10 border-t border-black/5">
           <div className="flex items-center gap-4 px-5 py-4 mb-8 bg-black/5 rounded-3xl">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#3b83f5] to-[#2ecac5] flex items-center justify-center font-black text-white shadow-md">
                 {(user?.user_metadata?.username || user?.email)?.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                 <p className="text-[11px] font-bold uppercase tracking-widest truncate">{user?.user_metadata?.username || user?.email?.split('@')[0]}</p>
                 <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">Operative Level 3</p>
              </div>
           </div>
           {user?.id && <NotificationBell userId={user.id} />}
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-4 px-6 py-3 rounded-2xl hover:bg-red-500/5 text-muted-foreground hover:text-red-600 transition-all group"
           >
              <LogOut className="h-5 w-5" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Terminate</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10 p-12 lg:p-20">
        {loading ? (
          <div className="max-w-4xl mx-auto space-y-16 animate-pulse">
            <div className="space-y-4">
               <div className="h-8 w-32 bg-black/5 rounded-full"></div>
               <div className="h-16 w-96 bg-black/5 rounded-2xl"></div>
               <div className="h-6 w-80 bg-black/5 rounded-full"></div>
            </div>
            <div className="space-y-8">
               <div className="h-8 w-64 bg-black/5 rounded-full"></div>
               <div className="h-64 w-full bg-black/5 rounded-[2.5rem]"></div>
            </div>
            <div className="space-y-8">
               <div className="h-8 w-64 bg-black/5 rounded-full"></div>
               <div className="h-80 w-full bg-black/5 rounded-[2.5rem]"></div>
            </div>
          </div>
        ) : (
        <div className="max-w-4xl mx-auto space-y-16 pb-20">
          {/* Top Bar */}
          <div className="space-y-4">
             <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/50 border border-white shadow-sm mb-2">
                <Code className="h-4 w-4 text-black/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/60">Developer Hub</span>
             </div>
             <h1 className="text-5xl font-light tracking-tighter leading-none uppercase">API Management</h1>
             <p className="text-muted-foreground font-light text-lg">Integrate Luminary into your CI/CD pipelines and custom workflows.</p>
          </div>

          {/* API Keys Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-light tracking-tighter uppercase flex items-center gap-4 border-b border-black/5 pb-6">
              <Key className="h-6 w-6 text-black/40" /> Authentication Keys
            </h2>

            <div className="glass-3d-panel p-8">
              <div className="flex gap-4 mb-10">
                <input 
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 h-14 px-6 bg-white/40 border border-black/5 rounded-full text-[11px] font-bold uppercase tracking-widest outline-none focus:bg-white transition-all shadow-sm" 
                  placeholder="e.g., GitHub Actions Production" 
                />
                <button 
                  onClick={handleGenerateKey}
                  disabled={isGenerating || !newKeyName}
                  className="glass-3d-button h-14 px-8 text-[10px] font-bold uppercase tracking-widest !rounded-full disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? 'Generating...' : 'Create New Key'}
                </button>
              </div>

              <div className="space-y-4">
                {apiKeys.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-black/5 rounded-3xl">
                    <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">No active API keys found.</p>
                  </div>
                ) : (
                  apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-6 bg-white/50 border border-black/5 rounded-3xl hover:bg-white transition-colors group/key">
                      <div>
                        <h4 className="font-bold text-lg">{key.name}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <code className="text-[11px] font-mono bg-black/5 px-2 py-1 rounded text-black/60">{key.key_prefix}</code>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRevokeKey(key.id)}
                        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 transition-colors opacity-0 group-hover/key:opacity-100"
                        title="Revoke Key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Webhooks Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-light tracking-tighter uppercase flex items-center gap-4 border-b border-black/5 pb-6">
              <TerminalSquare className="h-6 w-6 text-black/40" /> Outbound Webhooks
            </h2>

            <div className="glass-3d-panel p-8">
              <div className="flex gap-4 mb-10">
                <input 
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="flex-1 h-14 px-6 bg-white/40 border border-black/5 rounded-full text-[11px] font-bold uppercase tracking-widest outline-none focus:bg-white transition-all shadow-sm" 
                  placeholder="https://your-server.com/webhook" 
                />
                <button 
                  onClick={handleRegisterWebhook}
                  disabled={isRegisteringWebhook || !newWebhookUrl}
                  className="glass-3d-button h-14 px-8 text-[10px] font-bold uppercase tracking-widest !rounded-full disabled:opacity-50 flex items-center gap-2"
                >
                  {isRegisteringWebhook ? 'Registering...' : 'Add Webhook'}
                </button>
              </div>

              <div className="space-y-4">
                {webhooks.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-black/5 rounded-3xl">
                    <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">No active webhooks configured.</p>
                  </div>
                ) : (
                  webhooks.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-6 bg-white/50 border border-black/5 rounded-3xl hover:bg-white transition-colors group/hook">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-3">
                           <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                           <p className="font-bold text-[13px] truncate">{webhook.url}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                           {webhook.events?.map((e: string) => (
                             <span key={e} className="text-[9px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-full">{e}</span>
                           ))}
                           <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                             Active since {new Date(webhook.created_at).toLocaleDateString()}
                           </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 transition-colors opacity-0 group-hover/hook:opacity-100"
                        title="Delete Webhook"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Start Documentation */}
          <div className="space-y-8">
            <h2 className="text-2xl font-light tracking-tighter uppercase flex items-center gap-4 border-b border-black/5 pb-6">
              <Code className="h-6 w-6 text-black/40" /> Developer Guide
            </h2>

            <div className="glass-3d-panel p-8 overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3b83f5] to-[#2ecac5]" />
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scan Endpoint</span>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 px-3 py-1 rounded-full">POST /api/public/scan</span>
              </div>
              
              <div className="bg-[#1a1a1a] rounded-2xl p-6 relative group/code">
                <button 
                  onClick={() => copyToClipboard(`curl -X POST http://127.0.0.1:8080/api/public/scan \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"url":"https://example.com"}'`)}
                  className="absolute top-4 right-4 h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all opacity-0 group-hover/code:opacity-100"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <pre className="text-[13px] font-mono text-white/80 overflow-x-auto leading-relaxed">
                  <span className="text-pink-400">curl</span> -X POST http://127.0.0.1:8080/api/public/scan \{"\n"}
                  {"  "}-H <span className="text-green-300">"Content-Type: application/json"</span> \{"\n"}
                  {"  "}-H <span className="text-green-300">"X-API-Key: YOUR_API_KEY"</span> \{"\n"}
                  {"  "}-d <span className="text-yellow-300">'{"{"}"url":"https://example.com"{"}"}'</span>
                </pre>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-white/50 rounded-2xl border border-black/5">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Headers</span>
                  <ul className="space-y-1 font-mono text-[11px]">
                    <li><span className="font-bold">Content-Type</span>: application/json</li>
                    <li><span className="font-bold">X-API-Key</span>: &lt;your_live_key&gt;</li>
                  </ul>
                </div>
                <div className="p-4 bg-white/50 rounded-2xl border border-black/5">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Body payload</span>
                  <ul className="space-y-1 font-mono text-[11px]">
                    <li><span className="font-bold">url</span> (string) - Required</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
        )}
      </main>

      {/* Secret Key Modal */}
      <AnimatePresence>
        {revealedKey && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl border border-black/10 overflow-hidden text-center"
            >
              <div className="h-16 w-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-light tracking-tighter mb-4">Save Your API Key</h3>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                Please copy this API key and store it somewhere safe. For your security, <strong className="text-black">we will never show it to you again.</strong>
              </p>

              <div className="flex items-center justify-between bg-black/5 border border-black/10 p-4 rounded-2xl mb-8">
                <code className="font-mono text-sm tracking-tight text-black">{revealedKey}</code>
                <button 
                  onClick={() => copyToClipboard(revealedKey)}
                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:bg-gray-50 transition-colors"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <button 
                onClick={() => setRevealedKey(null)}
                className="w-full py-4 rounded-full bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black/90 transition-colors"
              >
                I have saved my key
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
