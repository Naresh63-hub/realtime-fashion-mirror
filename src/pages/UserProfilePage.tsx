import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';

export const UserProfilePage: React.FC = () => {
  const { profile, updateProfile, savedLooks, favoriteIds, preferences, updatePreferences, navigate } = useApp();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, email });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportData = () => {
    const dataStr = StorageService.exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `ai-fashion-mirror-export-${Date.now()}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAllData = () => {
    if (window.confirm('Are you sure you want to delete all local try-ons, saved looks, and preferences? This action is permanent.')) {
      StorageService.clearAllData();
      window.location.reload();
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>👤</span>
          <span>User Profile & Statistics</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Manage your local profile identity, device preferences, and private data controls.
        </p>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300">
          ✓ Profile settings saved successfully!
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-3xl font-bold text-white shadow-xl">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-white">{profile.name}</h2>
            <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/30">
              Local Tier
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Member since {new Date(profile.memberSince).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Try-On Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-5">
          <span className="text-2xl">⚡</span>
          <p className="text-2xl font-black text-white mt-2">{profile.totalTryOns || savedLooks.length}</p>
          <p className="text-xs text-gray-400">Total Try-On Sessions</p>
        </div>

        <div
          onClick={() => navigate('saved')}
          className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 cursor-pointer hover:border-violet-500/40 transition"
        >
          <span className="text-2xl">❤️</span>
          <p className="text-2xl font-black text-white mt-2">{savedLooks.length}</p>
          <p className="text-xs text-gray-400">Saved Looks in Gallery</p>
        </div>

        <div
          onClick={() => navigate('gallery')}
          className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 cursor-pointer hover:border-violet-500/40 transition"
        >
          <span className="text-2xl">⭐</span>
          <p className="text-2xl font-black text-white mt-2">{favoriteIds.length}</p>
          <p className="text-xs text-gray-400">Favorited Clothing Items</p>
        </div>
      </div>

      {/* Edit Details Form */}
      <form onSubmit={handleSaveProfile} className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
          Profile Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-xs text-white focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Email Address (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-xs text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
        >
          Update Profile
        </button>
      </form>

      {/* Privacy and Data Controls (Section 10) */}
      <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
          Privacy & Data Sovereignty
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          AI Fashion Mirror is built on a privacy-first architecture. All camera video frames and personal photographs are processed strictly within your local browser sandbox and never shared or retained without your explicit consent.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportData}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-200 hover:bg-white/10 transition"
          >
            📥 Export All My Data (JSON)
          </button>
          <button
            type="button"
            onClick={handleDeleteAllData}
            className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition"
          >
            🗑️ Delete All Local Data & Purge Storage
          </button>
        </div>
      </div>
    </div>
  );
};
