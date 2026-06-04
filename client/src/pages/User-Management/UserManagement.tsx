import { useEffect, useState } from 'react';
import { UserPlus, Shield, User as UserIcon, Edit2, Trash2 } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { AddUserModal } from '@/components/add-user-modal';
import type { User } from '@/types/inventory';

export function UserManagement() {
  const { users, isLoading, error, fetchUsers, addUser, editUser, deleteUser } = useUserStore();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editingUser, setEditingUser]       = useState<User | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionError, setActionError]       = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-gray-600 dark:text-slate-400 mt-1">Manage user accounts and permissions</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
        {users.map(user => (
          <div
            key={user.id}
            className="bg-white dark:bg-[#162236] rounded-xl shadow border border-gray-200 dark:border-[#1e3a5f] p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  user.role === 'admin'
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'bg-gray-500/20 text-gray-500 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {user.role === 'admin'
                    ? <Shield className="w-6 h-6" />
                    : <UserIcon className="w-6 h-6" />
                  }
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{user.fullName}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{user.department || '—'}</p>
                </div>
              </div>
              {currentUser?.name === user.fullName && (
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
                <span className={`px-2 py-0.5 text-xs font-semibold rounded capitalize ${
                  user.role === 'admin'
                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300'
                }`}>
                  {user.role}
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
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(user.id)}
                  disabled={currentUser?.name === user.fullName}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    currentUser?.name === user.fullName
                      ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                      : deleteConfirmId === user.id
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20'
                  }`}
                  title={
                    currentUser?.name === user.fullName
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
        ))}

        {users.length === 0 && !isLoading && (
          <div className="col-span-3 text-center py-16 text-gray-400 dark:text-slate-500">
            <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No users found.</p>
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
