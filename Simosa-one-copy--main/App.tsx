
import React, { useState, useEffect } from 'react';
import { Home, Search, Plus, MessageSquare, User as UserIcon, Menu, Compass, Settings, LogOut } from 'lucide-react';
import VideoFeed from './components/VideoFeed';
import UploadView from './components/UploadView';
import AdminDashboard from './components/AdminDashboard';
import ProfileView from './components/ProfileView';
import DiscoverView from './components/DiscoverView';
import InboxView from './components/InboxView';
import AuthModal from './components/AuthModal';
import { ViewState, User } from './types';
import { authService } from './services/authService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.FEED);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [feedTab, setFeedTab] = useState<'following' | 'foryou'>('foryou');
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Check initial user
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    // Listen for auth changes
    const handleAuthChange = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    
    // Listen for login requests from child components
    const handleLoginRequest = () => {
      setShowAuthModal(true);
    };

    // Listen for admin access request
    const handleAdminAccess = () => {
      setCurrentView(ViewState.ADMIN);
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('login-request', handleLoginRequest);
    window.addEventListener('admin-access', handleAdminAccess);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('login-request', handleLoginRequest);
      window.removeEventListener('admin-access', handleAdminAccess);
    };
  }, []);

  const handleProtectedAction = (action: () => void) => {
    if (currentUser) {
      action();
    } else {
      setShowAuthModal(true);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.FEED:
        return <VideoFeed key={feedTab} feedType={feedTab} />;
      case ViewState.UPLOAD:
        return <UploadView onClose={() => setCurrentView(ViewState.FEED)} />;
      case ViewState.ADMIN:
        return <AdminDashboard />;
      case ViewState.PROFILE:
        return <ProfileView onLoginRequest={() => setShowAuthModal(true)} />;
      case ViewState.INBOX:
        return <InboxView />;
      case ViewState.DISCOVER:
        return <DiscoverView />;
      default:
        return <VideoFeed feedType="foryou" />;
    }
  };

  const isUploadView = currentView === ViewState.UPLOAD;

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans">
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={() => setShowAuthModal(false)} 
        />
      )}

      {/* Desktop Sidebar */}
      {!isUploadView && (
        <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-30 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
            {isSidebarOpen ? (
              <h1 className="text-2xl font-black text-[#FE2C55] tracking-tighter cursor-pointer" onClick={() => setCurrentView(ViewState.FEED)}>
                Simosa Tok
              </h1>
            ) : (
              <div className="w-8 h-8 bg-[#FE2C55] rounded-full flex items-center justify-center text-white font-bold text-xs">ST</div>
            )}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-gray-600">
              <Menu size={20} />
            </button>
          </div>

          <nav className="flex-1 py-6 px-3 space-y-1">
            <SidebarItem 
              icon={<Home size={24} />} 
              label="For You" 
              isActive={currentView === ViewState.FEED} 
              isOpen={isSidebarOpen}
              onClick={() => setCurrentView(ViewState.FEED)}
            />
            <SidebarItem 
              icon={<Compass size={24} />} 
              label="Discover" 
              isActive={currentView === ViewState.DISCOVER} 
              isOpen={isSidebarOpen}
              onClick={() => setCurrentView(ViewState.DISCOVER)}
            />
            <SidebarItem 
              icon={<MessageSquare size={24} />} 
              label="Inbox" 
              isActive={currentView === ViewState.INBOX} 
              isOpen={isSidebarOpen}
              onClick={() => handleProtectedAction(() => setCurrentView(ViewState.INBOX))}
            />
            <SidebarItem 
              icon={<UserIcon size={24} />} 
              label="Profile" 
              isActive={currentView === ViewState.PROFILE} 
              isOpen={isSidebarOpen}
              onClick={() => setCurrentView(ViewState.PROFILE)} // Profile handles its own guest state
            />
            
            <div className="my-6 border-t border-gray-100 mx-3"></div>

            {currentUser ? (
               <div className="px-3">
                  {isSidebarOpen && <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Account</p>}
                  <SidebarItem 
                    icon={<LogOut size={24} />} 
                    label="Log out" 
                    isActive={false} 
                    isOpen={isSidebarOpen}
                    onClick={() => authService.logout()}
                  />
               </div>
            ) : (
              isSidebarOpen && (
                <div className="p-4 bg-gray-50 rounded-lg mx-2 text-center">
                   <p className="text-sm text-gray-500 mb-3">Log in to follow creators, like videos, and view comments.</p>
                   <button 
                     onClick={() => setShowAuthModal(true)}
                     className="w-full border border-[#FE2C55] text-[#FE2C55] font-bold py-1.5 rounded-md hover:bg-red-50"
                   >
                     Log in
                   </button>
                </div>
              )
            )}
          </nav>

          {isSidebarOpen && (
            <div className="p-4 border-t border-gray-100">
              <div className="bg-gray-50 p-4 rounded-xl text-center">
                <p className="text-xs text-gray-500 mb-2">Create your own videos</p>
                <button 
                  onClick={() => handleProtectedAction(() => setCurrentView(ViewState.UPLOAD))}
                  className="w-full bg-black hover:bg-gray-800 text-white font-bold py-2 rounded-lg text-sm transition-colors border border-gray-200"
                >
                  Upload
                </button>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative bg-black flex flex-col h-full w-full">
         {/* Mobile Top Header */}
         {currentView === ViewState.FEED && !isUploadView && (
            <div className={`absolute top-0 w-full z-20 flex justify-center items-center h-14 bg-gradient-to-b from-black/40 to-transparent pointer-events-none transition-all duration-300 ${isMobileSearchOpen ? 'bg-black/90' : ''}`}>
               {isMobileSearchOpen ? (
                 <div className="w-full px-4 flex items-center gap-3 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-md flex items-center px-3 py-2 border border-white/20">
                      <Search size={16} className="text-white/60 mr-2" />
                      <input 
                        type="search"
                        enterKeyHint="search"
                        placeholder="Search users, videos..." 
                        className="bg-transparent w-full text-sm text-white placeholder-white/60 outline-none"
                        autoFocus
                      />
                    </div>
                    <button 
                      onClick={() => setIsMobileSearchOpen(false)}
                      className="text-[#FE2C55] font-semibold text-sm"
                    >
                      Cancel
                    </button>
                 </div>
               ) : (
                 <>
                   <div className="flex gap-4 font-bold text-[16px] drop-shadow-md pointer-events-auto">
                     <button 
                       onClick={() => setFeedTab('following')}
                       className={`transition-colors ${feedTab === 'following' ? 'text-white border-b-2 border-white pb-0.5' : 'text-white/70 hover:text-white'}`}
                     >
                       Following
                     </button>
                     <span className="text-white/30">|</span>
                     <button 
                       onClick={() => setFeedTab('foryou')}
                       className={`transition-colors ${feedTab === 'foryou' ? 'text-white border-b-2 border-white pb-0.5' : 'text-white/70 hover:text-white'}`}
                     >
                       For You
                     </button>
                   </div>
                   <button 
                     className="absolute right-4 text-white pointer-events-auto md:hidden"
                     onClick={() => setIsMobileSearchOpen(true)}
                   >
                     <Search size={24} />
                   </button>
                 </>
               )}
            </div>
         )}

         <div className={`flex-1 h-full w-full overflow-hidden relative ${isUploadView ? '' : 'pt-0 md:pt-0 pb-12 md:pb-0'}`}>
            {renderContent()}
         </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {!isUploadView && (
        <div className={`md:hidden fixed bottom-0 w-full h-[50px] border-t flex justify-around items-center z-50 px-2 ${currentView === ViewState.FEED ? 'bg-black border-white/20 text-white' : 'bg-white border-gray-200 text-gray-800'} landscape:hidden`}>
          <MobileNavItem 
            icon={<Home size={22} className={currentView === ViewState.FEED ? "fill-white" : ""} />} 
            label="Home" 
            active={currentView === ViewState.FEED} 
            onClick={() => setCurrentView(ViewState.FEED)} 
            isDark={currentView === ViewState.FEED}
          />
          <MobileNavItem 
            icon={<Compass size={22} />} 
            label="Discover" 
            active={currentView === ViewState.DISCOVER} 
            onClick={() => setCurrentView(ViewState.DISCOVER)} 
            isDark={currentView === ViewState.FEED}
          />
          <div className="relative w-12 h-8 flex items-center justify-center" onClick={() => handleProtectedAction(() => setCurrentView(ViewState.UPLOAD))}>
            <div className={`w-10 h-7 rounded-[8px] flex items-center justify-center transition-colors ${currentView === ViewState.FEED ? 'bg-white text-black' : 'bg-black text-white'}`}>
              <Plus size={20} className="font-bold" />
            </div>
          </div>
          <MobileNavItem 
            icon={<MessageSquare size={22} />} 
            label="Inbox" 
            active={currentView === ViewState.INBOX} 
            onClick={() => handleProtectedAction(() => setCurrentView(ViewState.INBOX))} 
            isDark={currentView === ViewState.FEED}
          />
          <MobileNavItem 
            icon={<UserIcon size={22} />} 
            label="Profile" 
            active={currentView === ViewState.PROFILE} 
            onClick={() => setCurrentView(ViewState.PROFILE)} 
            isDark={currentView === ViewState.FEED}
          />
        </div>
      )}
    </div>
  );
};

const SidebarItem = ({ icon, label, isActive, isOpen, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, isOpen: boolean, onClick: () => void }) => (
  <div onClick={onClick} className={`flex items-center gap-4 px-3 py-3 rounded-lg cursor-pointer transition-colors group ${isActive ? 'bg-red-50 text-[#FE2C55]' : 'text-gray-700 hover:bg-gray-100'}`}>
    <div className={`transition-transform group-hover:scale-110 ${isActive ? 'text-yellow-400' : 'text-gray-500'}`}>{icon}</div>
    {isOpen && <span className={`font-semibold text-base ${isActive ? 'text-[#FE2C55]' : 'text-gray-700'}`}>{label}</span>}
  </div>
);

const MobileNavItem = ({ icon, label, active, onClick, isDark }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, isDark: boolean }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-14 gap-[2px] ${active ? (isDark ? 'text-white' : 'text-black') : (isDark ? 'text-white/50' : 'text-gray-400')}`}>
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;