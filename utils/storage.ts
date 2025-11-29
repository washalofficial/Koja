
import { Video, User } from '../types';
import { MOCK_VIDEOS } from '../constants';

const KEYS = {
  VIDEOS: 'samosatok_videos',
  LIKED_VIDEOS: 'samosatok_liked_videos',
  CURRENT_USER: 'samosatok_current_user_session'
};

// Default Guest User (used when not logged in)
export const GUEST_USER: User = {
  id: 'guest',
  username: 'guest',
  fullName: 'Guest',
  avatarUrl: '',
  followers: 0
};

export const storage = {
  // --- USER MANAGEMENT ---
  saveUser: (user: User) => {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    window.dispatchEvent(new Event('auth-change'));
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(KEYS.CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  },

  clearUser: () => {
    localStorage.removeItem(KEYS.CURRENT_USER);
    window.dispatchEvent(new Event('auth-change'));
  },

  // --- VIDEO MANAGEMENT ---
  getVideos: (): Video[] => {
    const stored = localStorage.getItem(KEYS.VIDEOS);
    if (!stored) {
      localStorage.setItem(KEYS.VIDEOS, JSON.stringify(MOCK_VIDEOS));
      return MOCK_VIDEOS;
    }
    return JSON.parse(stored);
  },

  addVideo: (video: Video) => {
    const videos = storage.getVideos();
    const newVideos = [video, ...videos];
    localStorage.setItem(KEYS.VIDEOS, JSON.stringify(newVideos));
    window.dispatchEvent(new Event('storage-update'));
  },

  // --- LIKES ---
  toggleLike: (videoId: string): boolean => {
    const likedStr = localStorage.getItem(KEYS.LIKED_VIDEOS);
    let likedIds: string[] = likedStr ? JSON.parse(likedStr) : [];
    let isLiked = false;

    if (likedIds.includes(videoId)) {
      likedIds = likedIds.filter(id => id !== videoId);
      isLiked = false;
    } else {
      likedIds.push(videoId);
      isLiked = true;
    }

    localStorage.setItem(KEYS.LIKED_VIDEOS, JSON.stringify(likedIds));
    return isLiked;
  },

  isLiked: (videoId: string): boolean => {
    const likedStr = localStorage.getItem(KEYS.LIKED_VIDEOS);
    const likedIds: string[] = likedStr ? JSON.parse(likedStr) : [];
    return likedIds.includes(videoId);
  },

  getMyVideos: (userId: string): Video[] => {
    const videos = storage.getVideos();
    return videos.filter(v => v.userId === userId);
  }
};