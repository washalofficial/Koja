
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Music, RotateCcw, Zap, Clock, Wand2, Image as ImageIcon, 
  ChevronLeft, Check, Scissors, Volume2, Mic, Type, Smile, 
  ArrowRight, Globe, Download, Gauge, Sparkles, Aperture,
  ZapOff, CameraOff, Play, Save, Trash2, Smartphone, Monitor, Home
} from 'lucide-react';
import { api } from '../services/api';
import { authService } from '../services/authService';

interface UploadViewProps {
  onClose: () => void;
}

type UploadStep = 'orientation' | 'camera' | 'editing' | 'posting';
type CameraMode = '60s' | '15s' | 'templates';
type Orientation = 'portrait' | 'landscape';

const UploadView: React.FC<UploadViewProps> = ({ onClose }) => {
  const [step, setStep] = useState<UploadStep>('orientation'); // Start with orientation selection
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // New Canvas for processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [useMockCamera, setUseMockCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [maxDuration, setMaxDuration] = useState(15);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [selectedMode, setSelectedMode] = useState<CameraMode>('15s');

  const [flashOn, setFlashOn] = useState(false);
  const [beautyOn, setBeautyOn] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const requestAnimationRef = useRef<number | null>(null);
  
  // Detect supported mime type
  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Browser default
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;

    const startCamera = async () => {
      // Only start camera if we are in the camera step
      if (step !== 'camera') return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) {
          setUseMockCamera(true);
          setHasPermission(true);
          showToast("Simulation Mode (API unavailable)");
        }
        return;
      }

      // We request highest resolution possible, then we crop via Canvas
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: cameraFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }, 
          audio: true 
        });
      } catch (err) {
        // Fallback to video only if audio fails
        try {
           console.warn("Audio access failed, trying video only.");
           stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: cameraFacingMode,
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }, 
            audio: false 
          });
        } catch (e) {
          if (isMounted) {
            setHasPermission(true);
            setUseMockCamera(true);
            showToast("Camera access denied. Using simulation.");
          }
          return;
        }
      }
        
      if (isMounted) {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
        setUseMockCamera(false);
      } else {
        // Cleanup if unmounted during await
        if (stream) stream.getTracks().forEach(track => track.stop());
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (requestAnimationRef.current) cancelAnimationFrame(requestAnimationRef.current);
    };
  }, [step, cameraFacingMode]);

  const handleOrientationSelect = (selected: Orientation) => {
    setOrientation(selected);
    setStep('camera');
  };

  // The Magic: Draw Video to Canvas with "Object-Cover" cropping logic
  const drawVideoToCanvas = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Target dimensions (TikTok Standard)
    const targetWidth = orientation === 'portrait' ? 720 : 1280;
    const targetHeight = orientation === 'portrait' ? 1280 : 720;
    
    // Set canvas size if distinct
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;

    // Calculate scaling to cover
    const videoRatio = video.videoWidth / video.videoHeight;
    const targetRatio = targetWidth / targetHeight;
    
    let drawWidth, drawHeight, startX, startY;

    if (videoRatio > targetRatio) {
        // Source is wider than target (e.g. Landscape Webcam -> Portrait Canvas)
        // Crop width
        drawHeight = targetHeight;
        drawWidth = targetHeight * videoRatio;
        startY = 0;
        startX = (targetWidth - drawWidth) / 2;
    } else {
        // Source is taller than target
        // Crop height
        drawWidth = targetWidth;
        drawHeight = targetWidth / videoRatio;
        startX = 0;
        startY = (targetHeight - drawHeight) / 2;
    }

    // Mirroring for user facing mode
    ctx.save();
    if (cameraFacingMode === 'user') {
       ctx.translate(targetWidth, 0);
       ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, drawWidth, drawHeight);
    ctx.restore();

    requestAnimationRef.current = requestAnimationFrame(drawVideoToCanvas);
  };

  const startRecording = () => {
    if (useMockCamera) {
      setIsRecording(true);
      return;
    }

    if (!videoRef.current?.srcObject || !canvasRef.current) {
       setUseMockCamera(true);
       setIsRecording(true);
       return;
    }

    try {
      // Start the canvas drawing loop
      drawVideoToCanvas();

      // Capture stream from canvas (30fps)
      const canvasStream = canvasRef.current.captureStream(30);
      
      // Add audio tracks from original stream if available
      const originalStream = videoRef.current.srcObject as MediaStream;
      originalStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));

      let mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      const mediaRecorder = new MediaRecorder(canvasStream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Stop drawing loop
        if (requestAnimationRef.current) cancelAnimationFrame(requestAnimationRef.current);

        const type = mimeType || 'video/webm';
        if (chunks.length > 0) {
            const blob = new Blob(chunks, { type });
            setRecordedChunks(prev => [...prev, blob]);
            setVideoBlob(blob);
        } else {
             console.warn("No data recorded");
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (e) {
      console.error("Recording failed:", e);
      setIsRecording(true);
      setUseMockCamera(true);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (useMockCamera) {
        showToast("Processing simulation...");
        try {
            const sampleUrl = orientation === 'landscape' 
              ? 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' 
              : 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
            
            const response = await fetch(sampleUrl);
            const blob = await response.blob();
            setRecordedChunks(prev => [...prev, blob]);
            setVideoBlob(blob);
        } catch (e) {
            console.error("Mock video load failed");
        }
    }

    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (selectedMode === 'templates') {
       showToast("Templates mode coming soon!");
       return; 
    }
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRecording, maxDuration]);

  const handleModeChange = (mode: CameraMode) => {
    setSelectedMode(mode);
    if (mode === '15s') setMaxDuration(15);
    if (mode === '60s') setMaxDuration(60);
    showToast(`Switched to ${mode}`);
  };

  const handleUploadClick = () => {
    if (isRecording) {
      stopRecording();
      setTimeout(() => {
          setStep('editing');
      }, 500);
      return;
    }

    if (recordedChunks.length > 0 || videoBlob) {
        setStep('editing');
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Auto-detect orientation for preview
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.videoWidth > video.videoHeight) {
          setOrientation('landscape');
        } else {
          setOrientation('portrait');
        }
        setVideoBlob(file);
        setStep('editing');
      }
      video.src = URL.createObjectURL(file);
    }
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
    showToast(flashOn ? "Flash Off" : "Flash On");
  };

  const toggleBeauty = () => {
    setBeautyOn(!beautyOn);
    showToast(beautyOn ? "Beauty Mode Off" : "Beauty Mode On");
  };

  const cycleSpeed = () => {
    const nextSpeed = speedLevel === 1 ? 2 : speedLevel === 2 ? 3 : 0.5;
    setSpeedLevel(nextSpeed === 0.5 ? 0.5 : nextSpeed);
    showToast(`Speed: ${nextSpeed === 0.5 ? '0.5x' : nextSpeed + 'x'}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }

  const handlePostVideo = async (caption: string) => {
     if (!videoBlob) return;
     const user = authService.getCurrentUser();
     if (!user) {
        showToast("Please log in to post");
        return;
     }

     setIsPosting(true);
     showToast("Uploading to backend...");

     const success = await api.uploadVideo(videoBlob, caption, user.id);
     
     setIsPosting(false);
     
     if (success) {
        showToast("Posted successfully!");
        window.dispatchEvent(new Event('storage-update')); // Trigger refresh
        setTimeout(() => onClose(), 1500);
     } else {
        showToast("Upload failed. Check console.");
     }
  };

  const handleSaveDraft = async () => {
    if (!videoBlob) return;
    showToast("Saving to Drafts...");
    await api.saveDraft(videoBlob, "Draft video");
    setTimeout(() => onClose(), 1000);
  };

  // Home Logic
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleHomeClick = () => {
     if (recordedChunks.length > 0 || videoBlob) {
        setShowExitConfirm(true);
     } else {
        onClose();
     }
  };

  const handleDiscard = () => {
     setShowExitConfirm(false);
     setVideoBlob(null);
     setRecordedChunks([]);
     setStep('camera'); // Reset to camera
  };

  // --- RENDER STEPS ---

  if (step === 'orientation') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Select Orientation</h2>
          <p className="text-gray-400 mb-8">How would you like to record your video?</p>
          
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => handleOrientationSelect('portrait')}
              className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 flex flex-col items-center gap-3 transition-all active:scale-95"
            >
              <Smartphone size={40} className="text-[#FE2C55]" />
              <div className="text-white font-semibold">Portrait</div>
              <div className="text-xs text-gray-500">9:16 (Full Screen)</div>
            </button>

            <button 
              onClick={() => handleOrientationSelect('landscape')}
              className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 flex flex-col items-center gap-3 transition-all active:scale-95"
            >
              <Monitor size={40} className="text-[#FE2C55]" />
              <div className="text-white font-semibold">Landscape</div>
              <div className="text-xs text-gray-500">16:9 (Cinematic)</div>
            </button>
          </div>
          
          <button onClick={onClose} className="mt-8 text-gray-500 hover:text-white text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  // --- Exit Confirmation Modal ---
  const ExitModal = () => (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
         <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
               <h3 className="text-lg font-bold text-gray-900 mb-2">Discard edits?</h3>
               <p className="text-sm text-gray-500">If you go back now, you'll lose all the edits you've made to this video.</p>
            </div>
            <div className="flex flex-col border-t border-gray-100 divide-y divide-gray-100">
               <button 
                 onClick={() => { handleSaveDraft(); setShowExitConfirm(false); }}
                 className="py-3.5 text-[#FE2C55] font-semibold hover:bg-gray-50 active:bg-gray-100"
               >
                 Save draft
               </button>
               <button 
                 onClick={handleDiscard}
                 className="py-3.5 text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100"
               >
                 Discard
               </button>
               <button 
                 onClick={() => setShowExitConfirm(false)}
                 className="py-3.5 text-gray-500 font-medium hover:bg-gray-50 active:bg-gray-100"
               >
                 Cancel
               </button>
            </div>
         </div>
      </div>
  );

  if (step === 'editing') {
    return (
      <>
        {showExitConfirm && <ExitModal />}
        <EditingScreen 
          onBack={() => setStep('camera')} 
          onNext={() => setStep('posting')}
          onHome={handleHomeClick}
          videoBlob={videoBlob}
          orientation={orientation}
        />
      </>
    );
  }

  if (step === 'posting') {
    return (
      <>
        {showExitConfirm && <ExitModal />}
        <PostingScreen 
          onBack={() => setStep('editing')}
          onHome={handleHomeClick}
          onPost={handlePostVideo}
          onDraft={handleSaveDraft}
          isPosting={isPosting}
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden font-sans">
      <input 
        type="file" 
        ref={fileInputRef}
        accept="video/*" 
        className="hidden" 
        onChange={handleFileChange}
      />
      
      {toastMessage && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold z-[60] animate-fade-in-down pointer-events-none whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 z-0 bg-gray-900 flex items-center justify-center">
        {/* We use the VIDEO tag for Preview (CSS cropped), but record from CANVAS */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full transform ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''} ${(!hasPermission || useMockCamera) ? 'hidden' : 'block'} ${orientation === 'landscape' ? 'object-contain' : 'object-cover'}`} 
        />

        {!hasPermission && (
          <div className="absolute inset-0 flex items-center justify-center h-full text-white bg-gray-900 z-20">
             <p className="animate-pulse">Initializing Camera...</p>
          </div>
        )}

        {hasPermission && useMockCamera && (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-gray-800 via-gray-900 to-black flex flex-col items-center justify-center text-white/30 z-10">
            <CameraOff size={64} className="mb-4 opacity-50" />
            <p className="font-semibold">Simulated Camera Mode</p>
            <p className="text-xs mt-2 text-white/20">Click Record to simulate {orientation} recording</p>
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      {duration > 0 && (
         <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-500/30 z-20">
           <div 
             className="h-full bg-[#FE2C55] transition-all duration-100 ease-linear" 
             style={{ width: `${(duration / maxDuration) * 100}%` }}
           />
         </div>
      )}

      {/* Main UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none">
        <div className="pt-6 px-4 flex justify-between items-start pointer-events-auto">
          <button onClick={onClose} className="text-white drop-shadow-lg p-2 active:scale-90 transition-transform">
            <X size={28} />
          </button>
          <div className="bg-black/50 backdrop-blur-md text-white px-4 py-1.5 rounded-full flex items-center gap-2 cursor-pointer border-t border-white/10 shadow-lg active:scale-95 transition-transform">
            <Music size={14} />
            <span className="text-sm font-semibold">Add sound</span>
          </div>
          <div className="w-8"></div>
        </div>

        <div className="absolute right-3 top-16 flex flex-col items-center gap-6 pointer-events-auto z-20">
          <SidebarTool icon={<RotateCcw size={26} strokeWidth={1.5} />} label="Flip" onClick={() => setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user')} />
          <SidebarTool icon={<Gauge size={26} strokeWidth={1.5} />} label="Speed" isActive={speedLevel !== 1} onClick={cycleSpeed} />
          <SidebarTool icon={<Sparkles size={26} strokeWidth={1.5} />} label="Beauty" isActive={beautyOn} onClick={toggleBeauty} />
          <SidebarTool icon={<Aperture size={26} strokeWidth={1.5} />} label="Filters" onClick={() => showToast("Filters Menu")} />
          <SidebarTool icon={<Clock size={26} strokeWidth={1.5} />} label="Timer" onClick={() => showToast("Timer set: 3s")} />
          <SidebarTool icon={flashOn ? <Zap size={26} strokeWidth={1.5} className="fill-yellow-400 text-yellow-400" /> : <ZapOff size={26} strokeWidth={1.5} />} label="Flash" isActive={flashOn} onClick={toggleFlash} />
        </div>

        <div className="w-full pb-8 pt-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-auto">
          <div className="flex items-center justify-between px-10 mb-8 relative">
            <div className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition-transform" onClick={() => showToast("Effects Gallery")}>
               <div className="w-10 h-10 rounded-xl border-2 border-transparent bg-yellow-100/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                 <div className="w-8 h-8 rounded-lg bg-[#F1C40F] flex items-center justify-center">
                    <Wand2 size={20} className="text-white" />
                 </div>
               </div>
               <span className="text-[11px] font-medium text-white drop-shadow-md">Effects</span>
            </div>

            <div className="relative cursor-pointer transition-transform active:scale-95" onClick={toggleRecording}>
              <div className={`rounded-full border-[5px] border-white/40 transition-all duration-300 ${isRecording ? 'w-24 h-24 scale-110' : 'w-20 h-20'}`}></div>
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FE2C55] rounded-full transition-all duration-300 shadow-lg ${isRecording ? 'w-8 h-8 rounded-md' : 'w-16 h-16'}`}></div>
            </div>

            <div className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition-transform" onClick={handleUploadClick}>
               {(recordedChunks.length > 0 || videoBlob) ? (
                 <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-[#FE2C55] flex items-center justify-center animate-pulse">
                      <Check size={20} className="text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-white">Done</span>
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-lg border-2 border-white/30 bg-black/40 flex items-center justify-center overflow-hidden">
                      <ImageIcon size={20} className="text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-white drop-shadow-md">Upload</span>
                 </div>
               )}
            </div>
          </div>

          <div className="flex justify-center items-center gap-6 text-[13px] font-semibold text-white/50 pointer-events-auto z-30">
             <button onClick={() => handleModeChange('60s')} className={`transition-colors py-1 ${selectedMode === '60s' ? 'text-white bg-gray-700/50 px-3 rounded-full' : ''}`}>60s</button>
             <button onClick={() => handleModeChange('15s')} className={`transition-colors py-1 ${selectedMode === '15s' ? 'text-white bg-gray-700/50 px-3 rounded-full' : ''}`}>15s</button>
             <button onClick={() => handleModeChange('templates')} className={`transition-colors py-1 ${selectedMode === 'templates' ? 'text-white bg-gray-700/50 px-3 rounded-full' : ''}`}>Templates</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... SidebarTool Component ...
interface SidebarToolProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

const SidebarTool: React.FC<SidebarToolProps> = ({ icon, label, onClick, isActive = false }) => (
  <button className="flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-105 active:scale-90 outline-none" onClick={onClick}>
     <div className={`drop-shadow-lg filter ${isActive ? 'text-yellow-400' : 'text-white'}`}>{icon}</div>
     <span className={`text-[10px] font-semibold drop-shadow-md tracking-wide ${isActive ? 'text-yellow-400' : 'text-white'}`}>{label}</span>
  </button>
);

// ... EditingScreen Component ...
const EditingScreen = ({ onBack, onNext, onHome, videoBlob, orientation }: { onBack: () => void, onNext: () => void, onHome: () => void, videoBlob: Blob | null, orientation: Orientation }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  
  // Editing Tools State
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [volume, setVolume] = useState(100);
  const [addedText, setAddedText] = useState<string | null>(null);
  const [stickers, setStickers] = useState<string[]>([]);
  const [showToast, setShowToast] = useState<string | null>(null);
  
  const togglePlay = () => {
    if(!videoRef.current) return;
    if(isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration || 1;
    const startTime = (trimStart / 100) * duration;
    const endTime = (trimEnd / 100) * duration;
    if (videoRef.current.currentTime >= endTime) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
    }
  };

  useEffect(() => {
    if(videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);

  const displayToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans">
       {showToast && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold z-[60] pointer-events-none">
            {showToast}
          </div>
       )}

       {/* Text Input Overlay */}
       {activeTool === 'text' && (
         <div className="absolute inset-0 bg-black/60 z-40 flex flex-col items-center justify-center">
            <input 
              autoFocus
              placeholder="Type your text..."
              className="bg-transparent text-white text-3xl font-bold text-center outline-none border-b-2 border-white/50 pb-2 mb-4 w-3/4"
              onKeyDown={(e) => {
                if(e.key === 'Enter') {
                   setAddedText(e.currentTarget.value);
                   setActiveTool(null);
                }
              }}
            />
            <p className="text-white/70 text-sm">Press Enter to add</p>
            <button onClick={() => setActiveTool(null)} className="absolute top-4 right-4 text-white"><X size={32}/></button>
         </div>
       )}

       {/* Sticker Picker Overlay */}
       {activeTool === 'stickers' && (
         <div className="absolute bottom-0 w-full bg-white rounded-t-xl z-40 p-4 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-800">Add Sticker</h3>
               <button onClick={() => setActiveTool(null)}><X className="text-gray-500"/></button>
            </div>
            <div className="grid grid-cols-5 gap-4 text-3xl">
               {['🔥', '😂', '😍', '🎉', '👍', '👀', '✨', '😎', '💯', '❤️'].map(emoji => (
                 <button key={emoji} onClick={() => { setStickers([...stickers, emoji]); setActiveTool(null); }} className="hover:scale-125 transition-transform">
                    {emoji}
                 </button>
               ))}
            </div>
         </div>
       )}

       <div className="flex-1 relative md:my-4 md:rounded-xl overflow-hidden md:mx-auto md:max-w-md w-full bg-gray-900">
          <video 
            ref={videoRef}
            src={videoBlob ? URL.createObjectURL(videoBlob) : ""}
            className={`w-full h-full bg-black ${orientation === 'portrait' ? 'object-cover' : 'object-contain'}`}
            autoPlay loop playsInline
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
          />

          {/* Render Overlays */}
          {addedText && (
            <div className="absolute top-1/3 w-full text-center pointer-events-none">
               <span className="bg-white/90 text-black px-4 py-2 text-xl font-bold rounded-lg shadow-lg inline-block">
                 {addedText}
               </span>
            </div>
          )}
          {stickers.map((s, i) => (
            <div key={i} className="absolute text-5xl pointer-events-none" style={{ top: `${20 + i*10}%`, left: `${20 + i*15}%`, transform: `rotate(${i % 2 === 0 ? '10deg' : '-10deg'})` }}>
               {s}
            </div>
          ))}

          {/* Volume Slider Overlay */}
          {activeTool === 'volume' && (
             <div className="absolute right-16 top-20 bg-black/60 p-3 rounded-lg z-30 flex flex-col items-center gap-2 animate-fade-in">
                <span className="text-white text-xs font-bold">{volume}%</span>
                <input 
                  type="range" 
                  min="0" max="100" 
                  {...({ orient: "vertical" } as any)}
                  className="h-32 w-1 accent-[#FE2C55] appearance-auto"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                />
             </div>
          )}

          <div className="absolute top-6 left-4 z-20 flex gap-4">
             <button onClick={onBack}><ChevronLeft size={32} className="text-white drop-shadow-md" /></button>
             <button onClick={onHome}><Home size={28} className="text-white drop-shadow-md" /></button>
          </div>
          
          <div className="absolute top-6 right-4 flex flex-col gap-6 items-end z-20 pointer-events-auto">
             <SidebarTool icon={<Scissors size={24} />} label="Adjust" onClick={() => displayToast("Use slider below to trim")} />
             <SidebarTool icon={<Volume2 size={24} />} label="Volume" isActive={activeTool === 'volume'} onClick={() => setActiveTool(activeTool === 'volume' ? null : 'volume')} />
             <SidebarTool icon={<Mic size={24} />} label="Voice" onClick={() => displayToast("Voiceover recording active (mock)")} />
             <SidebarTool icon={<Type size={24} />} label="Text" onClick={() => setActiveTool('text')} />
             <SidebarTool icon={<Smile size={24} />} label="Stickers" onClick={() => setActiveTool('stickers')} />
             {addedText && <SidebarTool icon={<Trash2 size={24} />} label="Clear" onClick={() => { setAddedText(null); setStickers([]); }} />}
          </div>
          
          {!isPlaying && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Play size={48} className="fill-white/50 text-white/50" /></div>}
          
          <div className="absolute bottom-8 left-0 right-0 px-4 pointer-events-auto bg-gradient-to-t from-black/80 to-transparent pb-4">
             <div className="mb-6 px-2">
                <div className="relative h-12 bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                   <div className="absolute inset-0 flex opacity-50">
                      {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="flex-1 bg-gray-700 border-r border-gray-600" />)}
                   </div>
                   <div className="absolute top-0 bottom-0 bg-[#FE2C55]/20 border-l-4 border-r-4 border-[#FE2C55]" style={{ left: `${trimStart}%`, right: `${100 - trimEnd}%` }}></div>
                   <input type="range" min="0" max="100" value={trimStart} onChange={(e) => setTrimStart(Math.min(parseInt(e.target.value), trimEnd - 10))} className="absolute inset-0 w-full opacity-0 cursor-ew-resize z-20" />
                   <input type="range" min="0" max="100" value={trimEnd} onChange={(e) => setTrimEnd(Math.max(parseInt(e.target.value), trimStart + 10))} className="absolute inset-0 w-full opacity-0 cursor-ew-resize z-20" />
                </div>
             </div>
             <div className="flex justify-between items-center">
                <div className="text-white text-xs font-medium opacity-80 bg-gray-800/50 px-3 py-2 rounded">Drafts</div>
                <button onClick={onNext} className="bg-[#FE2C55] text-white px-8 py-3 rounded-full font-semibold text-sm flex items-center gap-1 hover:bg-[#E0264A] transition-colors">Next <ArrowRight size={16} /></button>
             </div>
          </div>
       </div>
    </div>
  );
}

const PostingScreen = ({ onBack, onPost, onDraft, onHome, isPosting }: { onBack: () => void, onPost: (caption: string) => void, onDraft: () => void, onHome: () => void, isPosting: boolean }) => {
  const [caption, setCaption] = useState('');
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col md:max-w-md md:mx-auto font-sans">
       <div className="bg-white px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10">
          <div className="flex gap-4">
              <button onClick={onBack}><ChevronLeft size={28} className="text-gray-800" /></button>
              <button onClick={onHome}><Home size={24} className="text-gray-800" /></button>
          </div>
          <h2 className="font-bold text-lg text-black">Post</h2>
          <div className="w-6" /> 
       </div>
       <div className="flex-1 overflow-y-auto">
          <div className="p-4 flex gap-4 border-b border-gray-100 bg-white">
              <div className="flex-1">
                <textarea placeholder="Describe your video..." className="w-full h-24 resize-none outline-none text-sm text-gray-800 placeholder:text-gray-400" autoFocus value={caption} onChange={(e) => setCaption(e.target.value)} />
              </div>
              <div className="w-24 h-32 bg-gray-900 rounded-sm"></div>
          </div>
       </div>
       <div className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
           <div className="flex items-center gap-3">
              <div onClick={onDraft} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 p-3 rounded-lg text-gray-700 font-semibold text-sm cursor-pointer hover:bg-gray-50 transition-colors"><Download size={18} /> Drafts</div>
              <div onClick={() => !isPosting && onPost(caption)} className={`flex-1 flex items-center justify-center gap-2 bg-[#FE2C55] p-3 rounded-lg text-white font-semibold text-sm cursor-pointer hover:bg-[#E0264A] transition-colors ${isPosting ? 'opacity-50' : ''}`}>
                 {isPosting ? 'Posting...' : 'Post'}
              </div>
           </div>
       </div>
    </div>
  );
}

export default UploadView;