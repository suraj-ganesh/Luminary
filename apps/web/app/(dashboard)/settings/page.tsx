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
  Bell,
  Trash2,
  Users,
  Save,
  CheckCircle2,
  Shield
} from "lucide-react";
import NotificationBell from "../../../components/NotificationBell";
import { getApiUrl } from "../../../lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings State
  const [notifyScoreDrop, setNotifyScoreDrop] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          setNotifyScoreDrop(profileData.notify_score_drop ?? true);
          setNotifyDigest(profileData.notify_digest ?? true);
        }
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await fetch(`${getApiUrl()}/api/notifications/${user.id}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify_score_drop: notifyScoreDrop, notify_digest: notifyDigest })
      });
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
        {loading ? (
          <div className="max-w-4xl mx-auto space-y-16 animate-pulse">
             <div className="h-8 w-32 bg-black/5 rounded-full mb-2"></div>
             <div className="h-16 w-64 bg-black/5 rounded-2xl"></div>
          </div>
        ) : (
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Top Bar */}
          <div className="space-y-4">
             <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/50 border border-white shadow-sm mb-2">
                <Settings className="h-4 w-4 text-black/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/60">System Preferences</span>
             </div>
             <h1 className="text-5xl font-light tracking-tighter leading-none uppercase">Settings</h1>
             <p className="text-muted-foreground font-light text-lg">Configure your platform experience, notifications, and danger zones.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Notifications & General */}
            <div className="lg:col-span-2 space-y-8">
              
              <div className="glass-3d-panel p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#3b83f5]/10 to-[#2ecac5]/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <h2 className="text-xl font-light tracking-tighter uppercase mb-8 flex items-center gap-3">
                  <Bell className="h-5 w-5 text-black/40" /> Notification Preferences
                </h2>
                
                <div className="space-y-6 mb-8">
                  <label className="flex items-center justify-between p-6 bg-white/40 rounded-2xl border border-black/5 cursor-pointer hover:bg-white transition-all shadow-sm">
                    <div>
                      <h4 className="font-bold mb-1">Score Drop Alerts</h4>
                      <p className="text-[10px] text-muted-foreground">Receive notifications when a monitored site's accessibility score drops below 90%.</p>
                    </div>
                    <div 
                      className={`h-6 w-11 rounded-full relative transition-colors ${notifyScoreDrop ? 'bg-green-500' : 'bg-black/10'}`}
                      onClick={(e) => { e.preventDefault(); setNotifyScoreDrop(!notifyScoreDrop); }}
                    >
                      <div className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow-sm transition-all ${notifyScoreDrop ? 'left-6' : 'left-1'}`}></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-6 bg-white/40 rounded-2xl border border-black/5 cursor-pointer hover:bg-white transition-all shadow-sm">
                    <div>
                      <h4 className="font-bold mb-1">Weekly Digest</h4>
                      <p className="text-[10px] text-muted-foreground">Receive a weekly summary of your sites' accessibility health.</p>
                    </div>
                    <div 
                      className={`h-6 w-11 rounded-full relative transition-colors ${notifyDigest ? 'bg-green-500' : 'bg-black/10'}`}
                      onClick={(e) => { e.preventDefault(); setNotifyDigest(!notifyDigest); }}
                    >
                      <div className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow-sm transition-all ${notifyDigest ? 'left-6' : 'left-1'}`}></div>
                    </div>
                  </label>
                </div>
                
                <button 
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="glass-3d-button h-12 px-8 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2"
                >
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>

              {/* Advanced / System */}
              <div className="glass-3d-panel p-10">
                <h2 className="text-xl font-light tracking-tighter uppercase mb-8 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-black/40" /> Advanced Settings
                </h2>
                <div className="space-y-6">
                  <div className="p-6 bg-black/5 rounded-2xl border border-black/5">
                    <h4 className="font-bold mb-2">Strict Scanning Mode</h4>
                    <p className="text-xs text-muted-foreground mb-4">Enable to fail scans on minor accessibility violations (e.g., contrast ratio off by 0.1).</p>
                    <button className="px-4 py-2 bg-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-colors">
                      Enable Mode
                    </button>
                  </div>
                </div>
              </div>
              
            </div>

            {/* Right Column: Danger Zone */}
            <div className="space-y-8">
              <div className="glass-3d-panel p-8 border border-red-500/20 bg-red-50/30">
                <h2 className="text-lg font-light tracking-tighter uppercase mb-6 flex items-center gap-3 text-red-500">
                  <Trash2 className="h-4 w-4" /> Danger Zone
                </h2>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-red-600 mb-2">Delete Organization</h4>
                    <p className="text-xs text-red-500/70 mb-4">Permanently delete your current active organization and all its scan history.</p>
                    <button className="w-full py-3 bg-red-100 text-red-600 hover:bg-red-200 transition-colors rounded-xl text-[10px] font-bold uppercase tracking-widest">
                      Delete Org
                    </button>
                  </div>
                  <div className="pt-6 border-t border-red-500/20">
                    <h4 className="font-bold text-red-600 mb-2">Delete Account</h4>
                    <p className="text-xs text-red-500/70 mb-4">Permanently delete your account and all associated data.</p>
                    <button className="w-full py-3 bg-red-600 text-white hover:bg-red-700 transition-colors rounded-xl text-[10px] font-bold uppercase tracking-widest">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
        )}
    </>
  );
}
