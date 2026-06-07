"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Bell, CheckCircle2, AlertTriangle, Info, ShieldCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getApiUrl } from "../lib/api";

const extractUrl = (title: string, body: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/;
  let match = title.match(urlRegex);
  if (match) {
    let url = match[0].trim();
    return url.replace(/[.,;%]$/, "");
  }
  match = body.match(urlRegex);
  if (match) {
    let url = match[0].trim();
    return url.replace(/[.,;%]$/, "");
  }
  return null;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [loadingNotifId, setLoadingNotifId] = useState<string | null>(null);

  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/notifications/${userId}`);
      if (res.ok) {
        const data = await res.json();
        // Check if there are any unread notifications that we haven't seen yet
        const unread = data.filter((n: any) => !n.read);
        if (unread.length > notifications.filter((n: any) => !n.read).length) {
          setHasNew(true);
        }
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };


  useEffect(() => {
    if (!userId) return;
    
    // Initial fetch
    fetchNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${getApiUrl()}/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      setHasNew(false);
    }
    setIsOpen(!isOpen);
  };


  const markAllAsRead = async () => {
    try {
      await fetch(`${getApiUrl()}/api/notifications/${userId}/read-all`, { method: 'PATCH' });
      setNotifications([]);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    // 1. Mark as read if not already read
    if (!notif.read) {
      await markAsRead(notif.id);
    }

    // 2. Extract URL and find the scan
    const url = extractUrl(notif.title, notif.body);
    if (!url) {
      // If no URL could be parsed, just close the feed (already marked read)
      setIsOpen(false);
      return;
    }

    setLoadingNotifId(notif.id);
    try {
      let scanId: string | null = null;

      // Try with exact URL first
      const { data: exactData } = await supabase
        .from('scans')
        .select('id')
        .eq('user_id', userId)
        .eq('url', url)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exactData) {
        scanId = exactData.id;
      } else {
        // Try with alternative trailing slash configuration
        const alternativeUrl = url.endsWith('/') 
          ? url.slice(0, -1) 
          : `${url}/`;

        const { data: altData } = await supabase
          .from('scans')
          .select('id')
          .eq('user_id', userId)
          .eq('url', alternativeUrl)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (altData) {
          scanId = altData.id;
        }
      }

      if (scanId) {
        setIsOpen(false);
        router.push(`/report/${scanId}`);
      } else {
        alert(`No scan report found for ${url}.`);
      }
    } catch (error) {
      console.error("Error fetching scan for notification:", error);
    } finally {
      setLoadingNotifId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      default: return <ShieldCheck className="h-5 w-5 text-black/40" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleToggle}
        className={`w-full flex items-center gap-4 px-6 py-3 rounded-2xl transition-all group relative ${isOpen ? 'bg-black text-white' : 'hover:bg-black/5 text-muted-foreground hover:text-black'}`}
      >
        <div className="relative">
          <Bell className={`h-5 w-5 transition-colors ${isOpen ? 'text-white' : 'group-hover:text-black'}`} />
          {hasNew && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
          )}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest truncate">Notifications</span>
      </button>


      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-80 w-[450px] bg-white/80 backdrop-blur-3xl shadow-[50px_0_100px_rgba(0,0,0,0.1)] border-r border-black/5 z-[100] flex flex-col"
          >
            <div className="p-10 border-b border-black/5 flex items-center justify-between bg-white/40 backdrop-blur-md">
              <div>
                <h4 className="text-2xl font-light tracking-tighter uppercase mb-1">Intelligence Feed</h4>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Real-time status updates</p>
              </div>
              {notifications.some(n => !n.read) && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#3b83f5] hover:text-[#2ecac5] transition-colors bg-blue-50 px-4 py-2 rounded-full"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <Bell className="h-12 w-12" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em]">Neural link clear</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full p-6 rounded-[2rem] transition-all flex items-start gap-6 text-left group border cursor-pointer ${notif.read ? 'bg-transparent border-transparent opacity-60 hover:bg-black/5' : 'bg-white border-black/5 shadow-sm hover:shadow-md'}`}
                    >
                      <div className={`mt-1 h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.read ? 'bg-black/5' : 'bg-black/5 group-hover:bg-black group-hover:text-white transition-colors'}`}>
                        {loadingNotifId === notif.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-black" />
                        ) : (
                          getIcon(notif.type)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-[13px] font-bold truncate ${notif.read ? 'text-muted-foreground' : 'text-black'}`}>{notif.title}</p>
                          {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-[#3b83f5]" />}
                        </div>
                        <p className={`text-[11px] leading-relaxed mb-3 ${notif.read ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{notif.body}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">
                            {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-black/5 bg-black/[0.02]">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full h-14 rounded-2xl bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-xl"
              >
                Close Intelligence Feed
              </button>
            </div>
          </motion.div>

        )}
      </AnimatePresence>
    </div>
  );
}
