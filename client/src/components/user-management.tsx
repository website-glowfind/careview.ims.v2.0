import { useState } from 'react';
import { UserPlus, Edit, Trash2, Shield, User as UserIcon, Edit2 } from 'lucide-react';
import type { User } from '@/types/inventory';
import { AddUserModal } from './add-user-modal';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onEditUser: (id: string, user: Omit<User, 'id' | 'createdAt'>) => void;
  onDeleteUser: (id: string) => void;
}

export function UserManagement({
  users,
  currentUser,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: UserManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsAddModalOpen(true);
  };

  const handleAddOrEdit = (userData: Omit<User, 'id' | 'createdAt'>) => {
    if (editingUser) {
      onEditUser(editingUser.id, userData);
      setEditingUser(undefined);
    } else {
      onAddUser(userData);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingUser(undefined);
  };

  const handleDeleteClick = (id: string) => {
    if (deleteConfirmId === id) {
      onDeleteUser(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Add New User
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>View-only mode:</strong> You need admin privileges to manage users.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    user.role === 'admin'
                      ? 'bg-blue-100 text-blue-600'
                      : user.role === 'editor'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {user.role === 'admin' ? (
                    <Shield className="w-6 h-6" />
                  ) : user.role === 'editor' ? (
                    <Edit2 className="w-6 h-6" />
                  ) : (
                    <UserIcon className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {user.fullName}
                  </h3>
                  <p className="text-sm text-gray-500">{user.department}</p>
                </div>
              </div>
              {currentUser.id === user.id && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                  You
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Username:</span>
                <span className="font-mono text-gray-900">{user.username}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Role:</span>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded capitalize ${
                    user.role === 'admin'
                      ? 'bg-blue-100 text-blue-800'
                      : user.role === 'editor'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(user)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(user.id)}
                  disabled={currentUser.id === user.id}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    currentUser.id === user.id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : deleteConfirmId === user.id
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                  title={
                    currentUser.id === user.id
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
      </div>

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onAdd={handleAddOrEdit}
        editUser={editingUser}
      />
    </div>
  );
}