import { useEffect, useMemo, useRef, useState } from "react";
import {
  User,
  Lock,
  Save,
  Loader2,
  Camera,
  Check,
  Upload,
  Image as ImageIcon,
  Award,
} from "lucide-react";
import { PageHeader } from "../components/ui";
import Swal from "sweetalert2";
import { apiClient } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { ageFromDob, fmtInt } from "../lib/format";
import { useQueryClient } from "@tanstack/react-query";
import {
  qk,
  useBadges,
  useBodyImages,
  useGoals,
  useProfile,
  useUserBadges,
} from "../lib/queries";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const uid = user?.id;
  const qc = useQueryClient();

  // Shared cached queries — revisits render instantly with no refetch.
  const profileQ = useProfile();
  const goalsQ = useGoals(uid);
  const bodyImagesQ = useBodyImages(uid);
  const badgesQ = useBadges(uid);
  const userBadgesQ = useUserBadges(uid);
  const profile = profileQ.data ?? null;
  const goals = goalsQ.data ?? [];
  const bodyImages = bodyImagesQ.data ?? [];
  const badges = badgesQ.data ?? [];
  const userBadges = userBadgesQ.data ?? [];
  const earnedBadges = useMemo(() => {
    const earnedDates = new Map(
      userBadges.map((badge: any) => [String(badge.badge_id), badge.earned_at]),
    );
    return badges
      .filter((badge: any) => badge.earned)
      .map((badge: any) => ({
        ...badge,
        earned_at: badge.earned_at || earnedDates.get(String(badge.id)),
      }));
  }, [badges, userBadges]);
  const loading =
    profileQ.isLoading || goalsQ.isLoading || bodyImagesQ.isLoading;
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Body progress images
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageType, setImageType] = useState<"front" | "side" | "back">(
    "front",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile editing state
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editActivity, setEditActivity] = useState("");

  // Change password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Seed the form once per profile from the cached data — never re-sync the
  // same profile, so a background refetch can't clobber in-progress typing.
  const syncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || syncedRef.current === profile.id) return;
    syncedRef.current = profile.id;
    setEditName(profile.name || "");
    setEditDob(profile.dob ? String(profile.dob).slice(0, 10) : "");
    setEditHeight(profile.height_cm || "");
    setEditWeight(profile.weight_kg || "");
    setEditGender(profile.gender || "");
    setEditActivity(profile.activity_level || "");
    if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
  }, [profile]);

  async function handleAvatarUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!avatarFile || !uid) return;
    setSaving(true);
    try {
      const avatarUrl = `avatars/${uid}/${Date.now()}_${avatarFile.name}`;
      await apiClient.updateProfile(profile.id, { avatar_url: avatarUrl });
      qc.invalidateQueries({ queryKey: qk.profile() });
      setAvatarPreview(URL.createObjectURL(avatarFile));
      setAvatarFile(null);
      setSuccessMsg("Avatar updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to upload avatar.",
        confirmButtonText: "OK",
        confirmButtonColor: "#65a30d",
      });
    }
    setSaving(false);
  }

  async function handleBodyImageUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile || !uid) return;
    try {
      const fileName = `${uid}/body-progress/${Date.now()}_${imageType}.jpg`;
      const imageUrl = fileName;
      await apiClient.createBodyProgressImage?.({
        user_id: uid,
        image_url: imageUrl,
        image_type: imageType,
      });
      qc.invalidateQueries({ queryKey: qk.bodyImages(uid) });
      setShowImageUpload(false);
      setImageFile(null);
      setImagePreview(null);
      setSuccessMsg("Body progress image saved!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to upload body image.",
        confirmButtonText: "OK",
        confirmButtonColor: "#65a30d",
      });
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id || !uid) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      await apiClient.updateProfile(profile.id, {
        name: editName,
        dob: editDob,
        age: ageFromDob(editDob),
        height_cm: Number(editHeight),
        weight_kg: Number(editWeight),
        gender: editGender,
        activity_level: editActivity,
      });
      setSuccessMsg("Profile updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
      qc.invalidateQueries({ queryKey: qk.profile() });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update profile.",
        confirmButtonText: "OK",
        confirmButtonColor: "#65a30d",
      });
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwError("");
    setPwSaving(true);
    try {
      await apiClient.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwError("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
      setSuccessMsg("Password changed successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Password change failed.",
        confirmButtonText: "OK",
        confirmButtonColor: "#65a30d",
      });
    }
    setPwSaving(false);
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2
          className="text-brand-400 animate-spin mx-auto mb-4"
          size={32}
        />
        <p className="text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Account, body stats, photos, and security."
        icon={User}
      />

      {/* Messages */}
      {successMsg && (
        <div className="mb-4 bg-green-900/30 border border-green-600/40 text-green-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <Check size={16} /> {successMsg}
        </div>
      )}

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
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-slate-500" />
              )}
            </div>
          </div>
          <div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition">
              <Camera size={16} />{" "}
              {avatarPreview ? "Change Avatar" : "Upload Avatar"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAvatarFile(e.target.files[0]);
                    setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                  }
                }}
              />
            </label>
            {avatarFile && (
              <button
                onClick={handleAvatarUpload}
                disabled={saving}
                className="ml-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>

        <form
          onSubmit={handleProfileSave}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Email</label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Date of birth{" "}
              {editDob && ageFromDob(editDob) !== null && (
                <span className="text-brand-400 font-semibold">
                  · Age {ageFromDob(editDob)}
                </span>
              )}
            </label>
            <input
              type="date"
              value={editDob}
              onChange={(e) => setEditDob(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Height (cm)
            </label>
            <input
              type="number"
              value={editHeight}
              onChange={(e) => setEditHeight(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Weight (kg)
            </label>
            <input
              type="number"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Gender</label>
            <select
              value={editGender}
              onChange={(e) => setEditGender(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Activity Level
            </label>
            <select
              value={editActivity}
              onChange={(e) => setEditActivity(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="sedentary">Sedentary</option>
              <option value="lightly_active">Lightly Active</option>
              <option value="moderately_active">Moderately Active</option>
              <option value="very_active">Very Active</option>
              <option value="extremely_active">Extremely Active</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}{" "}
              Save Profile
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
          <button
            onClick={() => setShowPasswordSection(true)}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center gap-2"
          >
            <Lock size={18} /> Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {pwError && <div className="text-red-400 text-sm">{pwError}</div>}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pwSaving}
                className="flex-1 py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pwSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}{" "}
                Save Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection(false);
                  setPwError("");
                }}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Body Progress Images */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon size={20} className="text-brand-400" /> Body Progress
            Images
          </h3>
          <button
            onClick={() => setShowImageUpload(!showImageUpload)}
            className="px-4 py-2 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition"
          >
            {showImageUpload ? "Cancel" : "+ Upload"}
          </button>
        </div>

        {showImageUpload && (
          <form
            onSubmit={handleBodyImageUpload}
            className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 mb-4 space-y-3"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Angle
                </label>
                <select
                  value={imageType}
                  onChange={(e) =>
                    setImageType(e.target.value as "front" | "side" | "back")
                  }
                  className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm"
                >
                  <option value="front">Front</option>
                  <option value="side">Side</option>
                  <option value="back">Back</option>
                </select>
              </div>
              <div className="col-span-3 flex gap-3 items-end">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setImageFile(e.target.files[0]);
                      setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition flex items-center gap-2"
                >
                  <Upload size={16} /> Choose Image
                </button>
                {imagePreview && (
                  <span className="text-sm text-brand-400">✓ Selected</span>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={!imageFile}
              className="w-full py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold transition disabled:opacity-50"
            >
              Save Body Progress Image
            </button>
          </form>
        )}

        {bodyImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {bodyImages.map((img: any, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950"
              >
                <div className="h-32 bg-slate-800 flex items-center justify-center">
                  <ImageIcon size={24} className="text-slate-600" />
                </div>
                <div className="p-2 text-center text-xs text-slate-400 capitalize">
                  {img.image_type}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No body progress images yet.</p>
        )}
      </div>

      {/* Earned Badges */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 mb-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Award size={20} className="text-yellow-400" /> Earned Badges
        </h3>
        {earnedBadges.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No badges earned yet. Keep logging your goals and daily progress.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {earnedBadges.map((badge: any) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 bg-slate-950/60 border border-yellow-500/20 rounded-xl px-4 py-3"
              >
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Award size={20} className="text-yellow-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-bold truncate">
                    {badge.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {badge.description || "Achievement unlocked"}
                  </div>
                  {badge.earned_at && (
                    <div className="text-[11px] text-brand-400 mt-1">
                      Earned {new Date(badge.earned_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goal History */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-4">Goal History</h3>
        {goals.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No goals set yet. Go to{" "}
            <a href="/goals" className="text-brand-400 hover:underline">
              Goals
            </a>{" "}
            to create one.
          </p>
        ) : (
          <div className="grid gap-3">
            {goals.map((g: any) => (
              <div
                key={g.id}
                className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-5 py-4"
              >
                <div>
                  <span className="font-bold text-brand-400 capitalize">
                    {String(g.goal_type).replace(/_/g, " ")}
                  </span>
                  <div className="text-sm text-slate-400 mt-1">
                    Target:{" "}
                    <b className="text-white">
                      {fmtInt(g.target_value ?? g.target_calories)} kcal
                    </b>
                    {g.protein_target ? (
                      <>
                        {" "}
                        · Protein:{" "}
                        <b className="text-white">{g.protein_target}g</b>
                      </>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {g.start_date ? `Started: ${g.start_date}` : ""}{" "}
                    {g.target_date ? ` · Target: ${g.target_date}` : ""}
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-brand-600/20 text-brand-300">
                  {g.status ?? "active"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
