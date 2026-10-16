import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, UserCog } from 'lucide-react';
import type { User, UserRole } from '@/types/inventory';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (user: Omit<User, 'id' | 'createdAt'>) => void;
  editUser?: User;
}

type FormState = {
  fullName: string; email: string; department: string; centerBranch: string;
  username: string; password: string; role: UserRole; status: 'active' | 'inactive';
};
const EMPTY: FormState = { fullName: '', email: '', department: '', centerBranch: '', username: '', password: '', role: 'employee', status: 'active' };

const INPUT = 'w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';
const LABEL = 'block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1';

// Must match the backend User model's `department` enum to avoid validation errors.
const DEPARTMENTS = ['Admin', 'HR', 'IT', 'Finance', 'Marketing', 'Operations'];

export function AddUserModal({ isOpen, onClose, onAdd, editUser }: AddUserModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showPassword, setShowPassword] = useState(false);

  // Sync form whenever the modal opens or the target user changes
  useEffect(() => {
    if (!isOpen) return;
    setForm(editUser ? {
      fullName: editUser.fullName || '', email: editUser.email || '', department: editUser.department || '',
      centerBranch: editUser.centerBranch || '', username: editUser.username || '', password: '',
      role: editUser.role || 'employee', status: editUser.status || 'active',
    } : EMPTY);
    setShowPassword(false);
  }, [isOpen, editUser]);

  if (!isOpen) return null;

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      fullName: form.fullName, email: form.email, department: form.department, centerBranch: form.centerBranch,
      username: form.username, password: form.password, role: form.role, status: form.status,
    } as Omit<User, 'id' | 'createdAt'>);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl shadow-xl max-w-xl w-full max-h-[92vh] overflow-y-auto border dark:border-[#1e3a5f]">
        <div className="sticky top-0 bg-white dark:bg-[#162236] border-b border-gray-100 dark:border-[#1e3a5f] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#0b5c96]/10 text-[#0b5c96] dark:text-blue-400 flex items-center justify-center"><UserCog className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{editUser ? 'Edit User' : 'Add New User'}</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Fill in the details for this account.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={LABEL}>Full Name <span className="text-red-500">*</span></label><input required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="John Doe" className={INPUT} /></div>
            <div><label className={LABEL}>Email Address</label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="juan@khealth.com" className={INPUT} /></div>
            <div>
              <label className={LABEL}>Department <span className="text-red-500">*</span></label>
              <select required value={form.department} onChange={(e) => set('department', e.target.value)} className={INPUT}>
                <option value="">Select department...</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                {form.department && !DEPARTMENTS.includes(form.department) && <option value={form.department}>{form.department}</option>}
              </select>
            </div>
            <div><label className={LABEL}>Center / Branch</label><input value={form.centerBranch} onChange={(e) => set('centerBranch', e.target.value)} placeholder="Main Office" className={INPUT} /></div>
            <div><label className={LABEL}>Username <span className="text-red-500">*</span></label><input required value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="johndoe" className={INPUT} /></div>
            <div>
              <label className={LABEL}>Password {!editUser && <span className="text-red-500">*</span>}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required={!editUser} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={editUser ? 'Leave blank to keep current' : '••••••••'} className={`${INPUT} pr-10`} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <div>
              <label className={LABEL}>Role <span className="text-red-500">*</span></label>
              <select required value={form.role} onChange={(e) => set('role', e.target.value)} className={INPUT}>
                <option value="admin">Admin — Full access</option>
                <option value="encoder">Editor — View &amp; edit</option>
                <option value="employee">Staff — View-only</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Account Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={INPUT}><option value="active">Active</option><option value="inactive">Inactive</option></select>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-[#0f1729] rounded-xl border border-gray-100 dark:border-[#1e3a5f]">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Role Defaults</h3>
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-slate-400">
              <p><span className="font-semibold text-blue-700 dark:text-blue-400">Admin</span> — Full access to all modules and actions. Permissions can be customized after creation.</p>
              <p><span className="font-semibold text-green-700 dark:text-green-400">Editor</span> — View and edit access to key modules. Cannot delete data or manage users.</p>
              <p><span className="font-semibold text-gray-700 dark:text-slate-300">Staff</span> — View-only access to limited modules. Customize via Manage Access.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79]">{editUser ? 'Update User' : 'Add User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
