
import React, { useState } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let result;
    if (isLogin) {
      result = await authService.login(email, password);
    } else {
      if (!username) {
        setError("Username is required");
        setLoading(false);
        return;
      }
      result = await authService.signup(email, password, username);
    }

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  };

  const fillDemo = () => {
    setEmail('washal.official1@gmail.com');
    setPassword('746860');
    setUsername('Jani brand');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[400px] rounded-lg overflow-hidden relative shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>

        <div className="p-10 pb-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Log in to Simosa Tok' : 'Sign up for Simosa Tok'}
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            Manage your account, check notifications, comment on videos, and more.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {!isLogin && (
              <div>
                 <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Username</label>
                 <input 
                   type="text" 
                   required
                   placeholder="e.g. Jani Brand"
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-3 outline-none focus:border-gray-400 transition-colors text-black placeholder-gray-500"
                 />
              </div>
            )}

            <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
               <input 
                 type="email" 
                 required
                 placeholder="Email address"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-3 outline-none focus:border-gray-400 transition-colors text-black placeholder-gray-500"
               />
            </div>

            <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
               <div className="relative">
                 <input 
                   type={showPassword ? "text" : "password"} 
                   required
                   placeholder="Password"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-3 outline-none focus:border-gray-400 transition-colors pr-10 text-black placeholder-gray-500"
                 />
                 <button 
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                 >
                   {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                 </button>
               </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-xs p-3 rounded-md font-medium">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full bg-[#FE2C55] hover:bg-[#E0264A] text-white font-bold py-3.5 rounded-md transition-all active:scale-[0.98] flex items-center justify-center ${loading ? 'opacity-70' : ''}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
          </form>

          {/* Quick Demo Button (Hidden convenience) */}
          <div className="mt-4 flex justify-center">
            <button onClick={fillDemo} className="text-xs text-gray-300 hover:text-[#FE2C55]">
               Autofill Jani Brand Creds
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-100 p-4 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-[#FE2C55] font-bold ml-1 hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
