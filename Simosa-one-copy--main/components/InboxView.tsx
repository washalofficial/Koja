import React from 'react';
import { MessageCircle, Heart, User, ChevronRight } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'like', user: 'dance_diva', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', content: 'liked your video', time: '2m' },
  { id: 2, type: 'follow', user: 'tech_guru', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', content: 'started following you', time: '1h' },
  { id: 3, type: 'mention', user: 'spice_king', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', content: 'mentioned you in a comment: "This is 🔥"', time: '3h' },
  { id: 4, type: 'system', user: 'Simosa Tok', avatar: '', content: 'Welcome to Simosa Tok! Create your first video now.', time: '1d' },
];

const InboxView: React.FC = () => {
  return (
    <div className="h-full bg-white overflow-y-auto pb-20">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-gray-100 flex justify-center items-center shadow-sm">
        <h1 className="font-bold text-lg text-gray-900">All Activity</h1>
      </div>

      <div className="divide-y divide-gray-50">
        <div className="px-4 py-3">
            <h2 className="text-gray-500 font-semibold text-sm mb-2">New</h2>
        </div>
        
        {MOCK_NOTIFICATIONS.map((notif) => (
          <div key={notif.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
             <div className="relative">
               {notif.avatar ? (
                 <img src={notif.avatar} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
               ) : (
                 <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <div className="w-8 h-8 bg-[#FE2C55] rounded-full flex items-center justify-center text-white font-bold text-xs">ST</div>
                 </div>
               )}
               
               {/* Icon badge */}
               <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white">
                 {notif.type === 'like' && <div className="bg-[#FE2C55] p-0.5 rounded-full"><Heart size={10} className="text-white fill-white" /></div>}
                 {notif.type === 'follow' && <div className="bg-blue-500 p-0.5 rounded-full"><User size={10} className="text-white fill-white" /></div>}
                 {notif.type === 'mention' && <div className="bg-green-500 p-0.5 rounded-full"><MessageCircle size={10} className="text-white fill-white" /></div>}
               </div>
             </div>

             <div className="flex-1 min-w-0">
               <p className="text-sm text-gray-900">
                 <span className="font-bold hover:underline">{notif.user}</span> <span className="text-gray-600">{notif.content}</span>
               </p>
               <p className="text-xs text-gray-400 mt-0.5">{notif.time}</p>
             </div>

             {notif.type === 'follow' ? (
                <button className="bg-[#FE2C55] text-white text-xs font-semibold px-4 py-1.5 rounded-md hover:bg-[#e0264a]">Follow back</button>
             ) : (
                <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden">
                   {notif.type === 'like' && <img src="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=100" className="w-full h-full object-cover" />}
                </div>
             )}
          </div>
        ))}
        
        <div className="px-4 py-3 mt-4">
            <h2 className="text-gray-500 font-semibold text-sm mb-2">Previous</h2>
        </div>

        {/* Mocking more items */}
        {[1,2,3].map(i => (
           <div key={`mock-${i}`} className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                 <div className="h-3 bg-gray-100 w-3/4 rounded"></div>
                 <div className="h-2 bg-gray-100 w-1/4 rounded"></div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
           </div>
        ))}
      </div>
    </div>
  );
};

export default InboxView;