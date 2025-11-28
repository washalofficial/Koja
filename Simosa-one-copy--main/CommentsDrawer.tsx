import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Heart, User } from 'lucide-react';
import { authService } from '../services/authService';

interface Comment {
  id: number;
  username: string;
  text: string;
  avatar: string;
  likes: number;
  time: string;
  isLiked?: boolean;
}

const MOCK_COMMENTS: Comment[] = [
  { id: 1, username: 'dance_queen', text: 'This is absolutely fire! 🔥🔥', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', likes: 124, time: '2m' },
  { id: 2, username: 'tech_bro', text: 'How did you do that transition? 🤯', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', likes: 89, time: '15m' },
  { id: 3, username: 'samosa_lover', text: 'Waiting for part 2!', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', likes: 45, time: '1h' },
  { id: 4, username: 'user_9921', text: 'First! 😂', avatar: '', likes: 12, time: '2h' },
  { id: 5, username: 'travel_diaries', text: 'Location please??', avatar: 'https://images.unsplash.com/photo-1536766820879-059fec98ec0a?w=100', likes: 8, time: '3h' },
];

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  totalComments: number;
}

const CommentsDrawer: React.FC<CommentsDrawerProps> = ({ isOpen, onClose, totalComments }) => {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUser = authService.getCurrentUser();

  // Reset closing state when opened
  useEffect(() => {
    if (isOpen) setIsClosing(false);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  const handlePost = () => {
    if (!newComment.trim()) return;

    if (!currentUser) {
       window.dispatchEvent(new Event('login-request'));
       return;
    }
    
    const comment: Comment = {
      id: Date.now(),
      username: currentUser.username,
      text: newComment,
      avatar: currentUser.avatarUrl,
      likes: 0,
      time: 'Just now'
    };

    setComments([comment, ...comments]);
    setNewComment('');
  };

  const handleLikeComment = (id: number) => {
    setComments(comments.map(c => {
      if (c.id === id) {
        return { ...c, likes: c.isLiked ? c.likes - 1 : c.likes + 1, isLiked: !c.isLiked };
      }
      return c;
    }));
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 pointer-events-auto ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      {/* Drawer Content */}
      <div 
        className={`bg-white w-full md:max-w-md h-[70%] md:h-[60%] rounded-t-xl flex flex-col pointer-events-auto transition-transform duration-300 ease-out shadow-2xl ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <div className="w-6"></div> {/* Spacer */}
          <h3 className="font-bold text-sm text-gray-800">{totalComments} comments</h3>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 items-start group">
              {comment.avatar ? (
                <img src={comment.avatar} alt={comment.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-gray-500" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 mb-0.5">{comment.username} <span className="font-normal text-gray-400 ml-2">{comment.time}</span></p>
                <p className="text-sm text-gray-800 leading-snug">{comment.text}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button className="text-xs text-gray-500 font-medium hover:underline">Reply</button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => handleLikeComment(comment.id)}>
                <Heart size={14} className={`${comment.isLiked ? 'fill-[#FE2C55] text-[#FE2C55]' : 'text-gray-300'}`} />
                <span className="text-[10px] text-gray-400">{comment.likes}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-gray-100 bg-white flex items-center gap-3 safe-area-bottom">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
             {/* Current user placeholder or guest icon */}
             {currentUser ? (
                <img src={currentUser.avatarUrl} className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                  <User size={16} className="text-gray-500" />
                </div>
             )}
          </div>
          <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2">
             <input 
               ref={inputRef}
               type="text" 
               placeholder={currentUser ? "Add comment..." : "Log in to comment..."}
               className="bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-500 w-full"
               value={newComment}
               onChange={(e) => setNewComment(e.target.value)}
               onFocus={() => { if (!currentUser) { inputRef.current?.blur(); window.dispatchEvent(new Event('login-request')); }}}
               onKeyDown={(e) => e.key === 'Enter' && handlePost()}
             />
             <button 
               onClick={handlePost}
               className={`ml-2 transition-colors ${newComment.trim() ? 'text-[#FE2C55]' : 'text-gray-400'}`}
             >
                <Send size={18} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsDrawer;