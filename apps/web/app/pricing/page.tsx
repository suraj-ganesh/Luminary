"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  Code,
  LogOut, 
  User as UserIcon,
  CreditCard,
  Check, 
  Shield, 
  Zap, 
  Sparkles,
  Settings,
  Users
} from "lucide-react";
import { motion } from "framer-motion";
import NotificationBell from "../../components/NotificationBell";

export default function PricingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleUpgrade = async (planName: string) => {
    if (planName === "Free") return;
    if (planName === "Enterprise") {
      window.location.href = "mailto:sales@luminary.com";
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Using the Product ID provided: prod_URw4460Q1SRLAX
      const PRODUCT_ID = "prod_URw4460Q1SRLAX";

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: PRODUCT_ID,
          userId: user.id,
          userEmail: user.email
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Upgrade failed:", error);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for individuals and small personal projects.",
      features: [
        "10 automated scans per month",
        "Basic AI plain-text explanations",
        "Downloadable PDF reports",
        "Community support"
      ],
      buttonText: "Current Plan",
      popular: false,
      icon: <Shield className="h-6 w-6 text-black/50" />
    },
    {
      name: "Pro",
      price: "$19",
      description: "For professionals needing continuous compliance monitoring.",
      features: [
        "500 automated scans per month",
        "Weekly automated site monitoring",
        "Email alerts on score drops",
        "Public REST API Access",
        "Priority email support"
      ],
      buttonText: "Upgrade to Pro",
      popular: true,
      icon: <Zap className="h-6 w-6 text-white" />
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large teams with advanced compliance requirements.",
      features: [
        "Unlimited automated scans",
        "Custom monitoring frequencies",
        "Dedicated account manager",
        "SLA and guaranteed uptime",
        "Custom CI/CD integrations"
      ],
      buttonText: "Contact Sales",
      popular: false,
      icon: <Sparkles className="h-6 w-6 text-black/50" />
    }
  ];


  return (
    <div className="min-h-screen bg-[#e3e2c3] text-[#1a1a1a] flex overflow-hidden font-poppins font-light">
      {/* Sidebar */}
      <aside className="w-80 border-r border-black/5 bg-white/60 backdrop-blur-3xl p-10 flex flex-col gap-16 relative z-20 shadow-xl shadow-black/[0.02] shrink-0">
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
           <Link href="/developer" className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl hover:bg-black/5 transition-all text-muted-foreground hover:text-black group">
              <Code className="h-5 w-5 group-hover:text-black transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Developer API</span>
           </Link>
           <button className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl bg-black text-white shadow-2xl shadow-black/20 group transition-all">
              <CreditCard className="h-5 w-5" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Pricing</span>
           </button>
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
          <div className="max-w-6xl mx-auto space-y-16 animate-pulse">
            <div className="space-y-4 max-w-2xl text-center mx-auto flex flex-col items-center">
               <div className="h-8 w-32 bg-black/5 rounded-full mb-2"></div>
               <div className="h-16 w-[28rem] bg-black/5 rounded-2xl"></div>
               <div className="h-6 w-96 bg-black/5 rounded-full mt-4"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
               <div className="h-[32rem] bg-black/5 rounded-[2.5rem]"></div>
               <div className="h-[34rem] bg-black/5 rounded-[2.5rem] lg:-mt-4"></div>
               <div className="h-[32rem] bg-black/5 rounded-[2.5rem]"></div>
            </div>
          </div>
        ) : (
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* Top Bar */}
          <div className="space-y-4">
             <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/50 border border-white shadow-sm mb-2">
                <CreditCard className="h-4 w-4 text-black/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/60">Plans & Pricing</span>
             </div>
             <h1 className="text-5xl font-light tracking-tighter leading-none uppercase">
               Invest in <span className="font-semibold text-gradient">Accessibility</span>
             </h1>
             <p className="text-muted-foreground font-light text-lg">
               Choose the plan that fits your scale. From individual developers to enterprise compliance teams, we have you covered.
             </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pb-20">
            {plans.map((plan, i) => (
              <motion.div 
                key={plan.name}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (i * 0.1), duration: 0.7 }}
                className={`h-full relative flex flex-col p-10 rounded-[2.5rem] shadow-xl border ${plan.popular ? 'bg-black text-white border-black/10 shadow-2xl shadow-black/20 lg:scale-105 z-10' : 'bg-white/80 backdrop-blur-md text-[#1a1a1a] border-white'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#3b83f5] to-[#2ecac5] text-white text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-8">
                  <div className={`p-4 w-fit rounded-2xl mb-6 ${plan.popular ? 'bg-white/10' : 'bg-black/5'}`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight mb-2">{plan.name}</h3>
                  <p className={`text-sm leading-relaxed ${plan.popular ? 'text-white/60' : 'text-muted-foreground/80'}`}>{plan.description}</p>
                </div>

                <div className="mb-10 flex items-end gap-2">
                  <span className="text-6xl font-light tracking-tighter leading-none">{plan.price}</span>
                  {plan.price !== "Custom" && <span className={`text-sm mb-1 font-bold tracking-widest uppercase ${plan.popular ? 'text-white/40' : 'text-muted-foreground/40'}`}>/month</span>}
                </div>

                <ul className="space-y-5 mb-10 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-4">
                      <div className={`mt-0.5 rounded-full p-1 shrink-0 ${plan.popular ? 'bg-white/10' : 'bg-black/5'}`}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className={`text-sm font-medium ${plan.popular ? 'text-white/90' : 'text-[#1a1a1a]/80'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleUpgrade(plan.name)}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center text-[11px] font-bold uppercase tracking-widest transition-all ${
                    plan.popular 
                      ? 'bg-white text-black hover:bg-white/90' 
                      : 'bg-black text-white hover:bg-black/90'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </motion.div>
            ))}
          </div>

        </div>
        )}
      </main>
    </div>
  );
}
