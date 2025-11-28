import { supabase } from '../utils/supabaseClient';

interface UserPreferences {
  userId: string;
  interests: string[];
  followedUsers: string[];
  engagementPatterns: any;
  watchHistory: string[];
}

export class FYPAlgorithmService {
  
  // MAIN FUNCTION: Get personalized feed
  static async getPersonalizedFeed(userId: string, limit = 20) {
    try {
      
      // Step 1: Get user preferences
      const userPreferences = await this.getUserPreferences(userId);
      
      // Step 2: Get candidate videos
      const candidateVideos = await this.getCandidateVideos(userPreferences);
      
      // Step 3: Rank videos using FYP algorithm
      const rankedVideos = await this.rankVideos(candidateVideos, userPreferences);
      
      // Step 4: Add diversity and return
      const finalFeed = this.addDiversity(rankedVideos, limit);
      
      return finalFeed;
      
    } catch (error) {
      console.error('FYP Algorithm Error:', error);
      // Fallback: return trending videos
      return await this.getTrendingVideos(limit);
    }
  }
  
  // STEP 1: Understand user preferences
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const [recentBehavior, followedUsers, likedVideos] = await Promise.all([
      this.getRecentUserBehavior(userId),
      this.getFollowedUsers(userId),
      this.getLikedVideos(userId)
    ]);
    
    return {
      userId,
      interests: this.extractInterests(recentBehavior),
      followedUsers: followedUsers.map((u: any) => u.following_id),
      engagementPatterns: this.analyzeEngagement(recentBehavior),
      watchHistory: recentBehavior.filter((b: any) => b.action_type === 'view').map((b: any) => b.video_id)
    };
  }
  
  // STEP 2: Get candidate videos
  static async getCandidateVideos(userPreferences: UserPreferences) {
    let candidates: any[] = [];
    
    // 2A: Videos from followed users (30%)
    if (userPreferences.followedUsers.length > 0) {
      const followedVideos = await this.getVideosFromUsers(userPreferences.followedUsers, 10);
      candidates.push(...followedVideos);
    }
    
    // 2B: Videos based on interests (40%)
    const interestVideos = await this.getVideosByInterests(userPreferences.interests, 15);
    candidates.push(...interestVideos);
    
    // 2C: Trending videos (20%)
    const trendingVideos = await this.getTrendingVideos(10);
    candidates.push(...trendingVideos);
    
    // 2D: New videos for discovery (10%)
    const newVideos = await this.getNewVideos(5);
    candidates.push(...newVideos);
    
    // Remove duplicates
    return this.removeDuplicates(candidates);
  }
  
  // STEP 3: Rank videos using FYP scoring
  static async rankVideos(videos: any[], userPreferences: UserPreferences) {
    const scoredVideos = await Promise.all(
      videos.map(async (video) => {
        const score = await this.calculateFYPScore(video, userPreferences);
        return { ...video, fypScore: score };
      })
    );
    
    // Sort by score (highest first)
    return scoredVideos.sort((a, b) => b.fypScore - a.fypScore);
  }
  
  // FYP SCORING ALGORITHM (Core Logic)
  static async calculateFYPScore(video: any, userPreferences: UserPreferences) {
    let score = 0;
    
    // 1. CONTENT RELEVANCE (35%) - Most Important!
    score += await this.calculateContentRelevance(video, userPreferences) * 0.35;
    
    // 2. VIDEO PERFORMANCE (25%) - How well video is doing
    score += await this.calculatePerformanceScore(video) * 0.25;
    
    // 3. USER RELATIONSHIP (20%) - Connection to user
    score += this.calculateRelationshipScore(video, userPreferences) * 0.20;
    
    // 4. FRESHNESS (10%) - New content boost
    score += this.calculateFreshnessScore(video) * 0.10;
    
    // 5. DIVERSITY (10%) - Prevent filter bubbles
    score += this.calculateDiversityScore(video, userPreferences) * 0.10;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }
  
  // 1. Content Relevance Calculator
  static async calculateContentRelevance(video: any, userPreferences: UserPreferences) {
    let relevance = 0;
    
    // A. Interest matching
    const videoInterests = video.hashtags || [];
    relevance += this.calculateInterestMatch(videoInterests, userPreferences.interests) * 0.6;
    
    // B. Creator affinity
    if (userPreferences.followedUsers.includes(video.user_id)) {
      relevance += 0.3; // Big boost for followed creators
    }
    
    // C. Watch history avoidance
    if (userPreferences.watchHistory.includes(video.id)) {
      relevance -= 0.2; // Reduce score for already watched
    }
    
    return Math.max(relevance, 0);
  }
  
  // 2. Video Performance Calculator
  static async calculatePerformanceScore(video: any) {
    // In a real scenario, fetch from video_analytics table
    // For now, use the fields on the video object (likes, views)
    
    let performance = 0;
    const views = video.views || video.viewsCount || 1;
    const likes = video.likes || video.likesCount || 0;
    const comments = video.comments_count || video.commentsCount || 0;
    
    // Engagement Rate
    const engagementRate = views > 0 ? (likes + comments) / views : 0;
    performance += Math.min(engagementRate * 10, 0.4); // Cap at 0.4
    
    // Growth Velocity (Simple version)
    const hoursSinceCreation = (new Date().getTime() - new Date(video.created_at).getTime()) / (1000 * 60 * 60);
    const viewsPerHour = views / Math.max(hoursSinceCreation, 1);
    performance += Math.min(viewsPerHour * 0.001, 0.3); // Cap at 0.3
    
    return Math.min(performance, 1.0);
  }
  
  // 3. User Relationship Score
  static calculateRelationshipScore(video: any, userPreferences: UserPreferences) {
    let relationship = 0;
    if (userPreferences.followedUsers.includes(video.user_id)) {
      relationship += 0.6;
    }
    relationship += 0.2; // Base score for potential new connection
    return relationship;
  }
  
  // 4. Freshness Score
  static calculateFreshnessScore(video: any) {
    const hoursOld = (new Date().getTime() - new Date(video.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) return 1.0;
    if (hoursOld < 6) return 0.8;
    if (hoursOld < 24) return 0.5;
    if (hoursOld < 72) return 0.2;
    return 0.1;
  }
  
  // 5. Diversity Score
  static calculateDiversityScore(video: any, userPreferences: UserPreferences) {
    const recentWatches = userPreferences.watchHistory.slice(-10);
    if (recentWatches.length === 0) return 0.5;
    const isRecentlyWatched = recentWatches.includes(video.id);
    return isRecentlyWatched ? 0.1 : 0.9;
  }
  
  // --- HELPERS ---

  static async getRecentUserBehavior(userId: string) {
    try {
      const { data } = await supabase
        .from('user_behavior')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    } catch { return []; }
  }

  static async getFollowedUsers(userId: string) {
    // Mock implementation as 'follows' table might not strictly exist in all schemas provided
    return []; 
  }

  static async getLikedVideos(userId: string) {
    try {
      const { data } = await supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', userId);
      return data || [];
    } catch { return []; }
  }

  static extractInterests(behavior: any[]) {
    // Placeholder: In a real app, this would analyze tags of videos viewed
    return ['viral', 'trending'];
  }

  static analyzeEngagement(behavior: any[]) {
    return {};
  }

  static async getVideosFromUsers(userIds: string[], limit: number) {
     const { data } = await supabase
       .from('videos')
       .select('*')
       .in('user_id', userIds)
       .limit(limit);
     return this.joinUsers(data || []);
  }

  static async getVideosByInterests(interests: string[], limit: number) {
     // Search by text search on caption or hashtags if available
     // Simplified: return random
     return []; 
  }

  static async getTrendingVideos(limit = 10) {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return this.joinUsers(data || []);
  }

  static async getNewVideos(limit = 5) {
     const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
     return this.joinUsers(data || []);
  }
  
  // Helper to remove duplicates based on ID
  static removeDuplicates(videos: any[]) {
    const seen = new Set();
    return videos.filter(video => {
      if (seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    });
  }
  
  // Helper to add creator diversity
  static addDiversity(rankedVideos: any[], limit: number) {
    if (rankedVideos.length <= limit) return rankedVideos;
    const finalFeed: any[] = [];
    const usedCreators = new Set();
    
    for (const video of rankedVideos) {
      if (finalFeed.length >= limit) break;
      // Allow max 2 videos per creator
      const creatorCount = finalFeed.filter(v => v.user_id === video.user_id).length;
      if (creatorCount < 2) {
        finalFeed.push(video);
        usedCreators.add(video.user_id);
      }
    }
    return finalFeed;
  }

  static calculateInterestMatch(videoTags: string[], userInterests: string[]) {
     const matches = videoTags.filter(tag => userInterests.includes(tag));
     return matches.length > 0 ? 1 : 0;
  }

  // Helper to join users (from api.ts logic)
  static async joinUsers(videos: any[]) {
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
  }
}
