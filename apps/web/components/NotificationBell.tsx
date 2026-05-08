"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Bell, CheckCircle2, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/notifications/${userId}`);
      if (res.ok) {
        const data = await res.json();
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

  const markAsRead = async (id: string, scanId?: string) => {
    try {
      await fetch(`http://localhost:8080/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setIsOpen(false);
      
      // We don't have scan_id natively in the table right now, but if we did, we could navigate:
      // if (scanId) router.push(`/report/${scanId}`);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`http://localhost:8080/api/notifications/${userId}/read-all`, { method: 'PATCH' });
      setNotifications([]);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 px-6 py-3 rounded-2xl hover:bg-black/5 text-muted-foreground hover:text-black transition-all group relative"
      >
        <div className="relative">
          <Bell className="h-5 w-5 group-hover:text-black transition-colors" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
              {notifications.length > 9 && <span className="text-[6px] text-white font-bold animate-pulse" />}
            </span>
          )}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest truncate">Notifications</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 mb-4 w-80 bg-white/90 backdrop-blur-3xl rounded-[2rem] shadow-2xl border border-black/10 overflow-hidden z-50 flex flex-col max-h-[400px]"
          >
            <div className="p-5 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <h4 className="text-[11px] font-bold uppercase tracking-widest">Inbox</h4>
              {notifications.length > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[9px] font-bold uppercase tracking-widest text-[#3b83f5] hover:text-[#2ecac5] transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                  <Bell className="h-8 w-8 text-black/10 mb-3" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]">All caught up</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className="w-full p-4 rounded-2xl hover:bg-black/5 transition-all flex items-start gap-4 text-left group"
                    >
                      <div className="mt-0.5">{getIcon(notif.type)}</div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[11px] font-bold text-black mb-1 truncate">{notif.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{notif.body}</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-2">
                          {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
