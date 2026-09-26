import { useEffect, useState, useRef } from 'react';
import { User, Lock, Save, Loader2, Camera, Check, Upload, Image as ImageIcon } from 'lucide-react';
import { PageHeader } from '../components/ui';
import Swal from 'sweetalert2';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';

export default function ProfilePage() {
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Body progress images
  const [bodyImages, setBodyImages] = useState<any[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageType, setImageType] = useState<'front' | 'side' | 'back'>('front');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile editing state
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editActivity, setEditActivity] = useState('');

  // Change password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  async function loadProfile(uid: string) {
    try {
      const data = await apiClient.getProfile();
      setProfile(data);
      const p = Array.isArray(data) ? data[0] : data;
      setEditName(p.name || '');
      setEditAge(p.age || '');
      setEditHeight(p.height_cm || '');
      setEditWeight(p.weight_kg || '');
      setEditGender(p.gender || '');
      setEditActivity(p.activity_level || '');
      if (p.avatar_url) setAvatarPreview(p.avatar_url);

      const goalsData = await apiClient.getGoals(uid);
      setGoals(Array.isArray(goalsData) ? goalsData : []);

      // Load body progress images
      try {
        const images = await apiClient.getBodyProgressImages?.(uid);
        setBodyImages(Array.isArray(images) ? images : []);
      } catch {}
    } catch {
      // Profile might not exist yet
    }
    setLoading(false);
  }

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    setUserId(user.id);
    loadProfile(user.id);
  }, [accessToken, user?.id]);

  async function handleAvatarUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!avatarFile || !userId) return;
    setSaving(true);
    try {
      const avatarUrl = `avatars/${userId}/${Date.now()}_${avatarFile.name}`;
      await apiClient.updateProfile(profile.id, { avatar_url: avatarUrl });
      setAvatarPreview(URL.createObjectURL(avatarFile));
      setAvatarFile(null);
      setSuccessMsg('Avatar updated!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to upload avatar.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
    setSaving(false);
  }

  async function handleBodyImageUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile || !userId) return;
    try {
      const fileName = `${userId}/body-progress/${Date.now()}_${imageType}.jpg`;
      const imageUrl = fileName;
      await apiClient.createBodyProgressImage?.({
        user_id: userId,
        image_url: imageUrl,
        image_type: imageType,
      });
      setBodyImages(prev => [...prev, { image_url: imageUrl, image_type: imageType, recorded_at: new Date().toISOString() }]);
      setShowImageUpload(false);
      setImageFile(null);
      setImagePreview(null);
      setSuccessMsg('Body progress image saved!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to upload body image.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id || !userId) return;
    setSaving(true);
    setSuccessMsg('');
    try {
      await apiClient.updateProfile(profile.id, {
        name: editName,
        age: Number(editAge),
        height_cm: Number(editHeight),
        weight_kg: Number(editWeight),
        gender: editGender,
        activity_level: editActivity,
      });
      setSuccessMsg('Profile updated!');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadProfile(userId);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update profile.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwError('');
    setPwSaving(true);
    try {
      await apiClient.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPwError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setSuccessMsg('Password changed successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Password change failed.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
    setPwSaving(false);
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="text-brand-400 animate-spin mx-auto mb-4" size={32} />
        <p className="text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Account, body stats, photos, and security." icon={User} />

      {/* Messages */}
      {successMsg && <div className="mb-4 bg-green-900/30 border border-green-600/40 text-green-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2"><Check size={16} /> {successMsg}</div>}

      {/* Profile Info Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 mb-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <User size={20} className="text-brand-400" /> Your Information
        </h3>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-brand-600/40">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-slate-500" />
              )}
            </div>
          </div>
          <div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition">
              <Camera size={16} /> {avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) { setAvatarFile(e.target.files[0]); setAvatarPreview(URL.createObjectURL(e.target.files[0])); } }} />
            </label>
            {avatarFile && (
              <button onClick={handleAvatarUpload} disabled={saving}
                className="ml-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition">
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Email</label>
            <input type="email" value={profile?.email || ''} disabled
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Age</label>
            <input type="number" value={editAge} onChange={e => setEditAge(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Height (cm)</label>
            <input type="number" value={editHeight} onChange={e => setEditHeight(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
            <input type="number" value={editWeight} onChange={e => setEditWeight(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Gender</label>
            <select value={editGender} onChange={e => setEditGender(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Activity Level</label>
            <select value={editActivity} onChange={e => setEditActivity(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500">
              <option value="sedentary">Sedentary</option>
              <option value="lightly_active">Lightly Active</option>
              <option value="moderately_active">Moderately Active</option>
              <option value="very_active">Very Active</option>
              <option value="extremely_active">Extremely Active</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 mb-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Lock size={20} className="text-brand-400" /> Security
        </h3>
        {!showPasswordSection ? (
          <button onClick={() => setShowPasswordSection(true)}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center gap-2">
            <Lock size={18} /> Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {pwError && <div className="text-red-400 text-sm">{pwError}</div>}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" required />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" required minLength={6} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" required />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={pwSaving}
                className="flex-1 py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {pwSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Password
              </button>
              <button type="button" onClick={() => { setShowPasswordSection(false); setPwError(''); }}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Body Progress Images */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon size={20} className="text-brand-400" /> Body Progress Images
          </h3>
          <button onClick={() => setShowImageUpload(!showImageUpload)}
            className="px-4 py-2 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition">
            {showImageUpload ? 'Cancel' : '+ Upload'}
          </button>
        </div>

        {showImageUpload && (
          <form onSubmit={handleBodyImageUpload} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Angle</label>
                <select value={imageType} onChange={e => setImageType(e.target.value as 'front' | 'side' | 'back')}
                  className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm">
                  <option value="front">Front</option>
                  <option value="side">Side</option>
                  <option value="back">Back</option>
                </select>
              </div>
              <div className="col-span-3 flex gap-3 items-end">
                <input type="file" accept="image/*" ref={fileInputRef}
                  onChange={e => { if (e.target.files?.[0]) { setImageFile(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); } }}
                  className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition flex items-center gap-2">
                  <Upload size={16} /> Choose Image
                </button>
                {imagePreview && <span className="text-sm text-brand-400">✓ Selected</span>}
              </div>
            </div>
            <button type="submit" disabled={!imageFile}
              className="w-full py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold transition disabled:opacity-50">
              Save Body Progress Image
            </button>
          </form>
        )}

        {bodyImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {bodyImages.map((img: any, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <div className="h-32 bg-slate-800 flex items-center justify-center">
                  <ImageIcon size={24} className="text-slate-600" />
                </div>
                <div className="p-2 text-center text-xs text-slate-400 capitalize">{img.image_type}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No body progress images yet.</p>
        )}
      </div>

      {/* Goal History */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-4">Goal History</h3>
        {goals.length === 0 ? (
          <p className="text-slate-500 text-sm">No goals set yet. Go to <a href="/goals" className="text-brand-400 hover:underline">Goals</a> to create one.</p>
        ) : (
          <div className="grid gap-3">
            {goals.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-5 py-4">
                <div>
                  <span className="font-bold text-brand-400 capitalize">{String(g.goal_type).replace(/_/g, ' ')}</span>
                  <div className="text-sm text-slate-400 mt-1">
                    Target: <b className="text-white">{g.target_value ?? g.target_calories} kcal</b>
                    {g.protein_target && ` · Protein: <b className="text-white">${g.protein_target}g</b>`}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {g.start_date ? `Started: ${g.start_date}` : ''} {g.target_date ? ` · Target: ${g.target_date}` : ''}
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-brand-600/20 text-brand-300">{g.status ?? 'active'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
