import { useEffect, useMemo, useState } from 'react';
import { UserPlus, Shield, User as UserIcon, Edit2, Trash2, Search, Users, Pencil, Eye } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { AddUserModal } from '@/components/add-user-modal';
import type { User } from '@/types/inventory';

// Role presentation (data uses employee / encoder / admin)
const ROLE_META: Record<string, { label: string; pill: string; icon: typeof Shield }> = {
  admin:    { label: 'Administrator', pill: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400', icon: Shield },
  encoder:  { label: 'Encoder',       pill: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400', icon: Pencil },
  employee: { label: 'Employee',      pill: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300', icon: Eye },
};
const roleMeta = (role?: string) => ROLE_META[role ?? 'employee'] ?? ROLE_META.employee;

export function UserManagement() {
  const { users, isLoading, error, fetchUsers, addUser, editUser, deleteUser } = useUserStore();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editingUser, setEditingUser]       = useState<User | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionError, setActionError]       = useState<string | null>(null);
  const [search, setSearch]                 = useState('');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const stats = useMemo(() => ({
    total:    users.length,
    admin:    users.filter(u => u.role === 'admin').length,
    encoder:  users.filter(u => u.role === 'encoder').length,
    employee: users.filter(u => u.role !== 'admin' && u.role !== 'encoder').length,
  }), [users]);

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      [u.fullName, u.username, u.department, u.role].some(v => (v ?? '').toLowerCase().includes(q)),
    );
  }, [users, search]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleAddOrEdit = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    setActionError(null);
    try {
      if (editingUser) {
        await editUser(editingUser.id, userData);
      } else {
        await addUser(userData);
      }
      setIsModalOpen(false);
      setEditingUser(undefined);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(undefined);
    setActionError(null);
  };

  const handleDeleteClick = async (id: string) => {
    if (deleteConfirmId === id) {
      try {
        await deleteUser(id);
      } catch (err: any) {
        setActionError(err.message);
      }
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const statTiles = [
    { label: 'Total Users',    value: stats.total,    icon: Users,  color: 'bg-[#0b5c96]' },
    { label: 'Administrators', value: stats.admin,    icon: Shield, color: 'bg-blue-500' },
    { label: 'Encoders',       value: stats.encoder,  icon: Pencil, color: 'bg-amber-500' },
    { label: 'Employees',      value: stats.employee, icon: Eye,    color: 'bg-slate-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statTiles.map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#162236] rounded-2xl border border-gray-200 dark:border-[#1e3a5f] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-slate-400 text-sm">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
              </div>
              <div className={`${s.color} w-11 h-11 rounded-xl flex items-center justify-center`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: search + add */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, department, or role..."
            className="w-full rounded-xl border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#162236] pl-10 pr-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40"
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0b5c96] text-white rounded-xl hover:bg-[#094a79] transition-colors font-medium whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" />
            Add New User
          </button>
        )}
      </div>

      {/* Error banner */}
      {(error || actionError) && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
          ⚠️ {error || actionError}
        </div>
      )}

      {/* View-only notice */}
      {!isAdmin && (
        <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-400 text-sm">
            <strong>View-only mode:</strong> You need admin privileges to manage users.
          </p>
        </div>
      )}

      {/* User Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleUsers.map(user => {
          const meta = roleMeta(user.role);
          const RoleIcon = meta.icon;
          const isSelf = currentUser?.name === user.fullName;
          return (
          <div
            key={user.id}
            className="bg-white dark:bg-[#162236] rounded-2xl shadow-sm border border-gray-200 dark:border-[#1e3a5f] p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0b5c96]/10 text-[#0b5c96] dark:bg-blue-500/15 dark:text-blue-400">
                  <RoleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{user.fullName}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{user.department || '—'}</p>
                </div>
              </div>
              {isSelf && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 text-xs font-semibold rounded">
                  You
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Username:</span>
                <span className="font-mono text-gray-900 dark:text-slate-200">{user.username}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Role:</span>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${meta.pill}`}>
                  {meta.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Created:</span>
                <span className="text-gray-900 dark:text-slate-200">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-[#1e3a5f]">
                <button
                  onClick={() => handleEdit(user)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0b5c96]/10 text-[#0b5c96] dark:text-blue-400 rounded-lg hover:bg-[#0b5c96]/20 transition-colors text-sm font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(user.id)}
                  disabled={isSelf}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    isSelf
                      ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                      : deleteConfirmId === user.id
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20'
                  }`}
                  title={
                    isSelf
                      ? 'Cannot delete yourself'
                      : deleteConfirmId === user.id
                      ? 'Click again to confirm'
                      : 'Delete user'
                  }
                >
                  <Trash2 className="w-4 h-4" />
                  {deleteConfirmId === user.id ? 'Confirm?' : 'Delete'}
                </button>
              </div>
            )}
          </div>
          );
        })}

        {visibleUsers.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-16 text-gray-400 dark:text-slate-500">
            <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{search ? 'No users match your search.' : 'No users found.'}</p>
          </div>
        )}
      </div>

      <AddUserModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAdd={handleAddOrEdit}
        editUser={editingUser}
      />
    </div>
  );
}
