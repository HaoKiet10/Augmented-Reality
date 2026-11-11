import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, KeyRound, Camera, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useAuth, type User } from '../context/AuthContext';
import { API_URL } from '../config';
import { Avatar, Spinner } from '../components/ui';

const newPasswordRules = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long');

const changePasswordSchema = z
  .object({
    currentPassword: z.string().nonempty('Current password is required'),
    newPassword: newPasswordRules,
    confirmPassword: z.string().nonempty('Confirm password is required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

const setPasswordSchema = z
  .object({
    newPassword: newPasswordRules,
    confirmPassword: z.string().nonempty('Confirm password is required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

// Khớp với whitelist + giới hạn 5 MB ở backend; check trước ở client để báo lỗi ngay, khỏi upload vô ích.
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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

const memberSince = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : null;

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`px-2 py-0.5 text-xs font-semibold bg-white/5 text-gray-300 border border-white/10 rounded-full ${className}`}>
    {children}
  </span>
);

const secondaryBtn =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold border border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';

export const Profile: React.FC = () => {
  const { authFetch, updateUser } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarNotice, setAvatarNotice] = useState<Notice>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [name, setName] = useState('');
  const [nameNotice, setNameNotice] = useState<Notice>(null);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwNotice, setPwNotice] = useState<Notice>(null);
  const [savingPw, setSavingPw] = useState(false);

  const applyProfile = (data: User) => {
    setProfile(data);
    updateUser(data);
  };

  // Luôn lấy profile mới từ server (có hasPassword) thay vì tin bản cache trong localStorage.
  useEffect(() => {
    authFetch(`${API_URL}/users/me`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load your profile.');
        const data: User = await res.json();
        applyProfile(data);
        setName(data.name ?? '');
      })
      .catch((err: Error) => setLoadError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại đúng file đó lần nữa
    if (!file) return;

    setAvatarNotice(null);
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarNotice({ type: 'error', text: 'Please choose a PNG, JPEG or WebP image.' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarNotice({ type: 'error', text: 'Image must be 5 MB or smaller.' });
      return;
    }

    setAvatarBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      // Không tự set Content-Type: trình duyệt cần tự thêm boundary cho multipart.
      const res = await authFetch(`${API_URL}/users/me/avatar`, { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(data, 'Could not upload your photo.'));
      applyProfile(data);
      setAvatarNotice({ type: 'success', text: 'Photo updated.' });
    } catch (err: any) {
      setAvatarNotice({ type: 'error', text: err.message });
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarNotice(null);
    setAvatarBusy(true);
    try {
      const res = await authFetch(`${API_URL}/users/me/avatar`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(data, 'Could not remove your photo.'));
      applyProfile(data);
      setAvatarNotice({ type: 'success', text: 'Photo removed.' });
    } catch (err: any) {
      setAvatarNotice({ type: 'error', text: err.message });
    } finally {
      setAvatarBusy(false);
    }
  };

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
      applyProfile(data);
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
    const isSetting = !profile?.hasPassword;

    const parsed = isSetting
      ? setPasswordSchema.safeParse({ newPassword, confirmPassword })
      : changePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!parsed.success) {
      setPwNotice({ type: 'error', text: parsed.error.issues[0].message });
      return;
    }

    setSavingPw(true);
    try {
      const res = await authFetch(`${API_URL}/users/me/password`, {
        // POST = đặt lần đầu (Google-only), PATCH = đổi (bắt buộc mật khẩu hiện tại).
        method: isSetting ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSetting ? { newPassword } : { currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(data, isSetting ? 'Could not set your password.' : 'Could not change your password.'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (isSetting && profile) applyProfile({ ...profile, hasPassword: true });
      setPwNotice({
        type: 'success',
        text: isSetting ? 'Password set. You can now sign in with your email too.' : 'Password changed.',
      });
    } catch (err: any) {
      setPwNotice({ type: 'error', text: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  const labelClass = 'block text-sm font-medium text-gray-300 mb-2';
  const cardClass = 'p-6 bg-surface border border-white/8 rounded-2xl';
  const since = memberSince(profile?.createdAt);

  return (
    <div className="bp-grid relative min-h-screen bg-ground text-white overflow-hidden">
      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        {loadError && (
          <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{loadError}</div>
        )}

        {!profile && !loadError && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            {/* Header: ảnh đại diện + danh tính */}
            <section className={cardClass}>
              <NoticeBox notice={avatarNotice} />
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                {/* Bấm thẳng vào ảnh để đổi — cùng file picker với nút "Change photo". */}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={avatarBusy}
                  title={profile.avatarUrl ? 'Change photo' : 'Upload photo'}
                  aria-label={profile.avatarUrl ? 'Change photo' : 'Upload photo'}
                  className="group relative self-start rounded-full cursor-pointer disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <Avatar url={profile.avatarUrl} name={profile.name} email={profile.email} size="lg" />
                  {avatarBusy ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ground/70">
                      <Spinner size="sm" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ground/60 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                      <Camera size={22} />
                    </div>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-extrabold tracking-tight truncate">{profile.name || profile.email.split('@')[0]}</h1>
                  <p className="text-sm text-gray-400 truncate">{profile.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {profile.role && <Badge className="capitalize">{profile.role}</Badge>}
                    {profile.hasGoogle && <Badge>Google linked</Badge>}
                    {since && <span className="text-xs text-gray-500">Member since {since}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <input ref={fileInput} type="file" accept={AVATAR_TYPES.join(',')} onChange={uploadAvatar} className="hidden" />
                    <button type="button" onClick={() => fileInput.current?.click()} disabled={avatarBusy} className={secondaryBtn}>
                      <Camera size={16} />
                      <span>{profile.avatarUrl ? 'Change photo' : 'Upload photo'}</span>
                    </button>
                    {profile.avatarUrl && (
                      <button type="button" onClick={removeAvatar} disabled={avatarBusy} className={secondaryBtn}>
                        <Trash2 size={16} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">PNG, JPEG or WebP, up to 5 MB.</p>
                </div>
              </div>
            </section>

            {/* Thông tin cơ bản */}
            <section className={cardClass}>
              <h2 className="text-lg font-bold mb-4">Account</h2>
              <NoticeBox notice={nameNotice} />
              <form onSubmit={saveName} className="space-y-4">
                <div>
                  <label className={labelClass}>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="field" placeholder="Your name" />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input value={profile.email} disabled className="field opacity-60 cursor-not-allowed" />
                  <p className="mt-1 text-xs text-gray-500">Email can't be changed yet.</p>
                </div>
                <button type="submit" disabled={savingName} className="btn-primary py-2.5 px-5">
                  <Save size={16} />
                  <span>{savingName ? 'Saving…' : 'Save changes'}</span>
                </button>
              </form>
            </section>

            {/* Mật khẩu: đổi (đã có) hoặc đặt lần đầu (tài khoản chỉ có Google) */}
            <section className={cardClass}>
              <h2 className="text-lg font-bold mb-1">Password</h2>
              <p className="text-sm text-gray-400 mb-4">
                {profile.hasPassword
                  ? 'Change the password you use to sign in with your email.'
                  : "You signed up with Google, so there's no password yet. Set one to also sign in with your email."}
              </p>
              <NoticeBox notice={pwNotice} />
              <form onSubmit={savePassword} className="space-y-4">
                {profile.hasPassword && (
                  <div>
                    <label className={labelClass}>Current password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="field" autoComplete="current-password" />
                  </div>
                )}
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
                  <span>
                    {profile.hasPassword ? (savingPw ? 'Updating…' : 'Change password') : savingPw ? 'Saving…' : 'Set password'}
                  </span>
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
