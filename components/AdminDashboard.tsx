
import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend 
} from 'recharts';
import { 
  Users, Play, AlertTriangle, Activity, TrendingUp, Loader2, 
  Shield, Menu, Flag, Search, CheckCircle, XCircle, Trash2, Ban, UserCheck, LayoutDashboard 
} from 'lucide-react';
import { api } from '../services/api';
import { User, Report, Video } from '../types';

type AdminTab = 'overview' | 'users' | 'reports';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Stats Data
  const [stats, setStats] = useState({ users: 0, videos: 0, reports: 0 });
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  
  // Lists
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  useEffect(() => {
    loadDashboard();
  }, [activeTab]); // Reload when tab changes

  const loadDashboard = async () => {
    setLoading(true);
    
    // Always fetch overview stats for sidebar badges
    const dashboardData = await api.getDashboardData();
    if (dashboardData) {
      setStats(dashboardData.totals);
      setGrowthData(processGrowth(dashboardData.rawGrowth));
      setReportData(processReports(dashboardData.rawReports));
    }

    if (activeTab === 'overview') {
      const recent = await api.getRecentUploads();
      setRecentUploads(recent);
    } else if (activeTab === 'users') {
      const users = await api.getAllUsers();
      setAllUsers(users);
    } else if (activeTab === 'reports') {
      const reportList = await api.getReports();
      setReports(reportList);
    }

    setLoading(false);
  };

  // Helper to aggregate last 7 days data
  const processGrowth = (raw: { users: any[], views: any[] }) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];
    
    for(let i=6; i>=0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayName = days[d.getDay()];
        const dateString = d.toISOString().split('T')[0];

        const userCount = raw.users.filter((u: any) => u.created_at.startsWith(dateString)).length;
        const viewCount = raw.views.filter((v: any) => v.created_at.startsWith(dateString)).length;

        result.push({ name: dayName, views: viewCount, users: userCount });
    }
    return result;
  };

  const processReports = (raw: any[]) => {
    const counts: {[key: string]: number} = {};
    raw.forEach(r => {
       const reason = r.reason || 'Other';
       counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
  };

  // --- ACTIONS ---

  const handleBanUser = async (user: User) => {
     if(!confirm(`Are you sure you want to ${user.isBanned ? 'unban' : 'BAN'} @${user.username}?`)) return;
     const success = await api.toggleUserBan(user.id, !!user.isBanned);
     if(success) {
         setAllUsers(prev => prev.map(u => u.id === user.id ? {...u, isBanned: !u.isBanned} : u));
         alert(`User @${user.username} has been ${user.isBanned ? 'unbanned' : 'banned'}.`);
     }
  };

  const handleVerifyUser = async (user: User) => {
    const success = await api.toggleUserVerification(user.id, !!user.isVerified);
    if(success) {
        setAllUsers(prev => prev.map(u => u.id === user.id ? {...u, isVerified: !u.isVerified} : u));
    }
  };

  const handleDismissReport = async (reportId: string) => {
    await api.resolveReport(reportId, 'dismissed');
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  const handleBanFromReport = async (userId: string, reportId: string) => {
    if(!confirm("Ban this user and resolve report?")) return;
    await api.toggleUserBan(userId, false); // Ban
    await api.resolveReport(reportId, 'resolved');
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  const handleDeleteVideo = async (videoId: string, reportId: string) => {
    if(!confirm("Permanently delete this video?")) return;
    await api.adminDeleteVideo(videoId);
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  // --- SUB COMPONENTS ---

  const OverviewTab = () => (
    <div className="space-y-6 animate-in fade-in">
       {/* Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value={stats.users} icon={<Users size={20}/>} color="bg-blue-50 text-blue-600" footer="Active" footerColor="text-green-500" />
          <StatCard title="Total Videos" value={stats.videos} icon={<Play size={20}/>} color="bg-purple-50 text-purple-600" footer="Uploaded" footerColor="text-gray-400" />
          <StatCard title="Pending Reports" value={stats.reports} icon={<AlertTriangle size={20}/>} color="bg-red-50 text-red-600" footer={stats.reports > 0 ? "Action Req" : "All Good"} footerColor={stats.reports > 0 ? "text-red-500" : "text-green-500"} />
          <StatCard title="System Status" value="Online" icon={<Activity size={20}/>} color="bg-green-50 text-green-600" footer="Stable" footerColor="text-gray-400" />
       </div>

       {/* Charts */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <h3 className="text-lg font-bold text-gray-800 mb-6">Growth Trends</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="views" stroke="#ef4444" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} dot={false} />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <h3 className="text-lg font-bold text-gray-800 mb-6">Reports Overview</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={reportData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" radius={[4,4,0,0]} barSize={40} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
       </div>

       {/* Recent Uploads Table */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-bold">Recent Uploads</h3></div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                   <tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Caption</th><th className="px-6 py-3">Stats</th><th className="px-6 py-3">Date</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {recentUploads.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4 text-sm font-medium">@{v.users?.username}</td>
                         <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[200px]">{v.caption}</td>
                         <td className="px-6 py-4 text-xs text-gray-500">{v.views} views</td>
                         <td className="px-6 py-4 text-xs text-gray-500">{new Date(v.created_at).toLocaleDateString()}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );

  const UsersTab = () => {
    const filteredUsers = allUsers.filter(u => u.username.toLowerCase().includes(searchUserQuery.toLowerCase()) || u.fullName.toLowerCase().includes(searchUserQuery.toLowerCase()));
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col animate-in fade-in">
         <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-xl font-bold">User Management</h3>
            <div className="bg-gray-100 px-3 py-2 rounded-lg flex items-center w-64">
               <Search size={16} className="text-gray-400 mr-2" />
               <input type="text" placeholder="Search users..." className="bg-transparent outline-none text-sm w-full" value={searchUserQuery} onChange={e => setSearchUserQuery(e.target.value)} />
            </div>
         </div>
         <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold sticky top-0 z-10">
                  <tr>
                     <th className="px-6 py-3">User</th>
                     <th className="px-6 py-3">Status</th>
                     <th className="px-6 py-3">Followers</th>
                     <th className="px-6 py-3">Verification</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => (
                     <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.isBanned ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 flex items-center gap-3">
                           <img src={u.avatarUrl} className="w-8 h-8 rounded-full bg-gray-200" />
                           <div>
                              <div className="font-bold text-sm text-gray-900 flex items-center gap-1">
                                 @{u.username} 
                                 {u.isVerified && <CheckCircle size={12} className="text-blue-500 fill-blue-500 text-white" />}
                              </div>
                              <div className="text-xs text-gray-500">{u.fullName}</div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           {u.isBanned ? (
                              <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">BANNED</span>
                           ) : (
                              <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">ACTIVE</span>
                           )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{u.followers.toLocaleString()}</td>
                        <td className="px-6 py-4">
                           <button onClick={() => handleVerifyUser(u)} className={`text-xs border px-2 py-1 rounded ${u.isVerified ? 'border-red-200 text-red-500' : 'border-blue-200 text-blue-500'}`}>
                              {u.isVerified ? 'Revoke Verify' : 'Verify'}
                           </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button onClick={() => handleBanUser(u)} className={`p-2 rounded hover:bg-gray-200 ${u.isBanned ? 'text-green-600' : 'text-red-500'}`}>
                              {u.isBanned ? <UserCheck size={18} /> : <Ban size={18} />}
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    )
  };

  const ReportsTab = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col animate-in fade-in">
       <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold flex items-center gap-2"><Flag className="text-red-500"/> Reported Content ({reports.length})</h3>
       </div>
       <div className="flex-1 overflow-auto">
          {reports.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <CheckCircle size={48} className="mb-4 text-green-500" />
                <p>All clean! No pending reports.</p>
             </div>
          ) : (
             <div className="space-y-4 p-6">
                {reports.map(r => (
                   <div key={r.id} className="border border-gray-200 rounded-lg p-4 flex gap-4 hover:shadow-md transition-shadow">
                      {/* Thumbnail / Content Preview */}
                      <div className="w-24 h-32 bg-black rounded-md flex-shrink-0 relative overflow-hidden">
                         {r.video ? (
                            <img src={r.video.thumbnailUrl || r.video.videoUrl} className="w-full h-full object-cover" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xs">Deleted</div>
                         )}
                         <div className="absolute top-1 left-1 bg-red-600 text-white text-[10px] px-1 rounded">Reported</div>
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <div>
                               <h4 className="font-bold text-red-600 uppercase text-xs mb-1">{r.reason}</h4>
                               <p className="text-sm font-semibold text-gray-900">
                                  Target: {r.video ? 'Video Content' : 'User Profile'}
                               </p>
                               {r.reportedUser && (
                                  <p className="text-xs text-gray-500 mt-1">Offender: <span className="font-bold">@{r.reportedUser.username}</span></p>
                               )}
                               <p className="text-xs text-gray-400 mt-2">Reported at: {new Date(r.createdAt).toLocaleString()}</p>
                            </div>
                         </div>
                         
                         {/* Action Buttons */}
                         <div className="flex gap-2 mt-4">
                            <button onClick={() => handleDismissReport(r.id)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded">Ignore</button>
                            <button onClick={() => r.reportedUserId && handleBanFromReport(r.reportedUserId, r.id)} className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded flex items-center gap-1"><Ban size={12}/> Ban User</button>
                            {r.videoId && <button onClick={() => handleDeleteVideo(r.videoId!, r.id)} className="px-3 py-1.5 text-xs font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded flex items-center gap-1"><Trash2 size={12}/> Delete Video</button>}
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          )}
       </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
       {/* Admin Sidebar */}
       <aside className={`bg-gray-900 text-white flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
          <div className="p-6 flex items-center justify-between">
             {isSidebarOpen ? <span className="font-black text-xl text-[#FE2C55]">ADMIN</span> : <span className="font-black text-xl text-[#FE2C55]">A</span>}
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white"><Menu size={20}/></button>
          </div>
          
          <nav className="flex-1 px-3 space-y-2">
             <SidebarItem icon={<LayoutDashboard size={20}/>} label="Overview" active={activeTab === 'overview'} isOpen={isSidebarOpen} onClick={() => setActiveTab('overview')} />
             <SidebarItem icon={<Users size={20}/>} label="User Management" active={activeTab === 'users'} isOpen={isSidebarOpen} onClick={() => setActiveTab('users')} />
             <SidebarItem icon={<Shield size={20}/>} label="Moderation" active={activeTab === 'reports'} isOpen={isSidebarOpen} onClick={() => setActiveTab('reports')} badge={stats.reports} />
          </nav>
          
          <div className="p-4 border-t border-gray-800">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FE2C55] flex items-center justify-center font-bold text-xs">JD</div>
                {isSidebarOpen && <div className="text-sm"><p className="font-bold">Admin User</p><p className="text-gray-500 text-xs">Super Admin</p></div>}
             </div>
          </div>
       </aside>

       {/* Main Content */}
       <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="bg-white h-16 border-b border-gray-200 flex items-center px-6 justify-between shrink-0">
             <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab.replace('-', ' ')}</h2>
             <div className="flex items-center gap-4">
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live
                </div>
             </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
             {loading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" size={32}/></div>
             ) : (
                <>
                   {activeTab === 'overview' && <OverviewTab />}
                   {activeTab === 'users' && <UsersTab />}
                   {activeTab === 'reports' && <ReportsTab />}
                </>
             )}
          </div>
       </main>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, footer, footerColor }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
    </div>
    {footer && <span className={`${footerColor} text-xs font-semibold flex items-center mt-3`}><TrendingUp size={12} className="mr-1" /> {footer}</span>}
  </div>
);

const SidebarItem = ({ icon, label, active, isOpen, onClick, badge }: any) => (
  <div onClick={onClick} className={`flex items-center gap-4 px-3 py-3 rounded-lg cursor-pointer transition-colors group ${active ? 'bg-[#FE2C55] text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
    <div className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{icon}</div>
    {isOpen && (
       <div className="flex-1 flex justify-between items-center">
          <span className="font-medium text-sm">{label}</span>
          {badge > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
       </div>
    )}
  </div>
);

export default AdminDashboard;
