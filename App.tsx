import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SyncConfig, LogEntry, FileToSync, SyncState, GitTreeItem } from './types';
import { GitHubService } from './services/githubService';
import { generateCommitMessage } from './services/geminiService';
import { readFileAsBase64, parseRepoUrl, computeGitBlobSha } from './utils/fileUtils';
import { Logger } from './components/Logger';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { ConsentBanner } from './components/ConsentBanner';
import { 
  FolderGit2, 
  Github, 
  Settings, 
  UploadCloud, 
  CheckCircle2, 
  Loader2,
  FolderOpen,
  GitBranch,
  FolderInput,
  ArrowRight,
  AlertCircle,
  XCircle,
  Menu,
  Trash2,
  Home,
  UserCog,
  Shield,
  HelpCircle,
  LogOut,
  BookOpen,
  Lock,
  Save,
  LayoutDashboard
} from 'lucide-react';

const App: React.FC = () => {
  // Config State
  const [config, setConfig] = useState<SyncConfig>({
    token: localStorage.getItem('gh_token') || '',
    repoUrl: localStorage.getItem('gh_repo') || '',
    branch: 'main',
    targetPath: '',
    deleteMissing: false,
    autoCommitMessage: true,
  });

  // Admin & Ads State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adConfig, setAdConfig] = useState({
    adsterra: localStorage.getItem('admin_adsterra') || '',
    googleAds: localStorage.getItem('admin_google_ads') || ''
  });

  // App State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Privacy & Consent State
  const [hasConsent, setHasConsent] = useState(!!localStorage.getItem('privacy_consent'));
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Sync State
  const [files, setFiles] = useState<FileToSync[]>([]);
  const [syncState, setSyncState] = useState<SyncState>(SyncState.IDLE);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, scanned: 0, uploaded: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Persist config
  useEffect(() => {
    localStorage.setItem('gh_token', config.token);
    localStorage.setItem('gh_repo', config.repoUrl);
  }, [config.token, config.repoUrl]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      message,
      type
    }]);
  }, []);

  const handleConnect = async () => {
    setConnectionError(null);
    if (!config.token || !config.repoUrl) {
      setConnectionError('Please enter a Token and Repository Link.');
      return;
    }

    setIsConnecting(true);
    // Sanitize inputs: remove whitespace and potential invisible characters
    const token = config.token.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    const repoUrl = config.repoUrl.trim();
    
    const gh = new GitHubService(token);

    try {
      // 1. Validate Token
      const username = await gh.validateToken();
      addLog(`Authenticated as: ${username}`, 'success');

      // 2. Validate Repo
      const repoDetails = parseRepoUrl(repoUrl);
      if (!repoDetails) throw new Error("Invalid Repository URL format.");
      
      await gh.getRepo(repoDetails.owner, repoDetails.repo);
      addLog(`Repository found: ${repoDetails.owner}/${repoDetails.repo}`, 'success');

      setIsConnected(true);
    } catch (error) {
      const msg = (error as Error).message;
      let userFriendlyMsg = msg;
      
      if (msg === 'Not Found' || msg.includes('404')) {
        userFriendlyMsg = "Repository not found. Please check the URL, or ensure your Token has 'repo' permissions (private repos require this).";
      } else if (msg.includes('Bad credentials') || msg.includes('401')) {
        userFriendlyMsg = "Invalid Token. Please check your Personal Access Token.";
      }

      setConnectionError(userFriendlyMsg);
      addLog(`Connection failed: ${msg}`, 'error');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const fileList = Array.from(event.target.files) as File[];
      
      // Get root folder name for logging purposes
      const rootFolderName = fileList[0].webkitRelativePath.split('/')[0] || 'Selected Folder';

      const syncFiles: FileToSync[] = fileList.map(f => {
        const fullPath = f.webkitRelativePath || f.name;
        // Strip the root folder name to sync contents directly (MyFolder/sub/file -> sub/file)
        const parts = fullPath.split('/');
        const relativePath = parts.length > 1 ? parts.slice(1).join('/') : fullPath;

        return {
          path: relativePath,
          file: f,
          status: 'pending'
        };
      });

      setFiles(syncFiles);
      setStats({ total: syncFiles.length, scanned: 0, uploaded: 0 });
      addLog(`Selected ${syncFiles.length} files from '${rootFolderName}'. Syncing folder contents...`, 'info');
      
      // Reset states
      setSyncState(SyncState.IDLE);
      setProgress(0);
    }
  };

  const startSync = async () => {
    if (!isConnected) return;
    
    const repoDetails = parseRepoUrl(config.repoUrl);
    if (!repoDetails) return;

    if (files.length === 0 && !config.deleteMissing) {
      addLog('No files selected.', 'warning');
      return;
    }

    setSyncState(SyncState.SCANNING);
    setProgress(0);
    setStats({ total: files.length, scanned: 0, uploaded: 0 });
    const gh = new GitHubService(config.token.replace(/[\s\u200B-\u200D\uFEFF]/g, ''));

    try {
      // 1. Get Ref & Tree
      const defaultBranch = config.branch.trim() || 'main';
      addLog(`Targeting branch: ${defaultBranch}`, 'info');

      let latestCommitSha: string | null = null;
      let baseTreeData: { tree: GitTreeItem[], truncated: boolean } = { tree: [], truncated: false };

      try {
        const ref = await gh.getRef(repoDetails.owner, repoDetails.repo, defaultBranch);
        latestCommitSha = ref.object.sha;
        baseTreeData = await gh.getTreeRecursive(repoDetails.owner, repoDetails.repo, latestCommitSha);
      } catch (e) {
        addLog(`Branch '${defaultBranch}' not found (or repo empty). Initializing fresh upload.`, 'info');
        // Repo is likely empty or branch doesn't exist. Proceed with empty baseTreeData and null latestCommitSha.
      }
      
      if (baseTreeData.truncated && config.deleteMissing) {
        addLog('Repo too large. "Delete missing" disabled safely.', 'warning');
      }

      setSyncState(SyncState.ANALYZING);

      // 2. Resolve Target Path
      const targetPrefix = config.targetPath ? config.targetPath.replace(/^\/+|\/+$/g, '') + '/' : '';
      
      // 3. Analyze Changes (Smart Sync)
      addLog('Analyzing file signatures...', 'info');
      
      const remoteFileMap = new Map<string, string>(); // path -> sha
      baseTreeData.tree.forEach(item => {
        if (item.type === 'blob') remoteFileMap.set(item.path, item.sha);
      });

      const filesToUpload: { file: FileToSync, remotePath: string, isNew: boolean }[] = [];
      const filesSkipped: string[] = [];
      const filesToDelete: string[] = [];
      const processedRemotePaths = new Set<string>();

      let analysisCount = 0;
      for (const f of files) {
        const remotePath = targetPrefix + f.path;
        const remoteSha = remoteFileMap.get(remotePath);
        
        analysisCount++;
        setStats(prev => ({ ...prev, scanned: analysisCount }));
        
        // Update progress during analysis (0-20%)
        if (files.length > 50 && analysisCount % 10 === 0) {
          setProgress(Math.round((analysisCount / files.length) * 20)); 
        }

        if (remoteSha) {
          // File exists remotely, check if changed
          processedRemotePaths.add(remotePath);
          try {
            const localSha = await computeGitBlobSha(f.file);
            if (localSha === remoteSha) {
              filesSkipped.push(remotePath);
              continue;
            }
          } catch (e) {
            console.warn("Could not compute SHA, defaulting to upload", e);
          }
          filesToUpload.push({ file: f, remotePath, isNew: false });
        } else {
          // New file
          filesToUpload.push({ file: f, remotePath, isNew: true });
        }
      }

      // Identify Deletions
      if (config.deleteMissing && !baseTreeData.truncated) {
        baseTreeData.tree.forEach(item => {
          if (item.type === 'blob') {
            if (targetPrefix && !item.path.startsWith(targetPrefix)) return;
            if (!processedRemotePaths.has(item.path)) {
              filesToDelete.push(item.path);
            }
          }
        });
      }

      addLog(`Analysis Complete: ${filesToUpload.length} to upload, ${filesToDelete.length} to delete.`, 'info');

      if (filesToUpload.length === 0 && filesToDelete.length === 0) {
        addLog('Remote is already up to date!', 'success');
        setSyncState(SyncState.SUCCESS);
        setProgress(100);
        return;
      }

      // 4. Upload Files
      setSyncState(SyncState.UPLOADING);
      const newTree: any[] = [];
      let completedOps = 0;
      const totalOps = filesToUpload.length;
      const uploadedPaths: string[] = [];

      const CHUNK_SIZE = 5;
      for (let i = 0; i < filesToUpload.length; i += CHUNK_SIZE) {
        const chunk = filesToUpload.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (item) => {
          try {
            const base64 = await readFileAsBase64(item.file.file);
            const blobSha = await gh.createBlob(repoDetails.owner, repoDetails.repo, base64);
            newTree.push({
              path: item.remotePath,
              mode: '100644',
              type: 'blob',
              sha: blobSha,
            });
            uploadedPaths.push(item.remotePath);
            
            // Log updates in yellow (warning type)
            if (!item.isNew) {
              addLog(`Updating: ${item.remotePath}`, 'warning');
            } else {
               // Optional: Log new files. Uncomment if needed, but keeping it clean for now.
               // addLog(`Uploading: ${item.remotePath}`, 'info');
            }
            
            completedOps++;
            setStats(prev => ({ ...prev, uploaded: completedOps }));
            
            // Map progress 20% -> 90%
            const uploadProgress = 20 + Math.round((completedOps / totalOps) * 70);
            setProgress(uploadProgress);
          } catch (e) {
            addLog(`Failed upload: ${item.remotePath}`, 'error');
            throw e;
          }
        }));
      }

      // 5. Construct Final Tree
      const finalTree: any[] = [...newTree]; 
      const uploadedSet = new Set(uploadedPaths);

      baseTreeData.tree.forEach(t => {
        if (t.type !== 'blob') return; 
        if (uploadedSet.has(t.path)) return; 
        if (filesToDelete.includes(t.path)) return; 
        if (targetPrefix && t.path.startsWith(targetPrefix) && !processedRemotePaths.has(t.path) && config.deleteMissing) return; 

        finalTree.push({
          path: t.path,
          mode: t.mode,
          type: t.type,
          sha: t.sha
        });
      });

      // 6. Commit
      setSyncState(SyncState.COMMITTING);
      setProgress(95);

      let commitMessage = `chore: sync ${filesToUpload.length} files`;
      if (config.autoCommitMessage) {
        const addedPaths = filesToUpload.filter(f => f.isNew).map(f => f.remotePath);
        const modifiedPaths = filesToUpload.filter(f => !f.isNew).map(f => f.remotePath);
        commitMessage = await generateCommitMessage(addedPaths, modifiedPaths, filesToDelete);
      }

      const newTreeSha = await gh.createTree(repoDetails.owner, repoDetails.repo, finalTree);
      
      // If latestCommitSha is null, it's an initial commit (no parents)
      const newCommitSha = await gh.createCommit(repoDetails.owner, repoDetails.repo, commitMessage, newTreeSha, latestCommitSha);
      
      if (latestCommitSha) {
        await gh.updateRef(repoDetails.owner, repoDetails.repo, defaultBranch, newCommitSha);
      } else {
        // Create the branch reference if it didn't exist
        await gh.createRef(repoDetails.owner, repoDetails.repo, defaultBranch, newCommitSha);
      }

      setSyncState(SyncState.SUCCESS);
      setProgress(100);
      addLog('✨ Sync completed successfully.', 'success');

    } catch (error) {
      console.error(error);
      setSyncState(SyncState.ERROR);
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  const handleBackToDashboard = () => {
    setSyncState(SyncState.IDLE);
    setFiles([]); // Optional: Clear files if you want to force fresh selection
    setStats({ total: 0, scanned: 0, uploaded: 0 });
    setLogs([]);
    setProgress(0);
  };

  const handleClearCredentials = () => {
    if (window.confirm("Are you sure you want to clear your saved credentials? You will need to re-enter your Token and URL.")) {
      localStorage.removeItem('gh_token');
      localStorage.removeItem('gh_repo');
      setConfig(prev => ({ ...prev, token: '', repoUrl: '' }));
      setIsConnected(false);
      setIsMenuOpen(false);
      setFiles([]);
      setSyncState(SyncState.IDLE);
      addLog('Credentials cleared successfully.', 'success');
    }
  };

  const handleHome = () => {
    setSyncState(SyncState.IDLE);
    setFiles([]);
    setIsMenuOpen(false);
  };

  const handleAdminClick = () => {
    setIsMenuOpen(false);
    setShowAdminLogin(true);
    setAdminPasswordInput('');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === '548413') {
      setShowAdminLogin(false);
      setShowAdminPanel(true);
    } else {
      alert("Incorrect Password");
    }
  };

  const handleAcceptConsent = () => {
    localStorage.setItem('privacy_consent', 'true');
    setHasConsent(true);
  };

  const saveAdConfig = (type: 'adsterra' | 'googleAds') => {
    if (type === 'adsterra') {
      localStorage.setItem('admin_adsterra', adConfig.adsterra);
    } else {
      localStorage.setItem('admin_google_ads', adConfig.googleAds);
    }
    alert(`${type === 'adsterra' ? 'Adsterra' : 'Google Ads'} configuration saved!`);
  };

  // Reusable Ad Components
  const AdBlock = () => (
    <div className="w-full aspect-square bg-slate-900 border-2 border-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden group shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 opacity-50"></div>
      <div className="z-10 text-center p-2">
        <p className="text-slate-700 text-[10px] font-mono font-bold tracking-widest uppercase mb-1">Advertisement</p>
        <div className="w-8 h-8 bg-slate-800 rounded-full mx-auto flex items-center justify-center">
          <span className="text-slate-600 text-[10px]">AD</span>
        </div>
      </div>
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-slate-700/50 transition-colors rounded-xl pointer-events-none"></div>
    </div>
  );

  const AdBanner = ({ label = "Advertisement", subLabel = "(728x90)" }) => (
    <div className="w-full bg-slate-900/50 border-y sm:border border-slate-800 flex justify-center py-2 px-0 sm:px-4 my-4 sm:rounded-xl overflow-hidden">
      <div className="relative w-full max-w-[728px] h-[90px] mx-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[728px] h-[90px] origin-center scale-[0.45] sm:scale-75 md:scale-100 transition-transform">
            <div className="w-full h-full bg-slate-800/50 rounded flex flex-col items-center justify-center text-slate-600 border border-slate-700 border-dashed overflow-hidden">
              {adConfig.adsterra || adConfig.googleAds ? (
                  <div className="text-xs text-center p-2 break-all text-slate-500">
                    [{label} Slot Configured]
                  </div>
              ) : (
                <>
                  <span className="text-[10px] uppercase tracking-widest font-semibold mb-1">{label}</span>
                  <span className="text-xs opacity-50">{subLabel}</span>
                </>
              )}
            </div>
        </div>
      </div>
    </div>
  );

  const StatCard = ({ label, value, subLabel }: { label: string, value: number, subLabel?: string }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
      <span className="text-3xl font-bold text-white mb-1">{value}</span>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      {subLabel && <span className="text-[10px] text-slate-600 mt-1">{subLabel}</span>}
    </div>
  );

  // --------------------------------------------------------------------------
  // VIEW: SYNC PROCESS & RESULTS
  // --------------------------------------------------------------------------
  if (syncState !== SyncState.IDLE) {
    return (
      <div className="min-h-screen bg-black text-slate-200 font-sans p-4 flex flex-col items-center">
        <div className="w-full max-w-3xl flex-1 flex flex-col">
          
          {/* Top Banner on Sync Screen */}
          <AdBanner />

          {/* Status Header */}
          <div className="mb-6 mt-2">
            <div className="flex items-center gap-3 mb-2">
              {syncState === SyncState.SUCCESS ? (
                <div className="p-2 bg-emerald-500/10 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
              ) : syncState === SyncState.ERROR ? (
                <div className="p-2 bg-red-500/10 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
              ) : (
                <div className="p-2 bg-indigo-500/10 rounded-full">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              )}
              <div>
                <h1 className={`text-xl font-bold ${
                  syncState === SyncState.SUCCESS ? 'text-emerald-400' : 
                  syncState === SyncState.ERROR ? 'text-red-400' : 'text-white'
                }`}>
                  {syncState === SyncState.SUCCESS ? 'Sync Complete' : 
                    syncState === SyncState.ERROR ? 'Sync Failed' : 'Syncing Files...'}
                </h1>
                <p className="text-xs text-slate-500">
                  {syncState === SyncState.SUCCESS 
                    ? 'All changes pushed to GitHub successfully.' 
                    : syncState === SyncState.ERROR 
                    ? 'There was a problem syncing your files.'
                    : 'Please do not close this tab.'}
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-4">
              <div 
                className={`h-full transition-all duration-300 ease-out ${
                  syncState === SyncState.SUCCESS ? 'bg-emerald-500' : 
                  syncState === SyncState.ERROR ? 'bg-red-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Progress</span>
              <span className="text-[10px] font-mono text-slate-400">{progress}%</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Total Files" value={stats.total} />
            <StatCard label="Uploaded" value={stats.uploaded} />
            <StatCard label="Scanned" value={stats.scanned} />
          </div>

          {/* Console */}
          <div className="flex-1 flex flex-col min-h-0 mb-4">
            <Logger logs={logs} />
          </div>

          {/* Ad Space Below Console */}
          <AdBanner label="Ad Space" subLabel="Below Console" />

          {/* Actions */}
          {(syncState === SyncState.SUCCESS || syncState === SyncState.ERROR) && (
            <button 
              onClick={handleBackToDashboard}
              className="w-full bg-white text-black hover:bg-slate-200 active:scale-[0.98] font-bold py-4 rounded-xl transition-all shadow-lg mb-4"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: DASHBOARD
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden flex flex-col">
      
      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-4 text-indigo-400">
              <BookOpen className="w-6 h-6" />
              <h3 className="text-xl font-bold">How to Use</h3>
            </div>
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>1. <strong className="text-white">Get a Token:</strong> Go to GitHub Developer Settings and generate a Personal Access Token (Classic) with <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">repo</code> scope.</p>
              <p>2. <strong className="text-white">Connect:</strong> Paste your Token and Repository Link (e.g., <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">username/repo</code>).</p>
              <p>3. <strong className="text-white">Select Folder:</strong> Choose a folder from your device. The app will preserve the internal structure.</p>
              <p>4. <strong className="text-white">Sync:</strong> Click "Start Sync". Changed files are updated, new files are added.</p>
            </div>
            <button 
              onClick={() => setShowHelpModal(false)}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowAdminLogin(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/10 rounded-full">
                <Lock className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Admin Access</h3>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input 
                type="password" 
                value={adminPasswordInput}
                onChange={e => setAdminPasswordInput(e.target.value)}
                placeholder="Enter Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent tracking-widest"
                autoFocus
              />
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Dashboard Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl relative my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-6 h-6 text-indigo-400" />
                <h3 className="text-xl font-bold text-white">Admin Dashboard</h3>
              </div>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Adsterra Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-300">Adsterra Configuration</label>
                  <span className="text-xs text-slate-500">Paste your script/code here</span>
                </div>
                <textarea 
                  value={adConfig.adsterra}
                  onChange={e => setAdConfig(prev => ({ ...prev, adsterra: e.target.value }))}
                  placeholder="<script>...</script>"
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
                />
                <button 
                  onClick={() => saveAdConfig('adsterra')}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors ml-auto"
                >
                  <Save className="w-4 h-4" /> Save Adsterra Config
                </button>
              </div>

              <div className="h-px bg-slate-800"></div>

              {/* Google Ads Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-300">Google AdSense Configuration</label>
                  <span className="text-xs text-slate-500">Paste your script/code here</span>
                </div>
                <textarea 
                  value={adConfig.googleAds}
                  onChange={e => setAdConfig(prev => ({ ...prev, googleAds: e.target.value }))}
                  placeholder="<script>...</script>"
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
                />
                <button 
                  onClick={() => saveAdConfig('googleAds')}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors ml-auto"
                >
                  <Save className="w-4 h-4" /> Save AdSense Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyPolicy(false)} />
      )}

      {/* Consent Banner */}
      {!hasConsent && (
        <ConsentBanner 
          onAccept={handleAcceptConsent} 
          onReadPolicy={() => setShowPrivacyPolicy(true)} 
        />
      )}

      {/* Top Banner Ad Area */}
      <AdBanner label="Top Banner" />

      {/* Main Container - Widened to max-w-3xl */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-4 relative flex-1">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 relative z-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-900/20">
              <FolderGit2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">GitSync <span className="text-slate-500 font-normal">Mobile</span></h1>
          </div>
          
          {/* Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2.5 rounded-full hover:bg-slate-800 active:scale-95 transition-all border ${isMenuOpen ? 'bg-slate-800 border-indigo-500/50 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="p-1.5 space-y-0.5">
                  <button onClick={handleHome} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors text-left">
                    <Home className="w-4 h-4 text-indigo-400" /> Home Page
                  </button>
                  <button onClick={() => { setShowHelpModal(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors text-left">
                    <HelpCircle className="w-4 h-4 text-emerald-400" /> How to use
                  </button>
                  <button onClick={() => { if(isConnected) setShowAdvancedSettings(!showAdvancedSettings); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors text-left">
                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                  </button>
                  <div className="h-px bg-slate-800 mx-2 my-1"></div>
                   <button onClick={handleAdminClick} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors text-left">
                    <UserCog className="w-4 h-4 text-amber-500" /> Admin Panel
                  </button>
                  <button onClick={() => { setShowPrivacyPolicy(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors text-left">
                    <Shield className="w-4 h-4 text-indigo-400" /> Privacy Policy
                  </button>
                  <div className="h-px bg-slate-800 mx-2 my-1"></div>
                  <button onClick={handleClearCredentials} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors text-left">
                    <Trash2 className="w-4 h-4" /> Clear Credentials
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Repository Setup Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 mb-2">
            <Github className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Repository Setup</h2>
          </div>

          <div className="space-y-6">
            {/* Inputs */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Personal Access Token
              </label>
              <input 
                type="password" 
                value={config.token}
                onChange={e => setConfig(prev => ({ ...prev, token: e.target.value }))}
                placeholder="ghp_xxxxxxxxxxxx"
                disabled={isConnected}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all placeholder:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
              />
              <p className="text-xs text-slate-500 leading-relaxed">
                Required scope: <span className="font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">repo</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Repository Link
              </label>
              <input 
                type="text" 
                value={config.repoUrl}
                onChange={e => setConfig(prev => ({ ...prev, repoUrl: e.target.value }))}
                placeholder="username/repo"
                disabled={isConnected}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all placeholder:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-400">Branch</label>
                <div className="relative">
                  <GitBranch className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-600" />
                  <input 
                    type="text" 
                    value={config.branch}
                    onChange={e => setConfig(prev => ({ ...prev, branch: e.target.value }))}
                    placeholder="main"
                    disabled={isConnected}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-3.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 shadow-inner"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-400">Target Path</label>
                <div className="relative">
                  <FolderInput className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-600" />
                  <input 
                    type="text" 
                    value={config.targetPath}
                    onChange={e => setConfig(prev => ({ ...prev, targetPath: e.target.value }))}
                    placeholder="assets"
                    disabled={isConnected}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-3.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {connectionError && (
              <div className="animate-in fade-in slide-in-from-top-2 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-red-400 mb-1">Connection Failed</p>
                  <p className="text-red-300/80 leading-relaxed">{connectionError}</p>
                </div>
              </div>
            )}

            {/* Connect Button */}
            {!isConnected && (
              <>
                <button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-2.5 group mt-4 text-base"
                >
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white/90" />
                  ) : (
                    <>
                      Connect Repository <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                {/* Ad Space Below Connect Button */}
                <AdBanner label="Ad Space" subLabel="Below Connect Button" />
              </>
            )}

            {/* Connected State */}
            {isConnected && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-6">
                
                {/* Connection Status */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                   <div className="bg-emerald-500/20 p-2 rounded-full ring-1 ring-emerald-500/30">
                     <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-base text-emerald-300 font-medium truncate">Repository Connected</p>
                     <p className="text-xs text-emerald-400/60 truncate">Ready for file selection</p>
                   </div>
                   <button 
                     onClick={() => { setIsConnected(false); setFiles([]); setLogs([]); setProgress(0); setSyncState(SyncState.IDLE); }} 
                     className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-xs text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
                   >
                     <LogOut className="w-3 h-3" /> Disconnect
                   </button>
                </div>

                {/* File Picker */}
                <div className="relative group touch-manipulation">
                  <input
                    type="file"
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div className={`
                    border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all duration-300
                    ${files.length > 0 
                      ? 'border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                      : 'border-slate-700 bg-slate-900/50 hover:border-indigo-500 hover:bg-slate-800'}
                  `}>
                    {files.length > 0 ? (
                      <>
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-1">
                          <FolderOpen className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-white text-lg font-semibold">{files.length} files selected</p>
                          <p className="text-indigo-400 text-sm mt-1 font-medium">Tap to change folder</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mb-1">
                          <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <div className="text-center">
                          <p className="text-white text-lg font-semibold group-hover:text-indigo-100">Select Folder</p>
                          <p className="text-slate-500 text-sm mt-1 max-w-[200px] mx-auto leading-tight">
                            Syncs to <span className="text-slate-300 font-mono bg-slate-800 px-1 py-0.5 rounded">{config.targetPath || '/root'}</span>
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Settings & Sync Button */}
                {files.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 space-y-5">
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors py-2"
                      >
                        <Settings className="w-3.5 h-3.5" /> 
                        <span>{showAdvancedSettings ? 'Hide Options' : 'Advanced Options'}</span>
                      </button>
                    </div>

                    {showAdvancedSettings && (
                      <div className="bg-slate-900/80 backdrop-blur-sm p-4 rounded-xl border border-slate-800 text-sm space-y-3 shadow-lg">
                          <label className="flex items-center gap-3 text-slate-300 cursor-pointer active:opacity-70">
                            <input 
                              type="checkbox" 
                              checked={config.deleteMissing}
                              onChange={e => setConfig(prev => ({ ...prev, deleteMissing: e.target.checked }))}
                              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-offset-slate-900"
                            />
                            <span>Delete remote files missing locally</span>
                          </label>
                          <div className="h-px bg-slate-800/50"></div>
                          <label className="flex items-center gap-3 text-slate-300 cursor-pointer active:opacity-70">
                            <input 
                              type="checkbox" 
                              checked={config.autoCommitMessage}
                              onChange={e => setConfig(prev => ({ ...prev, autoCommitMessage: e.target.checked }))}
                              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-offset-slate-900"
                            />
                            <span>Use AI for commit messages</span>
                          </label>
                      </div>
                    )}

                    <button
                      onClick={startSync}
                      className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-900/20 w-full py-4 rounded-xl font-bold text-base tracking-wide shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                      START SYNC
                    </button>
                    
                    {/* Ad Space Below Sync Button */}
                    <AdBanner label="Ad Space" subLabel="Below Sync Button" />

                    {/* Inline Logs (Pre-Sync) */}
                    <div className="pt-2">
                       <Logger logs={logs} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ad Grid - Always Visible now */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
           <AdBlock />
           <AdBlock />
           <AdBlock />
           <AdBlock />
           <AdBlock />
           <AdBlock />
        </div>

      </div>

      {/* Footer Links (Compliance) */}
      <footer className="w-full max-w-3xl mx-auto px-6 py-6 border-t border-slate-800/50 mt-8 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <p className="text-xs text-slate-600">© 2024 GitSync Mobile</p>
           <div className="flex items-center gap-4 text-xs">
             <button onClick={() => setShowPrivacyPolicy(true)} className="text-slate-500 hover:text-indigo-400 transition-colors">Privacy Policy</button>
             <button onClick={() => {}} className="text-slate-500 hover:text-indigo-400 transition-colors cursor-not-allowed">Terms of Service</button>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;