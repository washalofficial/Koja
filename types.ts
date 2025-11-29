
export interface User {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  followers: number;
  isAdmin?: boolean;
  isBanned?: boolean;
  isVerified?: boolean;
  email?: string; // Visible to admins
  createdAt?: string;
  bio?: string;
  website?: string;
}

export interface Video {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string; // Optional if using video poster
  caption: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  songName: string;
  user: User;
  privacy?: 'public' | 'private' | 'draft';
  created_at?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender?: User;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  updatedAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  videoId?: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  video?: Video; // Joined data
  reportedUser?: User; // Joined data
}

export enum ViewState {
  FEED = 'FEED',
  UPLOAD = 'UPLOAD',
  ADMIN = 'ADMIN',
  PROFILE = 'PROFILE',
  INBOX = 'INBOX',
  DISCOVER = 'DISCOVER'
}