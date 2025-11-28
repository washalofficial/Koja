import React, { useState } from 'react';
import { Upload, X, Film, Music as MusicIcon, CheckCircle } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    // Simulate API call
    setTimeout(() => {
      setUploading(false);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 md:rounded-lg overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Upload Video</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
          <X className="text-gray-800" />
        </button>
      </div>

      {!success ? (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full flex-1">
          <div 
            className={`border-4 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors min-h-[300px]
              ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <Film size={48} className="text-red-500 mb-4" />
                <p className="font-semibold text-lg text-gray-700">{file.name}</p>
                <p className="text-sm text-gray-500 mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <>
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <Upload size={32} className="text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Select video to upload</h3>
                <p className="text-gray-500 mb-6 text-sm">Or drag and drop a file <br/> MP4 or WebM (720x1280 recommended)</p>
                <label className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-md cursor-pointer transition-colors">
                  Select File
                  <input type="file" className="hidden" accept="video/mp4,video/webm" onChange={handleFileChange} />
                </label>
              </>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-gray-900" 
                placeholder="#SimosaTok #Funny"
              />
            </div>
            
            <div className="flex gap-4">
               <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Who can view this video</label>
                <select className="w-full border border-gray-300 rounded-md p-2 text-gray-900 bg-white">
                  <option>Public</option>
                  <option>Friends</option>
                  <option>Private</option>
                </select>
               </div>
               <div className="flex-1">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Allow Duet / Stitch</label>
                 <div className="flex items-center mt-2 gap-4">
                   <label className="flex items-center gap-2 text-sm text-gray-600">
                     <input type="checkbox" className="rounded text-red-500" defaultChecked /> Duet
                   </label>
                   <label className="flex items-center gap-2 text-sm text-gray-600">
                     <input type="checkbox" className="rounded text-red-500" defaultChecked /> Stitch
                   </label>
                 </div>
               </div>
            </div>

            <button 
              disabled={!file || uploading}
              onClick={handleUpload}
              className={`w-full py-3 rounded-md font-bold text-white transition-all mt-4
                ${!file || uploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg'}`}
            >
              {uploading ? 'Compressing & Uploading...' : 'Post Video'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload Successful!</h3>
          <p className="text-gray-500">Your video is being processed and will appear on your profile shortly.</p>
        </div>
      )}
    </div>
  );
};

export default UploadModal;