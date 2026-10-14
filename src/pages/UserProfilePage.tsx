import React, { useState } from 'react';
import {
  User,
  Heart,
  Sparkles,
  Download,
  Trash2,
  ShieldCheck,
  Star,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storageService';

export const UserProfilePage: React.FC = () => {
  const { profile, updateProfile, savedLooks, favoriteIds, navigate } = useApp();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email || '');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, email });
    toast.success('Profile details updated successfully!');
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
    toast.success('Data archive exported and downloaded (JSON)!');
  };

  const handleDeleteAllData = () => {
    if (window.confirm('Are you sure you want to delete all local try-ons, saved looks, and preferences? This action is permanent.')) {
      StorageService.clearAllData();
      toast.info('All local data and preferences purged.');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <User className="h-4 w-4" />
          </div>
          <span>User Profile & Statistics</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Manage your local profile identity, device preferences, and private data controls.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 flex flex-col sm:flex-row items-center gap-6 backdrop-blur-xl shadow-2xl">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-3xl font-bold text-white shadow-xl shadow-violet-900/50">
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
        <div className="rounded-3xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 mb-3">
            <Activity className="h-5 w-5" />
          </div>
          <p className="text-3xl font-black text-white">{profile.totalTryOns || savedLooks.length}</p>
          <p className="text-xs text-gray-400 mt-1">Total Try-On Sessions</p>
        </div>

        <div
          onClick={() => navigate('saved')}
          className="rounded-3xl border border-white/10 bg-gray-900/60 p-5 cursor-pointer hover:border-violet-500/40 transition backdrop-blur-xl shadow-xl group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 mb-3 group-hover:scale-105 transition">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <p className="text-3xl font-black text-white">{savedLooks.length}</p>
          <p className="text-xs text-gray-400 mt-1">Saved Looks in Gallery</p>
        </div>

        <div
          onClick={() => navigate('gallery')}
          className="rounded-3xl border border-white/10 bg-gray-900/60 p-5 cursor-pointer hover:border-violet-500/40 transition backdrop-blur-xl shadow-xl group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 mb-3 group-hover:scale-105 transition">
            <Star className="h-5 w-5" />
          </div>
          <p className="text-3xl font-black text-white">{favoriteIds.length}</p>
          <p className="text-xs text-gray-400 mt-1">Favorited Clothing Items</p>
        </div>
      </div>

      {/* Edit Details Form */}
      <form onSubmit={handleSaveProfile} className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 space-y-4 backdrop-blur-xl shadow-2xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
          Profile Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-2.5 text-xs text-white focus:border-violet-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Email Address (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-2.5 text-xs text-white focus:border-violet-500 focus:outline-none transition"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 shadow-lg shadow-violet-600/30 transition"
        >
          Update Profile
        </button>
      </form>

      {/* Privacy and Data Controls (Section 10) */}
      <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-6 space-y-4 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Privacy & Data Sovereignty
          </h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          AI Fashion Mirror is built on a privacy-first architecture. All camera video frames and personal photographs are processed strictly within your local browser sandbox and never shared or retained without your explicit consent.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-200 hover:bg-white/10 transition backdrop-blur-md"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export All My Data (JSON)</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteAllData}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete All Local Data & Purge Storage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
