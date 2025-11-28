
import React, { useState, useRef, useEffect, useMemo } from 'react';
import VideoCard from './VideoCard';
import { FOLLOWED_USER_IDS } from '../constants';
import { api } from '../services/api';
import { authService } from '../services/authService'; // Import authService
import { UserCheck, Loader2 } from 'lucide-react';
import { Video } from '../types';

interface VideoFeedProps {
  feedType?: 'following' | 'foryou';
}

const VideoFeed: React.FC<VideoFeedProps> = ({ feedType = 'foryou' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Load videos from API
  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      const currentUser = authService.getCurrentUser(); // Get current user
      const allVideos = await api.getVideos(currentUser?.id); // Pass ID to enable FYP
      setVideos(allVideos);
      setLoading(false);
    };

    loadVideos();
    
    // Listen for new uploads
    window.addEventListener('storage-update', loadVideos);
    return () => window.removeEventListener('storage-update', loadVideos);
  }, []);

  // Filter or Shuffle Videos based on Feed Type
  const displayVideos = useMemo(() => {
    if (videos.length === 0) return [];

    if (feedType === 'following') {
      return videos.filter(video => FOLLOWED_USER_IDS.includes(video.userId));
    } else {
      // API already returns sorted FYP or shuffled list, but we can double check
      // If API returns Mock Data (not personalized), we might want to shuffle.
      // For now, assume API order is correct (FYP sorted).
      return videos;
    }
  }, [feedType, videos]);

  // Logic to determine which video is currently in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      if (index !== activeIndex && index >= 0 && index < displayVideos.length) {
        setActiveIndex(index);
      }
    };

    let timeoutId: number;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleScroll, 50);
    };

    container.addEventListener('scroll', debouncedScroll);
    return () => {
      container.removeEventListener('scroll', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, [activeIndex, displayVideos.length]);

  if (loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }

  if (displayVideos.length === 0 && feedType === 'following') {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
           <UserCheck size={32} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">Following</h2>
        <p className="text-gray-400 text-center max-w-xs">
          Accounts you follow will appear here. Follow some creators in the "For You" feed!
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black"
    >
      {displayVideos.map((video, index) => (
        <div key={`${video.id}-${feedType}`} className="w-full h-full snap-start snap-always">
          <VideoCard 
            video={video} 
            isActive={index === activeIndex} 
          />
        </div>
      ))}
      <div className="h-16 md:hidden snap-start"></div>
    </div>
  );
};

export default VideoFeed;
