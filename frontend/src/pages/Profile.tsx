import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { useAuth, type User } from '../context/AuthContext';
import { API_URL } from '../config';
import { Spinner } from '../components/ui';

const passwordSchema = z
  .object({
    currentPassword: z.string().nonempty('Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
    confirmPassword: z.string().nonempty('Confirm password is required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Notice = { type: 'success' | 'error'; text: string } | null;

const NoticeBox: React.FC<{ notice: Notice }> = ({ notice }) =>
  notice ? (
    <div
      className={`p-3 mb-4 text-sm rounded-lg border ${
        notice.type === 'success'
          ? 'bg-positive-bg border-positive/30 text-positive'
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}
    >
      {notice.text}
    </div>
  ) : null;

const errorText = (data: any, fallback: string) =>
  (Array.isArray(data?.message) ? data.message[0] : data?.message) || fallback;

export const Profile: React.FC = () => {
  const { authFetch, updateUser } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [nameNotice, setNameNotice] = useState<Notice>(null);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwNotice, setPwNotice] = useState<Notice>(null);
  const [savingPw, setSavingPw] = useState(false);

  // Luôn lấy profile mới từ server (có hasPassword) thay vì tin bản cache trong localStorage.
  useEffect(() => {
    authFetch(`${API_URL}/users/me`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load your profile.');
        const data: User = await res.json();
        setProfile(data);
        setName(data.name ?? '');
        updateUser(data);
      })
      .catch((err: Error) => setLoadError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameNotice(null);
    setSavingName(true);
    try {
      const res = await authFetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(data, 'Could not update your name.'));
      setProfile(data);
      updateUser(data);
      setNameNotice({ type: 'success', text: 'Name updated.' });
    } catch (err: any) {
      setNameNotice({ type: 'error', text: err.message });
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwNotice(null);

    const parsed = passwordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!parsed.success) {
      setPwNotice({ type: 'error', text: parsed.error.issues[0].message });
      return;
    }

    setSavingPw(true);
    try {
      const res = await authFetch(`${API_URL}/users/me/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(data, 'Could not change your password.'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwNotice({ type: 'success', text: 'Password changed.' });
    } catch (err: any) {
      setPwNotice({ type: 'error', text: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  const labelClass = 'block text-sm font-medium text-gray-300 mb-2';

  return (
    <div className="bp-grid relative min-h-screen bg-ground text-white overflow-hidden">
      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight mb-8">Profile</h1>

        {loadError && (
          <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{loadError}</div>
        )}

        {!profile && !loadError && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {profile && (
          <div className="space-y-8">
            {/* Thông tin cơ bản */}
            <section className="p-6 bg-surface border border-white/8 rounded-2xl">
              <h2 className="text-lg font-bold mb-4">Account</h2>
              <NoticeBox notice={nameNotice} />
              <form onSubmit={saveName} className="space-y-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input value={profile.email} disabled className="field opacity-60 cursor-not-allowed" />
                  <p className="mt-1 text-xs text-gray-500">Email can't be changed yet.</p>
                </div>
                <div>
                  <label className={labelClass}>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="field" placeholder="Your name" />
                </div>
                <button type="submit" disabled={savingName} className="btn-primary py-2.5 px-5">
                  <Save size={16} />
                  <span>{savingName ? 'Saving…' : 'Save changes'}</span>
                </button>
              </form>
            </section>

            {/* Đổi mật khẩu — tài khoản chỉ có Google không có mật khẩu để đổi */}
            <section className="p-6 bg-surface border border-white/8 rounded-2xl">
              <h2 className="text-lg font-bold mb-4">Password</h2>
              {profile.hasPassword ? (
                <>
                  <NoticeBox notice={pwNotice} />
                  <form onSubmit={savePassword} className="space-y-4">
                    <div>
                      <label className={labelClass}>Current password</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="field" autoComplete="current-password" />
                    </div>
                    <div>
                      <label className={labelClass}>New password</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="field" autoComplete="new-password" />
                    </div>
                    <div>
                      <label className={labelClass}>Confirm new password</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="field" autoComplete="new-password" />
                    </div>
                    <button type="submit" disabled={savingPw} className="btn-primary py-2.5 px-5">
                      <KeyRound size={16} />
                      <span>{savingPw ? 'Updating…' : 'Change password'}</span>
                    </button>
                  </form>
                </>
              ) : (
                <p className="text-sm text-gray-400">
                  You signed up with Google, so there's no password on this account. You'll keep signing in with Google.
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
