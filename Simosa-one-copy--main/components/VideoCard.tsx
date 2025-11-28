import React, { useRef, useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Music, Play, Plus, Check } from 'lucide-react';
import { Video } from '../types';
import CommentsDrawer from './CommentsDrawer';
import { api } from '../services/api';
import { authService } from '../services/authService';

interface VideoCardProps {
  video: Video;
  isActive: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(video.likesCount);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const lastTapRef = useRef<number>(0);
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const currentUser = authService.getCurrentUser();

  // Initialize state from API
  useEffect(() => {
    if (currentUser) {
      api.isLiked(video.id, currentUser.id).then(setIsLiked);
    }
  }, [video.id, currentUser]);

  // Handle auto-play
  useEffect(() => {
    let mounted = true;

    if (isActive) {
      api.incrementView(video.id);

      const timeout = setTimeout(() => {
        if (videoRef.current && mounted) {
          videoRef.current.currentTime = 0;
          const playPromise = videoRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => { if (mounted) setIsPlaying(true); })
              .catch(err => { if (mounted) setIsPlaying(false); });
          }
        }
      }, 200);

      return () => {
        mounted = false;
        clearTimeout(timeout);
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      };
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, video.id]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  };

  const requireAuth = () => {
    if (!currentUser) {
      // Trigger global event to open Auth Modal
      window.dispatchEvent(new Event('login-request'));
      return false;
    }
    return true;
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isCommentsOpen) return;
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!isLiked) handleLike(e);
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 800);
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;

    if (!currentUser) return; // Should satisfy TS after requireAuth check

    const previousLiked = isLiked;
    const previousCount = likes;
    
    setIsLiked(!isLiked);
    setLikes(prev => !previousLiked ? prev + 1 : prev - 1);

    try {
      await api.toggleLike(video.id, currentUser.id);
    } catch (error) {
      setIsLiked(previousLiked);
      setLikes(previousCount);
    }
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setIsFollowing(true);
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Allow opening drawer to see comments even if guest? 
    // Usually TikTok allows reading but forces login on post. 
    // Let's allow opening for now, and block posting inside.
    setIsCommentsOpen(true);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Simosa Tok: ${video.caption}`,
          text: `Check out this video by @${video.user.username}`,
          url: video.videoUrl, 
        });
      } catch (err) { console.log("Share cancelled"); }
    } else {
      try {
        await navigator.clipboard.writeText(video.videoUrl);
        setShareFeedback(true);
        setTimeout(() => setShareFeedback(false), 2000);
      } catch (err) { console.error("Failed to copy", err); }
    }
  };

  return (
    <div 
      className="relative w-full h-full snap-center bg-black flex items-center justify-center overflow-hidden"
      onClick={handleContainerClick}
    >
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        className={`h-full w-full md:rounded-lg md:h-[95%] md:w-auto ${videoOrientation === 'portrait' ? 'object-cover' : 'object-contain'}`}
        loop
        playsInline
        onLoadedMetadata={(e) => {
           const v = e.currentTarget;
           if (v.videoWidth > v.videoHeight) {
             setVideoOrientation('landscape');
           } else {
             setVideoOrientation('portrait');
           }
        }}
      />

      {showBigHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart size={100} className="fill-[#FE2C55] text-[#FE2C55] animate-heart-pop drop-shadow-lg" />
        </div>
      )}

      {!isPlaying && !isCommentsOpen && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10 z-20">
          <Play className="w-16 h-16 text-white/50 fill-white/50" />
        </div>
      )}

      <div className={`absolute bottom-24 right-2 flex flex-col items-center gap-5 z-20 md:right-4 transition-opacity duration-200 ${isCommentsOpen ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative mb-2">
          <div className="w-12 h-12 rounded-full border border-white overflow-hidden">
             <img src={video.user.avatarUrl} alt={video.user.username} className="w-full h-full object-cover" />
          </div>
          {!isFollowing && video.userId !== currentUser?.id && (
            <div 
              onClick={handleFollow}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#FE2C55] rounded-full p-0.5 cursor-pointer hover:scale-110 transition-all duration-300"
            >
              <Plus size={12} className="text-white font-bold" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center cursor-pointer group" onClick={handleLike}>
          <div className="p-2 transition-transform active:scale-75 group-hover:scale-110">
            <Heart size={36} className={`filter drop-shadow-md ${isLiked ? 'fill-[#FE2C55] text-[#FE2C55]' : 'fill-white/10 text-white'}`} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-md">{likes}</span>
        </div>

        <div className="flex flex-col items-center cursor-pointer group" onClick={handleComment}>
          <div className="p-2 transition-transform active:scale-75 group-hover:scale-110">
            <MessageCircle size={34} className="fill-white text-white drop-shadow-md" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-md">{video.commentsCount}</span>
        </div>

        <div className="flex flex-col items-center cursor-pointer group" onClick={handleShare}>
          <div className="p-2 transition-transform active:scale-75 group-hover:scale-110 relative">
            {shareFeedback ? (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500 rounded-full animate-ping-short">
                <Check size={20} className="text-white" />
              </div>
            ) : (
              <Share2 size={34} className="fill-white text-white drop-shadow-md" />
            )}
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-md">
            {shareFeedback ? 'Copied' : video.sharesCount}
          </span>
        </div>

        <div className="mt-4 relative group cursor-pointer">
          <div className={`w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center overflow-hidden border-[6px] border-gray-800 ${isPlaying ? 'animate-spin-slow' : ''}`}>
             <img src={video.user.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
          </div>
          {isPlaying && (
             <>
               <Music size={12} className="absolute -top-4 -right-2 text-gray-300 opacity-0 animate-[ping-short_2s_ease-in-out_infinite] delay-100" />
               <Music size={12} className="absolute -top-8 right-0 text-gray-300 opacity-0 animate-[ping-short_2.5s_ease-in-out_infinite] delay-500" />
             </>
          )}
        </div>
      </div>

      <div className={`absolute bottom-4 left-3 right-16 z-20 md:bottom-6 md:left-4 transition-opacity duration-200 ${isCommentsOpen ? 'opacity-0' : 'opacity-100'}`}>
        <h3 className="text-white font-bold text-[17px] drop-shadow-md hover:underline cursor-pointer mb-1 shadow-black">
          @{video.user.username}
        </h3>
        <p className="text-white text-[15px] leading-tight drop-shadow-md mb-2">
          {video.caption}
        </p>
        
        <div className="flex items-center gap-2 mt-2">
          <Music size={14} className="text-white" />
          <div className="overflow-hidden w-40 h-5 relative">
            <div className="whitespace-nowrap absolute animate-marquee text-white text-[14px] font-medium">
              {video.songName} &nbsp;&nbsp; • &nbsp;&nbsp; {video.songName} &nbsp;&nbsp; • &nbsp;&nbsp; {video.songName}
            </div>
          </div>
        </div>
      </div>
      
      <CommentsDrawer 
        isOpen={isCommentsOpen} 
        onClose={() => setIsCommentsOpen(false)} 
        totalComments={video.commentsCount}
      />
      
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-10" />
    </div>
  );
};

export default VideoCard;