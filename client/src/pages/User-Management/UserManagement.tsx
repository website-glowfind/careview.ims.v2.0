import { useEffect, useMemo, useState } from 'react';
import { UserPlus, Shield, Pencil, Eye, Search, Users, MoreHorizontal, KeyRound, Power, Trash2, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { AddUserModal } from '@/components/add-user-modal';
import { ManageAccessModal } from '@/components/manage-access-modal';
import { accessLevelLabel } from '@/config/permissions';
import type { User } from '@/types/inventory';

const ROLE_META: Record<string, { label: string; pill: string; icon: typeof Shield }> = {
  admin:    { label: 'Admin',    pill: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400', icon: Shield },
  encoder:  { label: 'Encoder',  pill: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400', icon: Pencil },
  employee: { label: 'Employee', pill: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300', icon: Eye },
};
const roleMeta = (role?: string) => ROLE_META[role ?? 'employee'] ?? ROLE_META.employee;
const hasCustom = (u: User) => !!u.permissions && Object.keys(u.permissions).length > 0;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'U';

export function UserManagement() {
  const { users, isLoading, error, fetchUsers, addUser, editUser, deleteUser, updatePermissions, setUserStatus } = useUserStore();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [managingUser, setManagingUser] = useState<User | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => (u.status ?? 'active') === 'active').length,
    admins: users.filter((u) => u.role === 'admin').length,
    custom: users.filter((u) => hasCustom(u)).length,
  }), [users]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchQ = !q || [u.fullName, u.username, u.email, u.department, u.role].some((v) => (v ?? '').toLowerCase().includes(q));
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || (u.status ?? 'active') === statusFilter;
      return matchQ && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const isSelf = (u: User) => currentUser?.name === u.fullName || currentUser?.username === u.username;

  const handleAddOrEdit = async (data: Omit<User, 'id' | 'createdAt'>) => {
    setActionError(null);
    try {
      if (editingUser) await editUser(editingUser.id, data);
      else await addUser(data);
      setIsModalOpen(false); setEditingUser(undefined);
    } catch (err: any) { setActionError(err.message); }
  };

  const toggleStatus = async (u: User) => {
    setMenuFor(null);
    try { await setUserStatus(u.id, (u.status ?? 'active') === 'active' ? 'inactive' : 'active'); }
    catch (err: any) { setActionError(err.message); }
  };

  const handleDelete = async (u: User) => {
    setMenuFor(null);
    if (!confirm(`Delete user "${u.fullName}"? This cannot be undone.`)) return;
    try { await deleteUser(u.id); } catch (err: any) { setActionError(err.message); }
  };

  const SELECT = 'px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300';

  const StatTile = ({ icon: Icon, label, value, accent, iconColor }: any) => (
    <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-medium"><Icon className={`w-4 h-4 ${iconColor ?? ''}`} /> {label}</div>
      <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Manage accounts, roles, and module-level access permissions</p>
        </div>
        {isAdmin && <button onClick={() => { setEditingUser(undefined); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79] whitespace-nowrap"><UserPlus className="w-4 h-4" /> Add New User</button>}
      </div>

      {(error || actionError) && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-400">{error || actionError}</div>}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Users} label="Total Users" value={stats.total} iconColor="text-[#0b5c96]" />
        <StatTile icon={CheckCircle2} label="Active" value={stats.active} accent="text-green-600" iconColor="text-green-500" />
        <StatTile icon={Shield} label="Admins" value={stats.admins} accent="text-blue-600" iconColor="text-blue-500" />
        <StatTile icon={KeyRound} label="Custom Perms" value={stats.custom} accent="text-amber-600" iconColor="text-amber-500" />
      </div>

      {/* Filters + table */}
      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={SELECT}><option value="all">All Roles</option><option value="admin">Admin</option><option value="encoder">Encoder</option><option value="employee">Employee</option></select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={SELECT}><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-y border-gray-200 dark:border-[#1e3a5f]">
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">User</th><th className="px-5 py-3">Email / Username</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Access Level</th><th className="px-5 py-3">Last Login</th><th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {isLoading && users.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#0b5c96] mx-auto" /></td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-14 text-center text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" />No users found</td></tr>
              ) : visible.map((u) => {
                const meta = roleMeta(u.role);
                const active = (u.status ?? 'active') === 'active';
                const self = isSelf(u);
                return (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#0b5c96]/10 text-[#0b5c96] dark:text-blue-400 flex items-center justify-center text-xs font-bold">{initials(u.fullName)}</div>
                        <div className="font-medium text-gray-900 dark:text-slate-200">{u.fullName} {self && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-700">You</span>}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><div className="text-gray-700 dark:text-slate-300">{u.email || '—'}</div><div className="text-xs text-gray-400">@{u.username}</div></td>
                    <td className="px-5 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${meta.pill}`}><meta.icon className="w-3 h-3" /> {meta.label}</span></td>
                    <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{u.department || '—'}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{accessLevelLabel(u)}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(u.lastLogin)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap relative">
                      {isAdmin && <button onClick={() => setManagingUser(u)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[#0b5c96] dark:text-blue-400 hover:bg-[#0b5c96]/10"><SlidersHorizontal className="w-3.5 h-3.5" /> Manage Access</button>}
                      {isAdmin && <button onClick={() => setMenuFor(menuFor === u.id ? null : u.id)} className="p-1.5 text-gray-400 hover:text-gray-700" title="More"><MoreHorizontal className="w-4 h-4" /></button>}
                      {menuFor === u.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                          <div className="absolute right-4 top-9 z-20 w-44 bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl shadow-lg py-1 text-left">
                            <button onClick={() => { setMenuFor(null); setEditingUser(u); setIsModalOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><Pencil className="w-4 h-4" /> Edit User</button>
                            <button onClick={() => toggleStatus(u)} disabled={self} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a] disabled:opacity-40"><Power className="w-4 h-4" /> {active ? 'Deactivate' : 'Activate'}</button>
                            <button onClick={() => handleDelete(u)} disabled={self} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40"><Trash2 className="w-4 h-4" /> Delete</button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-[#1e3a5f] text-sm text-gray-500 dark:text-slate-400">Showing {visible.length} of {users.length} users</div>
      </div>

      <AddUserModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingUser(undefined); setActionError(null); }} onAdd={handleAddOrEdit} editUser={editingUser} />

      {managingUser && (
        <ManageAccessModal
          user={managingUser}
          allUsers={users}
          onClose={() => setManagingUser(null)}
          onSave={async (perms) => { await updatePermissions(managingUser.id, perms); }}
        />
      )}
    </div>
  );
}
