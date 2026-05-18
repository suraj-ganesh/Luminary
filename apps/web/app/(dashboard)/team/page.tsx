"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Settings,
  Edit2,
  LogOut as LeaveIcon,
  Copy
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
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  
  // Org Settings State
  const [isRenaming, setIsRenaming] = useState(false);
  const [editOrgName, setEditOrgName] = useState("");

  // Toast State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: 'remove_member' | 'delete_org' | 'leave_org', targetId?: string}>({ isOpen: false, action: 'remove_member' });

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
      fetchPendingInvites(activeOrg.id);
      setEditOrgName(activeOrg.name);
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

  const fetchPendingInvites = async (orgId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/orgs/${orgId}/invites`);
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data);
      }
    } catch (error) {
      console.error("Failed to fetch invites:", error);
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
        } else if (data.length === 0) {
          setActiveOrg(null);
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
        setActiveOrg({ ...data.organization, userRole: 'admin' });
        showToast("Organization created successfully", 'success');
      }
    } catch (error) {
      console.error("Failed to create organization:", error);
      showToast("Failed to create organization", 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameOrg = async () => {
    if (!activeOrg || !editOrgName || !user) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`http://localhost:8080/api/orgs/${activeOrg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id, name: editOrgName })
      });
      if (res.ok) {
        const data = await res.json();
        setOrganizations(organizations.map(o => o.id === activeOrg.id ? { ...o, name: editOrgName } : o));
        setActiveOrg({ ...activeOrg, name: editOrgName });
        showToast("Organization renamed", 'success');
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to rename organization", 'error');
      }
    } catch (error) {
      console.error("Rename error:", error);
      showToast("Error renaming organization", 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !activeOrg || !user) return;
    setIsInviting(true);
    try {
      const res = await fetch('http://localhost:8080/api/orgs/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeOrg.id, email: inviteEmail, role: 'viewer', requesterId: user.id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.type === 'invite') {
           showToast("Invitation created! Link generated.", 'success');
           // In real app, we email the link. For demo, just refresh invites list.
           fetchPendingInvites(activeOrg.id);
        } else {
           showToast("Member added directly!", 'success');
           fetchMembers(activeOrg.id);
        }
        setInviteEmail("");
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

  const handleRevokeInvite = async (inviteId: string) => {
    if (!activeOrg || !user) return;
    try {
      const res = await fetch(`http://localhost:8080/api/orgs/${activeOrg.id}/invites/${inviteId}?requesterId=${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setPendingInvites(pendingInvites.filter(i => i.id !== inviteId));
        showToast("Invite revoked", 'success');
      }
    } catch (error) {
      console.error("Failed to revoke invite", error);
      showToast("Failed to revoke invite", 'error');
    }
  };

  const executeModalAction = async () => {
    const action = confirmModal.action;
    const targetId = confirmModal.targetId;
    setConfirmModal({ isOpen: false, action: 'remove_member' });
    if (!activeOrg || !user) return;

    if (action === 'remove_member' && targetId) {
      try {
        const res = await fetch(`http://localhost:8080/api/orgs/${activeOrg.id}/members/${targetId}?requesterId=${user.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          setMembers(members.filter(m => m.user_id !== targetId));
          showToast("Member removed", 'success');
        } else {
          const data = await res.json();
          showToast(data.error || "Failed to remove member", 'error');
        }
      } catch (error) {
        showToast("Failed to remove member", 'error');
      }
    } 
    else if (action === 'delete_org') {
      try {
        const res = await fetch(`http://localhost:8080/api/orgs/${activeOrg.id}?requesterId=${user.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const updatedOrgs = organizations.filter(o => o.id !== activeOrg.id);
          setOrganizations(updatedOrgs);
          setActiveOrg(updatedOrgs.length > 0 ? updatedOrgs[0] : null);
          showToast("Organization deleted", 'success');
        } else {
          const data = await res.json();
          showToast(data.error || "Failed to delete organization", 'error');
        }
      } catch (error) {
        showToast("Failed to delete organization", 'error');
      }
    }
    else if (action === 'leave_org') {
      try {
        const res = await fetch(`http://localhost:8080/api/orgs/${activeOrg.id}/leave?userId=${user.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const updatedOrgs = organizations.filter(o => o.id !== activeOrg.id);
          setOrganizations(updatedOrgs);
          setActiveOrg(updatedOrgs.length > 0 ? updatedOrgs[0] : null);
          showToast("Left organization successfully", 'success');
        } else {
          const data = await res.json();
          showToast(data.error || "Failed to leave organization", 'error');
        }
      } catch (error) {
        showToast("Failed to leave organization", 'error');
      }
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

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl"
            >
              <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-6 ${confirmModal.action === 'remove_member' ? 'bg-red-100' : 'bg-orange-100'}`}>
                {confirmModal.action === 'remove_member' ? <Trash2 className="h-6 w-6 text-red-600" /> : <LeaveIcon className="h-6 w-6 text-orange-600" />}
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">
                {confirmModal.action === 'remove_member' ? 'Remove Member?' : confirmModal.action === 'delete_org' ? 'Delete Organization?' : 'Leave Organization?'}
              </h3>
              <p className="text-muted-foreground text-sm mb-8">
                {confirmModal.action === 'remove_member' ? 'Are you sure you want to remove this member? They will lose all access.' : 
                 confirmModal.action === 'delete_org' ? 'Are you absolutely sure you want to delete this entire organization? This action cannot be undone and deletes all shared data.' : 
                 'Are you sure you want to leave? You will lose access to all shared scans.'}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmModal({ isOpen: false, action: 'remove_member' })}
                  className="flex-1 py-3 bg-black/5 hover:bg-black/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeModalAction}
                  className={`flex-1 py-3 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg ${confirmModal.action === 'remove_member' || confirmModal.action === 'delete_org' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'}`}
                >
                  {confirmModal.action === 'remove_member' ? 'Remove' : confirmModal.action === 'delete_org' ? 'Delete Org' : 'Leave Org'}
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
                        <p className="font-bold text-sm truncate w-32">{org.name}</p>
                        <p className={`text-[9px] uppercase tracking-widest ${activeOrg?.id === org.id ? 'text-white/40' : 'text-muted-foreground/40'}`}>{org.userRole}</p>
                      </div>
                      <Shield className={`h-4 w-4 transition-transform group-hover:scale-110 flex-shrink-0 ${activeOrg?.id === org.id ? 'text-white/20' : 'text-black/5'}`} />
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
                    
                    <div className="flex items-start justify-between mb-8">
                       <div className="flex-1 mr-4">
                          {activeOrg.userRole === 'admin' ? (
                            <div className="flex items-center gap-3 group">
                              <input 
                                value={editOrgName}
                                onChange={(e) => setEditOrgName(e.target.value)}
                                onBlur={handleRenameOrg}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameOrg()}
                                className="text-3xl font-bold tracking-tight bg-transparent border-b border-transparent hover:border-black/10 focus:border-black/30 outline-none w-full transition-all"
                              />
                              <Edit2 className="h-4 w-4 text-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ) : (
                            <h2 className="text-3xl font-bold tracking-tight">{activeOrg.name}</h2>
                          )}
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-2">ID: {activeOrg.id}</p>
                       </div>
                       
                       <div className="flex flex-col items-end gap-2">
                         <div className="h-14 w-14 rounded-2xl bg-black flex items-center justify-center text-white shadow-xl shadow-black/20">
                            <Users className="h-6 w-6" />
                         </div>
                         
                         {/* Action Buttons */}
                         <div className="flex items-center gap-2 mt-2">
                           {activeOrg.userRole === 'admin' ? (
                             <button 
                               onClick={() => setConfirmModal({ isOpen: true, action: 'delete_org' })}
                               className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
                             >
                               <Trash2 className="h-3 w-3" /> Delete
                             </button>
                           ) : (
                             <button 
                               onClick={() => setConfirmModal({ isOpen: true, action: 'leave_org' })}
                               className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
                             >
                               <LeaveIcon className="h-3 w-3" /> Leave
                             </button>
                           )}
                         </div>
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
                          {isInviting ? 'Sending...' : 'Send Invite'}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-4">New members are added as Viewer by default. Unregistered users will receive an invite link.</p>
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
                                       onClick={() => setConfirmModal({ isOpen: true, action: 'remove_member', targetId: member.user_id })}
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

                  {/* Pending Invites List */}
                  {activeOrg.userRole === 'admin' && pendingInvites.length > 0 && (
                    <div className="glass-3d-panel p-8">
                       <h3 className="text-lg font-bold mb-6">Pending Invitations</h3>
                       <div className="space-y-4">
                          {pendingInvites.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-dashed border-black/20">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-black/5 text-black/40 flex items-center justify-center font-bold text-xs uppercase border border-black/10">
                                     <Mail className="h-4 w-4" />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-black/70">{invite.email}</p>
                                     <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Invited as {invite.role}</p>
                                  </div>
                               </div>
                               
                               <div className="flex items-center gap-2">
                                 <button 
                                   onClick={() => {
                                      navigator.clipboard.writeText(`http://localhost:3000/invite/${invite.token}`);
                                      showToast("Invite link copied", "info");
                                   }}
                                   className="h-8 w-8 flex items-center justify-center rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
                                   title="Copy Invite Link"
                                 >
                                   <Copy className="h-4 w-4 text-black/60" />
                                 </button>
                                 <button 
                                   onClick={() => handleRevokeInvite(invite.id)}
                                   className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                                   title="Revoke Invite"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </button>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

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
