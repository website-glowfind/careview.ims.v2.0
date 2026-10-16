import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, LogOut } from 'lucide-react';
import { changePasswordService, logoutService } from '@/services/authServices';

const INPUT = 'w-full px-3 py-2 pr-10 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';
const LABEL = 'block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1';

/** Blocking modal shown when a user must change an admin-set / temporary password. */
export function ForceChangePasswordModal() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (next !== confirm) { setError('New password and confirmation do not match.'); return; }
    if (next === current) { setError('New password must be different from the current one.'); return; }
    setSaving(true);
    try { await changePasswordService(current, next); }
    catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-md shadow-2xl border dark:border-[#1e3a5f]">
        <div className="flex items-center gap-2.5 p-5 border-b border-gray-100 dark:border-[#1e3a5f]">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-600 flex items-center justify-center"><KeyRound className="w-5 h-5" /></div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Change Your Password</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">For your security, set a new password before continuing. The one you have was set by an administrator.</p>
          </div>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}

          <div>
            <label className={LABEL}>Current Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="The password given to you" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>New Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} required value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 6 characters" className={INPUT} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>
          <div>
            <label className={LABEL}>Confirm New Password <span className="text-red-500">*</span></label>
            <input type={show ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-type new password" className={INPUT} />
          </div>

          <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Update Password</button>
          <button type="button" onClick={() => logoutService()} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><LogOut className="w-4 h-4" /> Log out</button>
        </form>
      </div>
    </div>
  );
}
