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
    a.download = `aura-fashion-mirror-export-${Date.now()}.json`;
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
    <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="aura-pill bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <User className="h-3 w-3" />
            <span>STUDIO IDENTITY</span>
          </span>
          <span className="aura-pill bg-white/[0.04] text-slate-400 border border-white/[0.08]">
            CLIENT PROFILE
          </span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
          Client Profile & Telemetry
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
          Manage your personal fitting profile identity, review session statistics, and export or purge device data.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="aura-panel p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-2xl relative">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-fuchsia-600 text-3xl font-display font-black text-white shadow-xl shadow-indigo-950/60 ring-2 ring-white/10">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="font-display font-bold text-2xl text-white">{profile.name}</h2>
            <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-mono text-indigo-300 border border-indigo-500/25">
              LOCAL ATELIER TIER
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400 mt-1">
            Studio member since {new Date(profile.memberSince).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Try-On Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="aura-card p-6 shadow-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-3">
            <Activity className="h-5 w-5" />
          </div>
          <p className="font-mono text-3xl font-black text-white">{profile.totalTryOns || savedLooks.length}</p>
          <p className="font-mono text-xs text-slate-400 mt-1 uppercase tracking-wider">Total Fitting Sessions</p>
        </div>

        <div
          onClick={() => navigate('saved')}
          className="aura-card p-6 cursor-pointer transition shadow-xl group hover:border-rose-500/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 mb-3 group-hover:scale-105 transition">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <p className="font-mono text-3xl font-black text-white">{savedLooks.length}</p>
          <p className="font-mono text-xs text-slate-400 mt-1 uppercase tracking-wider">Saved Looks in Archive</p>
        </div>

        <div
          onClick={() => navigate('gallery')}
          className="aura-card p-6 cursor-pointer transition shadow-xl group hover:border-amber-500/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 mb-3 group-hover:scale-105 transition">
            <Star className="h-5 w-5" />
          </div>
          <p className="font-mono text-3xl font-black text-white">{favoriteIds.length}</p>
          <p className="font-mono text-xs text-slate-400 mt-1 uppercase tracking-wider">Favorited Silhouettes</p>
        </div>
      </div>

      {/* Edit Details Form */}
      <form onSubmit={handleSaveProfile} className="aura-panel p-6 sm:p-8 space-y-5 shadow-2xl relative">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300 pb-3 border-b border-white/[0.08]">
          Profile Identity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block font-mono text-xs font-semibold text-slate-400 mb-2">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-[#0d0f18] px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-mono text-xs font-semibold text-slate-400 mb-2">Email Address (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-xl border border-white/[0.1] bg-[#0d0f18] px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition"
        >
          Update Profile
        </button>
      </form>

      {/* Privacy and Data Controls */}
      <div className="aura-panel p-6 sm:p-8 space-y-4 shadow-2xl relative">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Privacy & Data Sovereignty
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          AURA is engineered on a strict privacy-first foundation. Camera video streams and uploaded portraits remain entirely inside your device sandbox during real-time tracking, and are never shared or retained without your explicit permission.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition backdrop-blur-md"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span>Export All Data Archive (JSON)</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteAllData}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete All Local Data & Purge Storage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
