"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
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
  Users,
  Zap,
  Info,
  Loader2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "../../../components/NotificationBell";
import { FaGithub, FaSlack, FaDiscord } from "react-icons/fa";
import { getApiUrl } from "../../../lib/api";


// Custom Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 border ${
        type === 'success' ? 'bg-black text-white border-white/10' : 'bg-red-500 text-white border-red-600'
      }`}
    >
      {type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <AlertTriangle className="h-4 w-4" />}
      <span className="text-[11px] font-bold uppercase tracking-widest">{message}</span>
    </motion.div>
  );
};

export default function DeveloperPage() {
  const [user, setUser] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [webhookModal, setWebhookModal] = useState<{ type: string, isOpen: boolean }>({ type: '', isOpen: false });
  const [integrationWebhookUrl, setIntegrationWebhookUrl] = useState("");
  const [deleteKeyModal, setDeleteKeyModal] = useState<{ isOpen: boolean; keyId: string | null; keyName: string | null }>({ isOpen: false, keyId: null, keyName: null });
  const [isDeletingKey, setIsDeletingKey] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
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
        fetchIntegrations(user.id);
      }
    };
    checkUser();
  }, [router]);

  const fetchKeys = async (userId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/keys/${userId}`);
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
      const res = await fetch(`${getApiUrl()}/api/webhooks/${userId}`);
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

  const fetchIntegrations = async (userId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/integrations/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    }
  };

  const handleConnectIntegration = async (type: string) => {
    if (!user) return;
    setIsConnecting(type);
    const apiUrl = getApiUrl();
    console.log(`Connecting to ${type} at ${apiUrl}`);
    try {
      if (type === 'github') {
        const authRes = await fetch(`${apiUrl}/api/integrations/github/authorize`);
        const { url } = await authRes.json();
        localStorage.setItem('luminary_integration_user', user.id);
        window.location.href = url;
        
        return;
      }

      if (type === 'slack' || type === 'discord') {
        setWebhookModal({ type, isOpen: true });
        setIsConnecting(null);
        return;
      }

      // For others, we simulate a successful connection for Phase 12
      const res = await fetch(`${apiUrl}/api/integrations/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          type,
          config: { connected_at: new Date().toISOString() }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIntegrations([data.integration, ...integrations.filter(i => i.type !== type)]);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} connected successfully!`);
      } else {
        showToast("Failed to connect integration", "error");
      }
    } catch (error) {
      console.error("Failed to connect integration:", error);
      showToast("Server connection error", "error");
    } finally {
      setIsConnecting(null);
    }
  };

  const handleSaveIntegrationWebhook = async () => {
    if (!integrationWebhookUrl || !user) return;
    setIsConnecting(webhookModal.type);
    const apiUrl = getApiUrl();

    try {
      const res = await fetch(`${apiUrl}/api/integrations/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          type: webhookModal.type,
          config: { webhook_url: integrationWebhookUrl }
        })
      });

      if (res.ok) {
        showToast(`${webhookModal.type.charAt(0).toUpperCase() + webhookModal.type.slice(1)} connected successfully!`);
        setWebhookModal({ type: '', isOpen: false });
        setIntegrationWebhookUrl("");
        fetchIntegrations(user.id);
      } else {
        showToast("Failed to connect integration", "error");
      }
    } catch (error) {
      console.error("Failed to save integration webhook:", error);
      showToast("Server connection error", "error");
    } finally {
      setIsConnecting(null);
    }
  };

  const handleRemoveIntegration = async (id: string) => {
    const apiUrl = getApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/integrations/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setIntegrations(integrations.filter(i => i.id !== id));
        showToast("Integration disconnected successfully");
      } else {
        showToast("Failed to disconnect integration", "error");
      }
    } catch (error) {
      console.error("Failed to remove integration:", error);
      showToast("Server connection error", "error");
    }
  };

  const handleTestIntegration = async (id: string) => {
    const apiUrl = getApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/integrations/${id}/test`, { method: 'POST' });
      if (res.ok) {
        showToast("Test notification sent!");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to send test notification", "error");
      }
    } catch (error) {
      showToast("Server connection error", "error");
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName || !user) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/keys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: newKeyName })
      });
      if (res.ok) {
        const data = await res.json();
        setRevealedKey(data.key); // Show the full key in the modal
        setApiKeys([data.metadata, ...apiKeys]);
        setNewKeyName("");
        showToast("API Key generated successfully. Save it now!", "success");
      } else {
        showToast("Failed to generate key", "error");
      }
    } catch (error) {
      console.error("Failed to generate key:", error);
      showToast("Error generating key", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegisterWebhook = async () => {
    if (!newWebhookUrl || !user) return;
    setIsRegisteringWebhook(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/webhooks/register`, {
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

  const openRevokeKeyModal = (id: string, name: string) => {
    setDeleteKeyModal({ isOpen: true, keyId: id, keyName: name });
  };

  const closeRevokeKeyModal = () => {
    if (isDeletingKey) return;
    setDeleteKeyModal({ isOpen: false, keyId: null, keyName: null });
  };

  const handleRevokeKey = async () => {
    if (!deleteKeyModal.keyId || !user) return;
    setIsDeletingKey(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/keys/${deleteKeyModal.keyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        setApiKeys(apiKeys.filter(k => k.id !== deleteKeyModal.keyId));
        showToast('API key revoked successfully', 'success');
      } else {
        const data = await res.json();
        showToast(data?.error || 'Failed to revoke API key', 'error');
      }
    } catch (error) {
      console.error('Failed to revoke key:', error);
      showToast('Failed to revoke API key', 'error');
    } finally {
      setIsDeletingKey(false);
      closeRevokeKeyModal();
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Delete this webhook listener?")) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/webhooks/${id}`, {
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
    <>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {deleteKeyModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeRevokeKeyModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl border border-black/10"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-red-50 text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <button onClick={closeRevokeKeyModal} className="text-black/40 hover:text-black transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Revoke API Key</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Are you sure you want to revoke <span className="font-semibold text-black">{deleteKeyModal.keyName || 'this key'}</span>? This action cannot be undone and any service using it will lose access immediately.
              </p>
              <div className="rounded-3xl bg-black/5 p-4 mb-6">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-black/60">Warning</p>
                <p className="text-sm text-black/70 mt-1">Revoked keys cannot be recovered. Generate a new key if you need access again.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeRevokeKeyModal}
                  disabled={isDeletingKey}
                  className="flex-1 rounded-full border border-black/10 bg-white py-3 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevokeKey}
                  disabled={isDeletingKey}
                  className="flex-1 rounded-full bg-red-600 py-3 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeletingKey ? 'Revoking…' : 'Revoke Key'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                        onClick={() => openRevokeKeyModal(key.id, key.name)}
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

          {/* Integrations Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-light tracking-tighter uppercase flex items-center gap-4 border-b border-black/5 pb-6">
              <Zap className="h-6 w-6 text-black/40" /> Enterprise Connectors
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* GitHub */}
               <div className="glass-3d-panel p-8 flex flex-col justify-between h-full group">
                  <div>
                    <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center mb-6 shadow-lg shadow-black/10 group-hover:scale-110 transition-transform">
                      <FaGithub className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold">GitHub</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Automate accessibility audits on every Pull Request and deployment.</p>
                  </div>
                  <div className="mt-8">
                    {integrations.find(i => i.type === 'github') ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-3 py-2 rounded-xl border border-green-100">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </div>
                        <button 
                          onClick={() => handleRemoveIntegration(integrations.find(i => i.type === 'github').id)}
                          className="w-full py-3 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleConnectIntegration('github')}
                        disabled={isConnecting === 'github'}
                        className="w-full py-4 rounded-2xl bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black/80 transition-all disabled:opacity-50"
                      >
                        {isConnecting === 'github' ? 'Connecting...' : 'Connect Repos'}
                      </button>
                    )}
                  </div>
               </div>

               {/* Slack */}
               <div className="glass-3d-panel p-8 flex flex-col justify-between h-full group">
                  <div>
                    <div className="h-12 w-12 rounded-2xl bg-[#4A154B] text-white flex items-center justify-center mb-6 shadow-lg shadow-black/10 group-hover:scale-110 transition-transform">
                      <FaSlack className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold">Slack</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Receive real-time alerts and report summaries directly in your channels.</p>
                  </div>
                  <div className="mt-8">
                    {integrations.find(i => i.type === 'slack') ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-3 py-2 rounded-xl border border-green-100">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </div>
                         <button 
                           onClick={() => handleTestIntegration(integrations.find(i => i.type === 'slack').id)}
                           className="w-full py-3 text-[9px] font-bold uppercase tracking-widest text-blue-500 hover:bg-blue-50 rounded-xl transition-colors mb-1"
                         >
                           Test Connection
                         </button>
                         <button 
                           onClick={() => handleRemoveIntegration(integrations.find(i => i.type === 'slack').id)}
                           className="w-full py-3 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                         >
                           Disconnect
                         </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleConnectIntegration('slack')}
                        disabled={isConnecting === 'slack'}
                        className="w-full py-4 rounded-2xl bg-white border border-black/5 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-all disabled:opacity-50"
                      >
                        {isConnecting === 'slack' ? 'Connecting...' : 'Add to Slack'}
                      </button>
                    )}
                  </div>
               </div>

               {/* Discord */}
               <div className="glass-3d-panel p-8 flex flex-col justify-between h-full group">
                  <div>
                    <div className="h-12 w-12 rounded-2xl bg-[#5865F2] text-white flex items-center justify-center mb-6 shadow-lg shadow-black/10 group-hover:scale-110 transition-transform">
                      <FaDiscord className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold">Discord</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Broadcast compliance milestones and audit failures to your dev server.</p>
                  </div>
                  <div className="mt-8">
                    {integrations.find(i => i.type === 'discord') ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-3 py-2 rounded-xl border border-green-100">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </div>
                         <button 
                           onClick={() => handleTestIntegration(integrations.find(i => i.type === 'discord').id)}
                           className="w-full py-3 text-[9px] font-bold uppercase tracking-widest text-blue-500 hover:bg-blue-50 rounded-xl transition-colors mb-1"
                         >
                           Test Connection
                         </button>
                         <button 
                           onClick={() => handleRemoveIntegration(integrations.find(i => i.type === 'discord').id)}
                           className="w-full py-3 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                         >
                           Disconnect
                         </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleConnectIntegration('discord')}
                        disabled={isConnecting === 'discord'}
                        className="w-full py-4 rounded-2xl bg-white border border-black/5 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-all disabled:opacity-50"
                      >
                        {isConnecting === 'discord' ? 'Connecting...' : 'Join Server'}
                      </button>
                    )}
                  </div>
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
      {/* Secret Key Modal */}
      <AnimatePresence>
        {revealedKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setRevealedKey(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-12 shadow-2xl border border-black/10 overflow-hidden"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex-1">
                  <div className="h-16 w-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <h3 className="text-4xl font-light tracking-tighter mb-3">Save Your API Key</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                    Please copy this API key and store it somewhere safe. For your security, <strong className="text-black">we will never show it to you again.</strong>
                  </p>
                </div>
                <button
                  onClick={() => setRevealedKey(null)}
                  className="text-black/40 hover:text-black/60 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="bg-black/[0.02] border-2 border-black/10 rounded-2xl p-0 mb-8 overflow-hidden">
                <div className="bg-black p-6 rounded-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-3">Your API Key</p>
                  <div className="flex items-center justify-between gap-4">
                    <code className="font-mono text-sm text-white/90 break-all leading-relaxed">{revealedKey}</code>
                    <button 
                      onClick={() => copyToClipboard(revealedKey)}
                      className="h-12 w-12 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                      title="Copy to clipboard"
                    >
                      {copied ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5 text-white" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-8 flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-blue-700 font-medium">
                  This key provides full access to your account. Never share it or commit it to version control. Treat it like a password.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setRevealedKey(null)}
                  className="flex-1 py-4 rounded-full bg-black/5 hover:bg-black/10 border border-black/5 text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    copyToClipboard(revealedKey);
                    setTimeout(() => setRevealedKey(null), 500);
                  }}
                  className="flex-1 py-4 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <Copy className="h-4 w-4" /> Copy & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhook Connection Modal (Slack/Discord) */}
      <AnimatePresence>
        {webhookModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWebhookModal({ type: '', isOpen: false })}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl border border-black/10 overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-8">
                 <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg ${webhookModal.type === 'slack' ? 'bg-[#4A154B] text-white' : 'bg-[#5865F2] text-white'}`}>
                    {webhookModal.type === 'slack' ? <FaSlack className="h-6 w-6" /> : <FaDiscord className="h-6 w-6" />}
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold tracking-tight">Connect {webhookModal.type === 'slack' ? 'Slack' : 'Discord'}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Enterprise Connector</p>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-2">Incoming Webhook URL</label>
                    <input 
                      type="text"
                      value={integrationWebhookUrl}
                      onChange={(e) => setIntegrationWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full h-14 px-6 bg-black/5 border border-black/5 rounded-2xl text-xs font-bold outline-none focus:border-black/20 transition-all shadow-inner"
                    />
                 </div>

                 <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
                    <Info className="h-5 w-5 text-blue-500 mt-1 shrink-0" />
                    <p className="text-[10px] leading-relaxed text-blue-700/80 font-medium">
                       Incoming webhooks allow Luminary to post automated compliance reports and PR notifications directly to your channels.
                    </p>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => setWebhookModal({ type: '', isOpen: false })}
                      className="flex-1 py-4 rounded-full bg-white border border-black/5 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                      onClick={handleSaveIntegrationWebhook}
                      disabled={!integrationWebhookUrl || isConnecting !== null}
                      className="flex-1 py-4 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                       {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                       Connect Integration
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
