"use client";

import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  Users, 
  Code, 
  CreditCard, 
  User as UserIcon, 
  Settings, 
  LogOut,
  LucideIcon
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { usePathname } from "next/navigation";

interface SidebarProps {
  user: any;
  onLogout: () => void;
}

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}

const NavItem = ({ href, icon: Icon, label, active }: NavItemProps) => (
  <Link 
    href={href} 
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all group ${
      active 
        ? "bg-black text-white shadow-2xl shadow-black/20" 
        : "hover:bg-black/5 text-muted-foreground hover:text-black"
    }`}
  >
    <Icon className={`h-5 w-5 transition-colors ${active ? "text-white" : "group-hover:text-black"}`} />
    <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{label}</span>
  </Link>
);

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Command Center" },
    { href: "/team", icon: Users, label: "Team Workspace" },
    { href: "/developer", icon: Code, label: "Developer API" },
    { href: "/pricing", icon: CreditCard, label: "Pricing" },
    { href: "/profile", icon: UserIcon, label: "Profile" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="w-80 h-screen border-r border-black/5 bg-white/60 backdrop-blur-3xl p-8 flex flex-col gap-12 sticky top-0 left-0 z-20 shadow-xl shadow-black/[0.02]">
      <Link href="/" className="flex items-center gap-4 group px-2">
        <div className="h-10 w-10 flex items-center justify-center transition-transform duration-1000 group-hover:scale-110">
           <Image src="/logo.png" alt="Logo" width={50} height={50} className="scale-[2.8]" />
        </div>
        <span className="font-bold text-2xl tracking-tight text-gradient">Luminary</span>
      </Link>

      <nav className="space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
        {navItems.map((item) => (
          <NavItem 
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
          />
        ))}

        <div className="pt-8 mt-12 border-t border-black/5 space-y-4">
          <div className="flex items-center gap-4 px-5 py-4 bg-black/5 rounded-3xl">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#3b83f5] to-[#2ecac5] flex items-center justify-center font-black text-white shadow-md">
               {(user?.user_metadata?.username || user?.email)?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
               <p className="text-[11px] font-bold uppercase tracking-widest truncate">{user?.user_metadata?.username || user?.email?.split('@')[0] || "User"}</p>
               <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">Operative Level 3</p>
            </div>
          </div>
          {user?.id && <NotificationBell userId={user.id} />}
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-6 py-3 rounded-2xl hover:bg-red-500/5 text-muted-foreground hover:text-red-600 transition-all group"
          >
             <LogOut className="h-5 w-5" />
             <span className="text-[11px] font-bold uppercase tracking-widest">Terminate</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
