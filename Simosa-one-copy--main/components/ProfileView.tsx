
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Lock, Grid, Heart, Menu, Share, Play, User as UserIcon, ChevronLeft, Shield, Wallet, TrendingUp, Plus, LogOut, ChevronRight, LayoutDashboard, Edit, Link as LinkIcon, Users, Camera, Copy } from 'lucide-react';
import { api } from '../services/api';
import { authService } from '../services/authService';
import { Video, User } from '../types';
import ShareProfileModal from './ShareProfileModal';

interface ProfileViewProps {
  onLoginRequest?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onLoginRequest }) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'liked' | 'private'>('videos');
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [drafts, setDrafts] = useState<Video[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    // Initial Load
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    const loadData = async () => {
      if (user) {
        const videos = await api.getMyVideos(user.id);
        setMyVideos(videos);
        const userDrafts = await api.getDrafts(user.id);
        setDrafts(userDrafts);
      } else {
        setMyVideos([]);
        setDrafts([]);
      }
    };
    
    loadData();
    window.addEventListener('storage-update', loadData);
    window.addEventListener('auth-change', () => {
       const updatedUser = authService.getCurrentUser();
       setCurrentUser(updatedUser);
       if (!updatedUser) {
         setShowSettings(false);
         setShowEditProfile(false);
       }
    });

    return () => window.removeEventListener('storage-update', loadData);
  }, [currentUser?.id]); // Dep on ID

  // --- GUEST VIEW ---
  if (!currentUser) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center p-8 text-center pb-20 animate-in fade-in">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
           <UserIcon size={48} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign up for Simosa Tok</h2>
        <p className="text-gray-500 mb-8 max-w-xs text-sm leading-relaxed">
          Create a profile, follow other accounts, make your own videos, and more.
        </p>
        <button 
          onClick={onLoginRequest}
          className="w-full max-w-[240px] bg-[#FE2C55] text-white font-bold py-3.5 rounded-lg hover:bg-[#E0264A] transition-all active:scale-95 shadow-sm"
        >
          Use phone or email
        </button>
      </div>
    );
  }

  // --- SETTINGS MENU VIEW ---
  if (showSettings) {
    return (
      <div className="h-full bg-white flex flex-col animate-in slide-in-from-right duration-200 z-50">
        <div className="flex items-center px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <button onClick={() => setShowSettings(false)} className="mr-4 p-1 hover:bg-gray-100 rounded-full">
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="font-bold text-lg text-gray-800 flex-1 text-center pr-10">Settings and privacy</h1>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 ml-2 tracking-wider">Account</h2>
            
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              {currentUser.isAdmin && (
                <SettingsItem 
                  icon={<LayoutDashboard size={20} className="text-[#FE2C55]" />} 
                  label="Admin Dashboard" 
                  onClick={() => window.dispatchEvent(new Event('admin-access'))} 
                />
              )}
              <SettingsItem 
                icon={<UserIcon size={20} />} 
                label="Manage account" 
                onClick={() => setShowSettings(false)} 
              />
              <SettingsItem 
                icon={<Shield size={20} />} 
                label="Privacy" 
                onClick={() => alert("Privacy settings")} 
              />
              <SettingsItem 
                icon={<Wallet size={20} />} 
                label="Balance" 
                onClick={() => alert("Balance: $0.00")} 
              />
              <SettingsItem 
                icon={<Share size={20} />} 
                label="Share profile" 
                onClick={() => { setShowSettings(false); setShowShareModal(true); }} 
              />
            </div>
          </div>

          <div className="p-4 pt-0">
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 ml-2 tracking-wider">Content & Activity</h2>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
               <SettingsItem icon={<TrendingUp size={20} />} label="Creator tools" />
               <SettingsItem icon={<Grid size={20} />} label="QR Code" onClick={() => { setShowSettings(false); setShowShareModal(true); }} />
            </div>
          </div>

          <div className="p-4 pt-0">
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 ml-2 tracking-wider">Login</h2>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
               <SettingsItem 
                icon={<Plus size={20} />} 
                label="Add account" 
                onClick={onLoginRequest} 
              />
               <SettingsItem 
                icon={<LogOut size={20} className="text-[#FE2C55]" />} 
                label="Log out" 
                isDestructive 
                onClick={() => {
                  authService.logout();
                  setShowSettings(false);
                }} 
              />
            </div>
          </div>
          
          <div className="p-8 text-center">
             <p className="text-xs text-gray-400 font-mono">v19.0.0 (2025)</p>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGGED IN PROFILE VIEW ---
  const totalLikes = myVideos.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
  
  return (
    <>
      {showShareModal && <ShareProfileModal user={currentUser} onClose={() => setShowShareModal(false)} />}
      {showEditProfile && (
        <EditProfileView 
          user={currentUser} 
          onClose={() => setShowEditProfile(false)} 
        />
      )}
      
      <div className="h-full bg-white overflow-y-auto pb-20 custom-scrollbar">
        {/* Top Bar */}
        <div className="flex justify-between items-center px-4 h-12 sticky top-0 bg-white z-20 border-b border-gray-50">
          <div className="w-8">
             <button className="p-1"><Users size={22} className="text-gray-800" /></button>
          </div>
          <div className="flex items-center gap-1 cursor-pointer">
             <h1 className="font-bold text-[17px] text-gray-900 truncate max-w-[150px]">{currentUser.fullName}</h1>
             <ChevronLeft size={14} className="rotate-[-90deg] text-gray-500" />
          </div>
          <div className="w-8 flex justify-end">
             <button onClick={() => setShowSettings(true)} className="p-1">
               <Menu size={24} className="text-gray-800" />
             </button>
          </div>
        </div>

        {/* Profile Header */}
        <div className="flex flex-col items-center pt-6 pb-2 px-4">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full border-2 border-white shadow-sm p-0.5 overflow-hidden">
               <img src={currentUser.avatarUrl} alt="profile" className="w-full h-full rounded-full object-cover bg-gray-100" />
            </div>
            <div className="absolute bottom-0 right-1 bg-blue-500 rounded-full p-1 border-2 border-white">
               <Plus size={12} className="text-white font-bold" />
            </div>
          </div>
          
          <h2 className="text-sm font-semibold text-gray-900 mb-4">@{currentUser.username}</h2>
          
          {/* Stats Row */}
          <div className="flex items-center gap-8 mb-4">
            <div className="flex flex-col items-center cursor-pointer active:opacity-60">
              <span className="font-bold text-[17px] text-gray-900">142</span>
              <span className="text-[13px] text-gray-500">Following</span>
            </div>
            <div className="bg-gray-200 w-[1px] h-4"></div>
            <div className="flex flex-col items-center cursor-pointer active:opacity-60">
              <span className="font-bold text-[17px] text-gray-900">{currentUser.followers}</span>
              <span className="text-[13px] text-gray-500">Followers</span>
            </div>
            <div className="bg-gray-200 w-[1px] h-4"></div>
            <div className="flex flex-col items-center cursor-pointer active:opacity-60">
              <span className="font-bold text-[17px] text-gray-900">
                {totalLikes}
              </span>
              <span className="text-[13px] text-gray-500">Likes</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6 w-full justify-center px-8">
            <button 
              onClick={() => setShowEditProfile(true)}
              className="flex-1 py-2.5 bg-[#F1F1F2] rounded-[4px] font-semibold text-[15px] text-gray-900 active:bg-gray-200 transition-colors"
            >
              Edit profile
            </button>
            <button 
              onClick={() => setShowShareModal(true)}
              className="flex-1 py-2.5 bg-[#F1F1F2] rounded-[4px] font-semibold text-[15px] text-gray-900 active:bg-gray-200 transition-colors"
            >
              Share profile
            </button>
            <button className="w-10 flex items-center justify-center bg-[#F1F1F2] rounded-[4px] active:bg-gray-200 transition-colors">
              <UserIcon size={18} className="text-gray-900" />
            </button>
          </div>
          
          {/* Bio Section */}
          <div className="w-full px-4 text-center mb-4">
             {(!currentUser.bio && currentUser.followers === 0 && myVideos.length === 0) ? (
               <div className="text-[13px] text-gray-400 cursor-pointer hover:underline flex items-center justify-center gap-1" onClick={() => setShowEditProfile(true)}>
                 <Edit size={12}/> Tap to add bio
               </div>
             ) : (
               <>
                 <p className="text-[14px] text-gray-800 leading-snug whitespace-pre-wrap">
                    {currentUser.bio || "Welcome to my official Simosa Tok profile! 🎵✨ Creating content for you."}
                 </p>
                 {currentUser.website && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-gray-900 font-semibold text-sm cursor-pointer hover:underline">
                        <LinkIcon size={12} className="-rotate-45" />
                        <span>{currentUser.website}</span>
                    </div>
                 )}
               </>
             )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white sticky top-12 z-10">
          <button 
            onClick={() => setActiveTab('videos')}
            className={`flex-1 h-11 flex justify-center items-center relative transition-colors ${activeTab === 'videos' ? 'text-black' : 'text-gray-400'}`}
          >
            <Grid size={20} />
            {activeTab === 'videos' && <div className="absolute bottom-0 w-8 h-[2px] bg-black rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('liked')}
            className={`flex-1 h-11 flex justify-center items-center relative transition-colors ${activeTab === 'liked' ? 'text-black' : 'text-gray-400'}`}
          >
            <Heart size={20} className={activeTab === 'liked' ? "" : "stroke-[2px]"} />
            {activeTab === 'liked' && <div className="absolute bottom-0 w-8 h-[2px] bg-black rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('private')}
            className={`flex-1 h-11 flex justify-center items-center relative transition-colors ${activeTab === 'private' ? 'text-black' : 'text-gray-400'}`}
          >
            <Lock size={20} />
            {activeTab === 'private' && <div className="absolute bottom-0 w-8 h-[2px] bg-black rounded-full" />}
          </button>
        </div>

        {/* Content Grid */}
        <div className="min-h-[300px] bg-white">
          <div className="grid grid-cols-3 gap-[1px] bg-white">
          {activeTab === 'videos' && (
            <>
              {/* Drafts Section - Shown first in Videos tab */}
              {drafts.map((video) => (
                <div key={video.id} className="relative aspect-[3/4] bg-gray-100 cursor-pointer group overflow-hidden">
                  <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
                     <span className="text-white font-bold text-xs uppercase border border-white px-2 py-0.5 rounded backdrop-blur-sm">Draft</span>
                  </div>
                  {video.thumbnailUrl || video.videoUrl ? (
                     <img src={video.thumbnailUrl || video.videoUrl} className="w-full h-full object-cover opacity-80" />
                  ) : (
                     <div className="w-full h-full bg-gray-200"></div>
                  )}
                </div>
              ))}

              {myVideos.length > 0 ? (
                myVideos.map((video) => (
                  <div key={video.id} className="relative aspect-[3/4] bg-gray-200 cursor-pointer group overflow-hidden">
                    {video.thumbnailUrl || video.videoUrl ? (
                       <img src={video.thumbnailUrl || video.videoUrl} className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full bg-black"></div>
                    )}
                    <div className="absolute bottom-1 left-2 flex items-center gap-1 text-white drop-shadow-md">
                       <Play size={12} fill="white" strokeWidth={0} />
                       <span className="text-xs font-bold font-mono">{formatNumber(video.viewsCount)}</span>
                    </div>
                  </div>
                ))
              ) : (
                drafts.length === 0 && (
                  <div className="col-span-3 py-16 flex flex-col items-center justify-center text-gray-500 gap-4">
                     <div className="bg-gray-50 p-8 rounded-lg text-center w-full max-w-sm">
                        <h4 className="text-gray-900 font-bold text-lg mb-2">Share your first video</h4>
                        <p className="text-gray-500 text-sm mb-6 px-4">Record or upload a video with effects, sounds, and more.</p>
                        <button className="bg-[#FE2C55] text-white px-8 py-3 rounded-md font-bold text-sm hover:bg-[#E0264A] transition-colors">
                          Create video
                        </button>
                     </div>
                  </div>
                )
              )}
            </>
          )}

          {activeTab === 'liked' && (
              <div className="col-span-3 py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
                 <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                   <Heart size={40} className="text-gray-300" />
                 </div>
                 <h3 className="text-gray-900 font-bold">Only you can see which videos you liked</h3>
                 <p className="text-sm max-w-[200px] text-center text-gray-500">You can change this in Settings.</p>
              </div>
          )}
          
          {activeTab === 'private' && (
            <div className="col-span-3 py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
               <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                  <Lock size={40} className="text-gray-300" />
               </div>
               <h3 className="text-gray-900 font-bold">Your private videos</h3>
               <p className="text-sm text-gray-500">To make your videos private, change the privacy settings.</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
};

const EditProfileView = ({ user, onClose }: { user: User, onClose: () => void }) => {
  const [fullName, setFullName] = useState(user.fullName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [website, setWebsite] = useState(user.website || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
     await api.updateUserProfile(user.id, {
        fullName,
        username,
        bio,
        website
     });
     window.dispatchEvent(new Event('auth-change'));
     onClose();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await authService.uploadAvatar(file);
      window.dispatchEvent(new Event('auth-change'));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white z-10">
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
           <ChevronLeft size={24} className="text-gray-800" />
        </button>
        <h1 className="font-bold text-lg text-gray-900">Edit profile</h1>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
         <div className="flex flex-col items-center pt-8 pb-6">
            <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
               <div className="w-24 h-24 rounded-full overflow-hidden relative">
                  <img src={user.avatarUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                     <Camera size={28} className="text-white" />
                  </div>
               </div>
               <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <p className="text-sm font-semibold text-gray-900 mt-3 cursor-pointer" onClick={handleAvatarClick}>Change photo</p>
         </div>

         <div className="px-4 space-y-6">
            <div className="space-y-4">
               <h3 className="text-xs font-semibold text-gray-500 uppercase ml-1">About you</h3>
               
               <div className="flex items-center justify-between py-1 cursor-pointer hover:bg-gray-50 p-2 rounded-md">
                  <span className="text-[15px] font-medium text-gray-900 w-24">Name</span>
                  <input 
                     className="flex-1 text-[15px] text-gray-900 outline-none bg-transparent text-right placeholder-gray-400"
                     value={fullName}
                     onChange={(e) => setFullName(e.target.value)}
                     placeholder="Name"
                  />
                  <ChevronRight size={16} className="text-gray-400 ml-2" />
               </div>

               <div className="flex items-center justify-between py-1 cursor-pointer hover:bg-gray-50 p-2 rounded-md">
                  <span className="text-[15px] font-medium text-gray-900 w-24">Username</span>
                  <input 
                     className="flex-1 text-[15px] text-gray-900 outline-none bg-transparent text-right placeholder-gray-400"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     placeholder="Username"
                  />
                  <ChevronRight size={16} className="text-gray-400 ml-2" />
               </div>

               <div className="flex items-center justify-between py-1 cursor-pointer hover:bg-gray-50 p-2 rounded-md">
                   <span className="text-[15px] font-medium text-gray-900 w-24">Bio</span>
                   <input 
                     className="flex-1 text-[15px] text-gray-900 outline-none bg-transparent text-right placeholder-gray-400 truncate"
                     value={bio}
                     onChange={(e) => setBio(e.target.value)}
                     placeholder="Add a bio"
                  />
                  <ChevronRight size={16} className="text-gray-400 ml-2" />
               </div>

               <div className="flex items-center justify-between py-1 cursor-pointer hover:bg-gray-50 p-2 rounded-md">
                   <span className="text-[15px] font-medium text-gray-900 w-24">Website</span>
                   <input 
                     className="flex-1 text-[15px] text-gray-900 outline-none bg-transparent text-right placeholder-gray-400"
                     value={website}
                     onChange={(e) => setWebsite(e.target.value)}
                     placeholder="Add a website"
                  />
                  <ChevronRight size={16} className="text-gray-400 ml-2" />
               </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
               <button onClick={handleSave} className="w-full bg-[#FE2C55] text-white font-bold py-3 rounded-md active:bg-[#E0264A] transition-colors">
                 Save changes
               </button>
            </div>
         </div>
      </div>

      <div className="bg-gray-50 p-4 border-t border-gray-100">
         <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div>
               <h4 className="font-bold text-sm text-gray-900">Simosa Tok Studio</h4>
               <p className="text-xs text-gray-500 mt-0.5">Analytics and tools for creators</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
         </div>
         <p className="text-center text-xs text-gray-400 mt-4">Change display order</p>
      </div>
    </div>
  );
}

// Helper Components
const SettingsItem = ({ icon, label, onClick, isDestructive = false }: { icon: React.ReactNode, label: string, onClick?: () => void, isDestructive?: boolean }) => (
  <div onClick={onClick} className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-none">
    <div className={`text-gray-500 ${isDestructive ? 'text-[#FE2C55]' : ''}`}>
      {icon}
    </div>
    <span className={`flex-1 text-[15px] font-medium ${isDestructive ? 'text-[#FE2C55]' : 'text-gray-900'}`}>{label}</span>
    <ChevronRight size={18} className="text-gray-300" />
  </div>
);

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

export default ProfileView;
