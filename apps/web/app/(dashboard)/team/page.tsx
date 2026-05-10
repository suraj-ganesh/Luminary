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
  Users,
  Plus,
  Mail,
  Shield,
  Trash2,
  CheckCircle2,
  UserPlus,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "../../../components/NotificationBell";

// Custom Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 border ${
        type === 'success' ? 'bg-green-500 text-white border-green-600' : 
        type === 'error' ? 'bg-red-500 text-white border-red-600' : 
        'bg-white text-black border-black/10'
      }`}
    >
      {type === 'success' && <CheckCircle2 className="h-4 w-4" />}
      {type === 'error' && <Trash2 className="h-4 w-4" />}
      {type === 'info' && <Shield className="h-4 w-4" />}
      <span className="text-[11px] font-bold uppercase tracking-widest">{message}</span>
    </motion.div>
  );
};

export default function TeamPage() {
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [activeOrg, setActiveOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  // Confirm Modal State
  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean, userId: string}>({ isOpen: false, userId: '' });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        fetchOrganizations(user.id);
      }
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (activeOrg) {
      fetchMembers(activeOrg.id);
    }
  }, [activeOrg]);

  const fetchMembers = async (orgId: string) => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch(`http://localhost:8080/api/orgs/${orgId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const fetchOrganizations = async (userId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/orgs/list/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
        if (data.length > 0 && !activeOrg) {
          setActiveOrg(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName || !user) return;
    setIsCreating(true);
    try {
      const res = await fetch('http://localhost:8080/api/orgs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: newOrgName })
      });
      if (res.ok) {
        const data = await res.json();
        setOrganizations([...organizations, { ...data.organization, userRole: 'admin' }]);
        setNewOrgName("");
        if (!activeOrg) setActiveOrg(data.organization);
        showToast("Organization created successfully", 'success');
      }
    } catch (error) {
      console.error("Failed to create organization:", error);
      showToast("Failed to create organization", 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !activeOrg) return;
    setIsInviting(true);
    try {
      const res = await fetch('http://localhost:8080/api/orgs/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeOrg.id, email: inviteEmail, role: 'viewer' })
      });
      if (res.ok) {
        showToast("Member invited successfully!", 'success');
        setInviteEmail("");
        fetchMembers(activeOrg.id); // Refresh members
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to invite member", 'error');
      }
    } catch (error) {
      console.error("Failed to invite member:", error);
      showToast("Failed to invite member", 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const executeRemoveMember = async () => {
    const userId = confirmDelete.userId;
    setConfirmDelete({ isOpen: false, userId: '' });
    if (!activeOrg || !user || !userId) return;

    try {
      const res = await fetch(`http://localhost:8080/api/orgs/${activeOrg.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id })
      });
      if (res.ok) {
        setMembers(members.filter(m => m.user_id !== userId));
        showToast("Member removed", 'success');
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to remove member", 'error');
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
      showToast("Failed to remove member", 'error');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!activeOrg || !user) return;
    try {
      const res = await fetch(`http://localhost:8080/api/orgs/${activeOrg.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id, role: newRole })
      });
      if (res.ok) {
        setMembers(members.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
        showToast("Role updated", 'success');
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update role", 'error');
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      showToast("Failed to update role", 'error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmDelete.isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Remove Member?</h3>
              <p className="text-muted-foreground text-sm mb-8">Are you sure you want to remove this member from the organization? They will lose all access to team scans.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDelete({ isOpen: false, userId: '' })}
                  className="flex-1 py-3 bg-black/5 hover:bg-black/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeRemoveMember}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-red-500/20"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        {loading ? (
          <div className="max-w-4xl mx-auto space-y-16 animate-pulse text-center py-20">
             <Users className="h-16 w-16 text-black/5 mx-auto mb-6" />
             <p className="text-muted-foreground uppercase tracking-widest font-bold">Synchronizing Teams...</p>
          </div>
        ) : (
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Top Bar */}
          <div className="space-y-4">
             <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/50 border border-white shadow-sm mb-2">
                <Users className="h-4 w-4 text-black/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/60">Enterprise Suite</span>
             </div>
             <h1 className="text-5xl font-light tracking-tighter leading-none uppercase">Team Workspace</h1>
             <p className="text-muted-foreground font-light text-lg">Manage multi-tenant organizations and collaborate on accessibility reports.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Organizations List */}
            <div className="lg:col-span-1 space-y-8">
              <div className="glass-3d-panel p-8">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Your Organizations</h3>
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <button 
                      key={org.id}
                      onClick={() => setActiveOrg(org)}
                      className={`w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between group ${activeOrg?.id === org.id ? 'bg-black text-white shadow-xl' : 'bg-white/40 border border-black/5 hover:bg-white'}`}
                    >
                      <div>
                        <p className="font-bold text-sm">{org.name}</p>
                        <p className={`text-[9px] uppercase tracking-widest ${activeOrg?.id === org.id ? 'text-white/40' : 'text-muted-foreground/40'}`}>{org.userRole}</p>
                      </div>
                      <Shield className={`h-4 w-4 transition-transform group-hover:scale-110 ${activeOrg?.id === org.id ? 'text-white/20' : 'text-black/5'}`} />
                    </button>
                  ))}
                  
                  <div className="pt-4 border-t border-black/5 mt-4">
                    <input 
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="Organization Name"
                      className="w-full h-12 px-4 bg-white/60 border border-black/5 rounded-xl text-xs mb-3 outline-none focus:bg-white transition-all"
                    />
                    <button 
                      onClick={handleCreateOrg}
                      disabled={isCreating || !newOrgName}
                      className="w-full h-12 bg-black/5 hover:bg-black hover:text-white transition-all rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> {isCreating ? 'Creating...' : 'Create Org'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Active Org Details & Members */}
            <div className="lg:col-span-2 space-y-8">
              {activeOrg ? (
                <div className="space-y-8">
                  {/* Org Header */}
                  <div className="glass-3d-panel p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#3b83f5]/10 to-[#2ecac5]/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="flex items-center justify-between mb-8">
                       <div>
                          <h2 className="text-3xl font-bold tracking-tight">{activeOrg.name}</h2>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-1">ID: {activeOrg.id}</p>
                       </div>
                       <div className="h-14 w-14 rounded-2xl bg-black flex items-center justify-center text-white shadow-xl shadow-black/20">
                          <Users className="h-6 w-6" />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-black/5 rounded-2xl">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Your Role</p>
                          <p className="font-bold capitalize">{activeOrg.userRole}</p>
                       </div>
                       <div className="p-4 bg-black/5 rounded-2xl">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Created</p>
                          <p className="font-bold">{new Date(activeOrg.created_at).toLocaleDateString()}</p>
                       </div>
                    </div>
                  </div>

                  {/* Invite Member */}
                  {activeOrg.userRole === 'admin' && (
                    <div className="glass-3d-panel p-8">
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                        <UserPlus className="h-5 w-5 text-black/40" /> Invite Team Member
                      </h3>
                      <div className="flex gap-4">
                        <div className="flex-1 relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20" />
                          <input 
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@company.com"
                            className="w-full h-14 pl-12 pr-6 bg-white/40 border border-black/5 rounded-2xl text-sm outline-none focus:bg-white transition-all shadow-inner"
                          />
                        </div>
                        <button 
                          onClick={handleInvite}
                          disabled={isInviting || !inviteEmail}
                          className="px-10 h-14 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/80 transition-all shadow-xl shadow-black/10 flex items-center gap-3"
                        >
                          {isInviting ? 'Inviting...' : 'Send Invite'}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-4">New members will be added as 'Viewer' by default. You can change roles later.</p>
                    </div>
                  )}

                  {/* Active Members List */}
                  <div className="glass-3d-panel p-8">
                     <h3 className="text-lg font-bold mb-6">Active Members</h3>
                     <div className="space-y-4">
                        {isLoadingMembers ? (
                          <div className="py-6 flex justify-center"><div className="animate-pulse flex items-center gap-2"><div className="h-4 w-4 bg-black/20 rounded-full"></div><div className="h-4 w-4 bg-black/20 rounded-full"></div><div className="h-4 w-4 bg-black/20 rounded-full"></div></div></div>
                        ) : members.length === 0 ? (
                          <p className="text-center py-6 text-[10px] text-muted-foreground uppercase tracking-[0.2em]">No members found</p>
                        ) : (
                          members.map(member => (
                            <div key={member.user_id} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-black/5 group">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xs uppercase">
                                     {member.email?.charAt(0)}
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold">{member.email} {member.user_id === user?.id && <span className="text-[10px] text-muted-foreground font-normal ml-2">(You)</span>}</p>
                                     <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{member.role}</p>
                                  </div>
                               </div>
                               
                               <div className="flex items-center gap-3">
                                 {member.user_id === user?.id ? (
                                   <CheckCircle2 className="h-5 w-5 text-green-500" />
                                 ) : activeOrg?.userRole === 'admin' ? (
                                   <>
                                     <select 
                                       value={member.role}
                                       onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                                       className="bg-white/60 border border-black/5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                                     >
                                       <option value="admin">Admin</option>
                                       <option value="editor">Editor</option>
                                       <option value="viewer">Viewer</option>
                                     </select>
                                     <button 
                                       onClick={() => setConfirmDelete({ isOpen: true, userId: member.user_id })}
                                       className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                                     >
                                       <Trash2 className="h-4 w-4" />
                                     </button>
                                    </>
                                 ) : (
                                   <Shield className="h-4 w-4 text-black/20" />
                                 )}
                               </div>
                            </div>
                          ))
                        )}
                     </div>
                  </div>

                </div>
              ) : (
                <div className="h-96 glass-3d-panel flex flex-col items-center justify-center text-center p-12 space-y-6">
                  <div className="h-20 w-20 bg-black/5 rounded-3xl flex items-center justify-center">
                    <Users className="h-10 w-10 text-black/10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">No Organization Selected</h3>
                    <p className="text-muted-foreground mt-2 max-w-xs mx-auto">Select an organization from the left or create a new one to start collaborating.</p>
                  </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}
    </>
  );
}
