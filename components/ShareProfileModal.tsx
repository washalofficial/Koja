
import React, { useState } from 'react';
import { ChevronLeft, Copy, Share, CheckCircle, ScanLine } from 'lucide-react';
import { User } from '../types';

interface ShareProfileModalProps {
  user: User;
  onClose: () => void;
}

const ShareProfileModal: React.FC<ShareProfileModalProps> = ({ user, onClose }) => {
  const [copied, setCopied] = useState(false);
  
  // Generate a stable URL based on username
  const profileUrl = `https://simosatok.app/@${user.username}`;
  
  // Use a reliable public API for the QR code. 
  // We use the user's specific URL as the data.
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}&bgcolor=ffffff&color=000000&margin=0`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Follow ${user.fullName} on Simosa Tok`,
          text: `Check out ${user.fullName} (@${user.username}) on Simosa Tok!`,
          url: profileUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-[#FE2C55] via-[#ff4d6d] to-[#ff758f] animate-in fade-in duration-200">
      
      {/* Navbar */}
      <div className="flex justify-between items-center p-4 pt-6 text-white">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={28} />
        </button>
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ScanLine size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        
        {/* QR Card */}
        <div className="bg-white rounded-[24px] w-full max-w-sm p-8 flex flex-col items-center shadow-2xl relative transform transition-all hover:scale-[1.01] duration-300">
          
          {/* Avatar (Overlapping Top) */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
             <div className="w-20 h-20 rounded-full p-1 bg-white shadow-sm">
                <img 
                  src={user.avatarUrl} 
                  alt={user.username} 
                  className="w-full h-full rounded-full object-cover bg-gray-100"
                />
             </div>
             {/* Logo Badge */}
             <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm">
               <div className="w-5 h-5 bg-[#FE2C55] rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                 ST
               </div>
             </div>
          </div>

          <div className="mt-10 text-center">
            <h2 className="text-xl font-bold text-gray-900">{user.username}</h2>
            <p className="text-gray-500 text-sm mt-1">@{user.username.toLowerCase().replace(/\s/g, '')}</p>
          </div>

          {/* QR Code Container with TikTok-style corners */}
          <div className="mt-8 relative p-4">
             {/* Decorative Corners */}
             <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#25F4EE] rounded-tl-xl"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#FE2C55] rounded-tr-xl"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#FE2C55] rounded-bl-xl"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#25F4EE] rounded-br-xl"></div>

             {/* The QR Code */}
             <img 
               src={qrCodeUrl} 
               alt="QR Code" 
               className="w-48 h-48 mix-blend-multiply opacity-90"
             />
          </div>

          <div className="mt-8 flex items-center gap-2">
            <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
               <span className="text-white text-[8px] font-bold">♪</span>
            </div>
            <span className="font-bold text-gray-900 tracking-tight">Simosa Tok</span>
          </div>
        </div>

      </div>

      {/* Bottom Actions */}
      <div className="bg-white/10 backdrop-blur-md border-t border-white/20 p-6 pb-8 safe-area-bottom">
         <div className="flex gap-4 max-w-sm mx-auto">
            <button 
              onClick={handleCopy}
              className="flex-1 bg-white rounded-xl py-3.5 px-4 flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              {copied ? (
                <CheckCircle size={24} className="text-green-500" />
              ) : (
                <Copy size={24} className="text-gray-700" />
              )}
              <span className="text-xs font-semibold text-gray-700">
                {copied ? 'Copied' : 'Copy link'}
              </span>
            </button>

            <button 
              onClick={handleShare}
              className="flex-1 bg-white rounded-xl py-3.5 px-4 flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <Share size={24} className="text-gray-700" />
              <span className="text-xs font-semibold text-gray-700">
                Share link
              </span>
            </button>
         </div>
         <p className="text-center text-white/60 text-xs mt-6 font-medium">
            Connect and have fun with friends on Simosa Tok
         </p>
      </div>

    </div>
  );
};

export default ShareProfileModal;
