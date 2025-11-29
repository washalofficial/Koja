
import { supabase } from '../utils/supabaseClient';
import { Video, User, Report } from '../types';
import { MOCK_VIDEOS } from '../constants';
import { storage } from '../utils/storage';
import { FYPAlgorithmService } from './fypAlgorithmService';

// Helper to manually join users since DB Foreign Key might be missing
const joinUsers = async (videos: any[]) => {
  if (!videos || videos.length === 0) return [];
  const userIds = [...new Set(videos.map((v: any) => v.user_id).filter(Boolean))];
  
  if (userIds.length === 0) return videos;

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .in('id', userIds);

  const userMap = new Map(users?.map((u: any) => [u.id, u]) || []);

  return videos.map((v: any) => ({
    ...v,
    users: userMap.get(v.user_id) || null
  }));
};

// Transformer to convert Supabase DB shape to our App's Video Interface
const transformVideo = (dbVideo: any): Video => {
  const user = dbVideo.users ? {
    id: dbVideo.users.id,
    username: dbVideo.users.username,
    fullName: dbVideo.users.full_name || dbVideo.users.username,
    avatarUrl: dbVideo.users.profile_url || 'https://via.placeholder.com/150',
    followers: dbVideo.users.followers_count || 0,
    isBanned: dbVideo.users.is_banned,
    isVerified: dbVideo.users.is_verified,
    bio: dbVideo.users.bio,
    website: dbVideo.users.website
  } : {
    id: 'unknown',
    username: 'Unknown',
    fullName: 'Unknown User',
    avatarUrl: '',
    followers: 0
  };

  let videoUrl = dbVideo.video_key || '';
  if (videoUrl && !videoUrl.startsWith('http')) {
     const { data } = supabase.storage.from('samosatok-bucket').getPublicUrl(dbVideo.video_key);
     videoUrl = data.publicUrl;
  }
  
  let thumbnailUrl = dbVideo.thumbnail_key || '';
  if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
      const { data } = supabase.storage.from('samosatok-bucket').getPublicUrl(dbVideo.thumbnail_key);
      thumbnailUrl = data.publicUrl;
  }

  return {
    id: dbVideo.id,
    userId: dbVideo.user_id,
    videoUrl: videoUrl,
    thumbnailUrl: thumbnailUrl,
    caption: dbVideo.caption,
    hashtags: dbVideo.hashtags || [],
    likesCount: dbVideo.likes || 0,
    commentsCount: dbVideo.comments_count || 0,
    sharesCount: 0,
    viewsCount: dbVideo.views || 0,
    songName: 'Original Audio',
    user: user,
    created_at: dbVideo.created_at
  };
};

export const api = {
  // Fetch Feed using FYP Service
  getVideos: async (userId?: string): Promise<Video[]> => {
    try {
      let data = null;

      // 1. Try FYP if user is logged in
      if (userId) {
        data = await FYPAlgorithmService.getPersonalizedFeed(userId);
      }

      // 2. Fallback to trending/standard if no data
      if (!data || data.length === 0) {
        data = await FYPAlgorithmService.getTrendingVideos(20);
      }

      if (!data || data.length === 0) return MOCK_VIDEOS;
      return data.map(transformVideo);

    } catch (e: any) {
      console.warn('Fetch failed, using mock data:', e.message);
      return MOCK_VIDEOS;
    }
  },

  // Get My Videos
  getMyVideos: async (userId: string): Promise<Video[]> => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        return storage.getMyVideos(userId);
      }
      
      const enriched = await joinUsers(data);
      return (enriched || []).map(transformVideo);
    } catch {
      return storage.getMyVideos(userId);
    }
  },

  // Get My Drafts
  getDrafts: async (userId: string): Promise<Video[]> => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        .eq('privacy', 'draft') 
        .order('created_at', { ascending: false });
      
      if (error) {
         return [];
      }
      
      const enriched = await joinUsers(data);
      return (enriched || []).map(transformVideo);
    } catch {
      return [];
    }
  },

  // Check if liked
  isLiked: async (videoId: string, userId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { data } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .single();
      return !!data;
    } catch {
      return storage.isLiked(videoId);
    }
  },

  // Toggle Like and Log to User Behavior
  toggleLike: async (videoId: string, userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    const isLikedLocal = storage.toggleLike(videoId);

    try {
      if (isLikedLocal) {
        // Log behavior for Algorithm
        await supabase.from('user_behavior').insert([{
          user_id: userId,
          video_id: videoId,
          action_type: 'like'
        }]);
        
        await supabase.from('likes').insert({ user_id: userId, video_id: videoId });
      } else {
        await supabase.from('likes').delete().eq('user_id', userId).eq('video_id', videoId);
      }
    } catch (e) {
      console.error("Error syncing like to DB", e);
    }

    return isLikedLocal;
  },

  // Upload Video
  uploadVideo: async (file: Blob, caption: string, userId: string): Promise<boolean> => {
    try {
       const fileName = `videos/${Date.now()}_${userId.slice(0,6)}.mp4`;
       
       const { error: uploadError } = await supabase.storage
         .from('samosatok-bucket')
         .upload(fileName, file);

       if (uploadError) {
         if (uploadError.message.includes("Bucket not found")) {
            alert("Error: Storage bucket 'samosatok-bucket' not found. Please run the SQL script.");
         }
         console.error("Video upload error:", uploadError.message);
         // Don't return false yet, try to proceed? No, video is essential.
         return false; 
       }

       const { error: dbError } = await supabase.from('videos').insert({
         user_id: userId,
         video_key: fileName, 
         caption: caption,
         likes: 0,
         views: 0
       });

       if (dbError) {
         console.error("Video DB insert error:", dbError.message);
         // Fallback to local storage
         const newVideo: Video = {
            id: `local-${Date.now()}`,
            userId,
            videoUrl: URL.createObjectURL(file),
            caption,
            hashtags: [],
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            songName: 'Original Sound',
            user: storage.getCurrentUser()!
         };
         storage.addVideo(newVideo);
         return true;
       }

       return true;
    } catch (e: any) {
      console.error("Video upload exception:", e.message || e);
      return false;
    }
  },

  saveDraft: async (file: Blob, caption: string): Promise<boolean> => {
    const user = storage.getCurrentUser();
    if (!user) return false;
    try {
        const fileName = `drafts/${Date.now()}_${user.id.slice(0,6)}.mp4`;
        await supabase.storage.from('samosatok-bucket').upload(fileName, file);
        await supabase.from('videos').insert({
             user_id: user.id,
             video_key: fileName, 
             caption: caption,
             likes: 0,
             views: 0,
             // privacy: 'draft' 
        });
        return true;
    } catch {
        return true;
    }
  },

  // Increment View and Log to User Behavior
  incrementView: async (videoId: string) => {
    const user = storage.getCurrentUser();
    if (user) {
      try {
        await supabase.from('user_behavior').insert([{
          user_id: user.id,
          video_id: videoId,
          action_type: 'view',
          watch_time: 10 // Simplified default
        }]);
      } catch (e) { /* ignore */ }
    }
  },

  getAdminStats: async () => {
    return { users: 0, views: '0', reports: 0, healthy: true };
  },

  getDashboardData: async () => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const lastWeekIso = lastWeek.toISOString();

    try {
      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: totalVideos } = await supabase.from('videos').select('*', { count: 'exact', head: true });
      
      let totalReports = 0;
      const { count: reportsCount, error: reportsError } = await supabase.from('user_reports').select('*', { count: 'exact', head: true });
      if (!reportsError && reportsCount !== null) {
          totalReports = reportsCount;
      }

      const { data: newUsers } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', lastWeekIso);

      const { data: newViews } = await supabase
        .from('user_behavior')
        .select('created_at')
        .eq('action_type', 'view')
        .gte('created_at', lastWeekIso);

      let reportsData: any[] = [];
      const { data: rData, error: rError } = await supabase
        .from('user_reports')
        .select('report_type')
        .limit(100);
      
      if (!rError && rData) {
        reportsData = rData.map((r: any) => ({ reason: r.report_type }));
      }

      return {
        totals: {
            users: totalUsers || 0,
            videos: totalVideos || 0,
            reports: totalReports
        },
        rawGrowth: {
            users: newUsers || [],
            views: newViews || []
        },
        rawReports: reportsData
      };
    } catch (e: any) {
      console.error("Dashboard fetch error", e.message || e);
      return null;
    }
  },

  getRecentUploads: async () => {
    try {
      const { data } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      const enriched = await joinUsers(data);
      return enriched || [];
    } catch {
      return [];
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map((u: any) => ({
            id: u.id,
            username: u.username,
            fullName: u.full_name || u.username,
            avatarUrl: u.profile_url,
            followers: u.followers_count,
            isBanned: u.is_banned,
            isVerified: u.is_verified,
            createdAt: u.created_at,
            email: u.email
        }));
    } catch (e: any) {
        console.error("Error fetching all users:", e.message || e);
        return [];
    }
  },

  toggleUserBan: async (userId: string, currentStatus: boolean): Promise<boolean> => {
      try {
          const { error } = await supabase
              .from('users')
              .update({ is_banned: !currentStatus })
              .eq('id', userId);
          return !error;
      } catch {
          return false;
      }
  },

  toggleUserVerification: async (userId: string, currentStatus: boolean): Promise<boolean> => {
      try {
          const { error } = await supabase
              .from('users')
              .update({ is_verified: !currentStatus })
              .eq('id', userId);
          return !error;
      } catch {
          return false;
      }
  },

  getReports: async (): Promise<Report[]> => {
      try {
          const { data: reports, error } = await supabase
            .from('user_reports')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if(error) throw error;

          const enrichedReports = await Promise.all(reports.map(async (r: any) => {
              let video = null;
              let reportedUser = null;

              if(r.reported_video_id) {
                 const { data: vData } = await supabase.from('videos').select('*').eq('id', r.reported_video_id).single();
                 if(vData) {
                    const [vJoined] = await joinUsers([vData]);
                    video = transformVideo(vJoined);
                 }
              }

              if(r.reported_user_id) {
                 const { data: uData } = await supabase.from('users').select('*').eq('id', r.reported_user_id).single();
                 if(uData) {
                    reportedUser = {
                        id: uData.id,
                        username: uData.username,
                        fullName: uData.full_name,
                        avatarUrl: uData.profile_url,
                        followers: uData.followers_count,
                        isBanned: uData.is_banned
                    };
                 }
              }

              return {
                  id: r.id,
                  reporterId: r.reporter_id,
                  reportedUserId: r.reported_user_id,
                  videoId: r.reported_video_id,
                  reason: r.report_type || r.description || 'Other',
                  status: r.status,
                  createdAt: r.created_at,
                  video,
                  reportedUser
              } as Report;
          }));

          return enrichedReports;
      } catch (e: any) {
          console.error("Error fetching reports:", e.message || e);
          return [];
      }
  },

  resolveReport: async (reportId: string, action: 'resolved' | 'dismissed'): Promise<boolean> => {
      try {
          const { error } = await supabase
            .from('user_reports')
            .update({ status: action })
            .eq('id', reportId);
          return !error;
      } catch {
          return false;
      }
  },

  adminDeleteVideo: async (videoId: string): Promise<boolean> => {
      try {
          await supabase.from('videos').delete().eq('id', videoId);
          await supabase.from('user_reports').update({ status: 'resolved' }).eq('reported_video_id', videoId);
          return true;
      } catch {
          return false;
      }
  },

  updateUserProfile: async (userId: string, updates: Partial<User>): Promise<boolean> => {
    try {
      const dbUpdates: any = {};
      if (updates.fullName) dbUpdates.full_name = updates.fullName;
      if (updates.username) dbUpdates.username = updates.username;
      if (updates.bio) dbUpdates.bio = updates.bio;
      if (updates.website) dbUpdates.website = updates.website;

      const { error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', userId);
        
      // Also update local storage so UI reflects changes immediately
      const currentUser = storage.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
          const updated = { ...currentUser, ...updates };
          storage.saveUser(updated);
      }
      
      return !error;
    } catch {
      return false; 
    }
  }
};
