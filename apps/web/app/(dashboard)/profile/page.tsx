"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  Code,
  LogOut, 
  User as UserIcon,
  CreditCard,
  Settings,
  Mail,
  Shield,
  Bell,
  Trash2,
  Crown,
  CheckCircle2,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UsageIndicator from "../../../components/UsageIndicator";
import NotificationBell from "../../../components/NotificationBell";

// Custom Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 border ${
        type === 'success' ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'
      }`}
    >
      {type === 'success' && <CheckCircle2 className="h-4 w-4" />}
      {type === 'error' && <Trash2 className="h-4 w-4" />}
      <span className="text-[11px] font-bold uppercase tracking-widest">{message}</span>
    </motion.div>
  );
};

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [scanCount, setScanCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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
        setFullName(user?.user_metadata?.username || "");
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
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { username: fullName }
      });
      if (error) throw error;
      setUser({ ...user, user_metadata: { ...user.user_metadata, username: fullName } });
      showToast("Profile updated successfully", "success");
    } catch (error) {
      console.error("Update failed:", error);
      showToast("Failed to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stripe/create-portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
    }
  };


  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
      
      {loading ? (
          <div className="max-w-4xl mx-auto space-y-16 animate-pulse">
            <div className="space-y-4">
               <div className="h-8 w-32 bg-black/5 rounded-full mb-2"></div>
               <div className="h-16 w-64 bg-black/5 rounded-2xl"></div>
               <div className="h-6 w-96 bg-black/5 rounded-full mt-4"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-8">
                  <div className="h-96 bg-black/5 rounded-[2.5rem]"></div>
                  <div className="h-64 bg-black/5 rounded-[2.5rem]"></div>
               </div>
               <div className="space-y-8">
                  <div className="h-[28rem] bg-black/5 rounded-[2.5rem]"></div>
                  <div className="h-64 bg-black/5 rounded-[2.5rem]"></div>
               </div>
            </div>
          </div>
        ) : (
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Top Bar */}
          <div className="space-y-4">
             <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/50 border border-white shadow-sm mb-2">
                <Settings className="h-4 w-4 text-black/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/60">Account Settings</span>
             </div>
             <h1 className="text-5xl font-light tracking-tighter leading-none uppercase">Profile</h1>
             <p className="text-muted-foreground font-light text-lg">Manage your identity, security, and subscription settings.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Personal Info & Plan */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Profile Card */}
              <div className="glass-3d-panel p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#3b83f5]/10 to-[#2ecac5]/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <h2 className="text-xl font-light tracking-tighter uppercase mb-8 flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-black/40" /> Personal Information
                </h2>
                
                <div className="flex items-center gap-8 mb-10">
                  <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-[#3b83f5] to-[#2ecac5] flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-blue-500/20">
                    {(user?.user_metadata?.username || user?.email)?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{user?.user_metadata?.username || user?.email?.split('@')[0]}</h3>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4" /> {user?.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-14 px-6 bg-white/40 border border-black/5 rounded-2xl text-sm outline-none focus:bg-white transition-all focus:ring-2 focus:ring-black/5" 
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</label>
                    <input 
                      type="email" 
                      defaultValue={user?.email || ''}
                      disabled
                      className="w-full h-14 px-6 bg-black/5 border border-black/5 rounded-2xl text-sm outline-none cursor-not-allowed opacity-70" 
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed directly. Contact support.</p>
                  </div>
                  <button 
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="glass-3d-button h-12 px-8 text-[10px] font-bold uppercase tracking-widest rounded-full disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Security */}
              <div className="glass-3d-panel p-10">
                <h2 className="text-xl font-light tracking-tighter uppercase mb-8 flex items-center gap-3 text-red-500">
                  <Shield className="h-5 w-5" /> Security & Authentication
                </h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-white/50 border border-black/5 rounded-2xl">
                    <div>
                      <h4 className="font-bold">Password</h4>
                      <p className="text-sm text-muted-foreground mt-1">Last changed: Never</p>
                    </div>
                    <button className="px-6 py-2 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-black/80 transition-colors">
                      Update
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-red-50/50 border border-red-100 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-red-600">Delete Account</h4>
                      <p className="text-sm text-red-500/70 mt-1">Permanently delete your account and all data.</p>
                    </div>
                    <button className="h-10 w-10 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
            </div>

            {/* Right Column: Plan & Notifications */}
            <div className="space-y-8">
              
              {/* Current Plan */}
              <div className="glass-3d-panel p-8 bg-gradient-to-b from-[#1a1a1a] to-black text-white border-none shadow-2xl">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                  <Crown className="h-6 w-6 text-yellow-400" />
                </div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Current Plan</h3>
                <div className="text-4xl font-light tracking-tighter mb-4 capitalize">{profile?.plan || 'Free'}</div>
                <p className="text-sm text-white/70 mb-8">
                  {profile?.plan === 'pro' 
                    ? "You are on the Pro tier with increased limits and priority support." 
                    : "You are currently on the Free tier with basic limits."}
                </p>
                
                <div className="mb-10">
                  <UsageIndicator 
                    current={scanCount} 
                    limit={profile?.plan === 'pro' ? 500 : 10} 
                    label="Monthly Scans" 
                  />
                </div>

                {profile?.plan !== 'pro' && (
                  <Link href="/pricing" className="block w-full text-center py-4 rounded-full bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors">
                    Upgrade to Pro
                  </Link>
                )}
                {profile?.plan === 'pro' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 py-4 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60">
                      <CheckCircle2 className="h-4 w-4 text-[#2ecac5]" /> Plan Active
                    </div>
                    <button 
                      onClick={handleManageSubscription}
                      className="w-full text-center py-4 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
                    >
                      Manage Subscription
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="glass-3d-panel p-8">
                <h2 className="text-lg font-light tracking-tighter uppercase mb-6 flex items-center gap-3">
                  <Bell className="h-4 w-4 text-black/40" /> Preferences
                </h2>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-black/5 cursor-pointer hover:bg-white transition-colors">
                    <span className="text-sm font-medium">Security Alerts</span>
                    <div className="h-6 w-11 bg-black rounded-full relative">
                      <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full"></div>
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-black/5 cursor-pointer hover:bg-white transition-colors">
                    <span className="text-sm font-medium">Product Updates</span>
                    <div className="h-6 w-11 bg-black/10 rounded-full relative">
                      <div className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          </div>

        </div>
        )}
    </>
  );
}
