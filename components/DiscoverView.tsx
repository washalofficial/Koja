import React from 'react';
import { Search, Hash, Music } from 'lucide-react';
import { MOCK_VIDEOS } from '../constants';

const DiscoverView: React.FC = () => {
  return (
    <div className="h-full bg-white overflow-y-auto pb-20">
      {/* Search Bar */}
      <div className="sticky top-0 bg-white z-20 px-4 py-3 flex gap-4 items-center border-b border-gray-100">
        <div className="flex-1 bg-gray-100 rounded-md flex items-center px-3 py-2">
          <Search size={18} className="text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search" 
            className="bg-transparent w-full text-sm outline-none text-gray-800 placeholder-gray-500"
          />
        </div>
        <span className="text-sm font-semibold text-red-500">Search</span>
      </div>

      {/* Carousel / Banner (Mock) */}
      <div className="h-40 bg-gradient-to-r from-blue-400 to-purple-500 mx-4 mt-4 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <h2 className="text-white text-2xl font-bold z-10 text-center px-4">
          #SimosaChallenge<br/>
          <span className="text-sm font-normal">Join the spicy trend! 🌶️</span>
        </h2>
      </div>

      {/* Trending Topics */}
      <div className="mt-6 px-4">
        <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Trending Now</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {['#SimosaTok', '#DanceIndia', '#Comedy', '#TechLife', '#CricketFever'].map((tag, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-2 border border-gray-200 px-3 py-1.5 rounded-full bg-white">
               <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">#</div>
               <span className="text-sm font-medium text-gray-700">{tag.substring(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Discover Grid */}
      <div className="mt-2 grid grid-cols-2 gap-2 px-2">
        {MOCK_VIDEOS.map((video, idx) => (
          <div key={video.id} className="relative rounded-lg overflow-hidden bg-gray-100 aspect-[9/14]">
            <img src={video.thumbnailUrl || video.videoUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-xs line-clamp-2 font-medium mb-1">{video.caption}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <img src={video.user.avatarUrl} className="w-4 h-4 rounded-full" />
                  <span className="text-[10px] text-gray-200">{video.user.username}</span>
                </div>
                <div className="flex items-center gap-0.5">
                   <Heart size={10} className="text-white" />
                   <span className="text-[10px] text-white">{video.likesCount}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* Repeating content to fill grid */}
        {MOCK_VIDEOS.map((video, idx) => (
          <div key={`dup-${video.id}`} className="relative rounded-lg overflow-hidden bg-gray-100 aspect-[9/14]">
            <img src={video.thumbnailUrl || video.videoUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-xs line-clamp-2 font-medium mb-1">{video.caption}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <img src={video.user.avatarUrl} className="w-4 h-4 rounded-full" />
                  <span className="text-[10px] text-gray-200">{video.user.username}</span>
                </div>
                <div className="flex items-center gap-0.5">
                   <Heart size={10} className="text-white" />
                   <span className="text-[10px] text-white">{video.likesCount}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper for icon
const Heart = ({size, className}: {size:number, className?: string}) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
)

export default DiscoverView;