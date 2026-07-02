import { useNavigate } from 'react-router-dom';
import { Smartphone, LayoutGrid, ArrowRight, Zap, Shield, Globe } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center">
        {/* Logo / Brand */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-400 rounded-3xl mb-6 shadow-2xl shadow-blue-500/20">
             <LayoutGrid className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">BaRcodes</h1>
          <p className="text-xl text-slate-400 max-w-lg mx-auto leading-relaxed">
            Backbone and RMJ Cables Optic Development System
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Mobile App Option */}
            <button 
                onClick={() => navigate('/mobile/dashboard')}
                className="group relative"
            >
                <div className="absolute inset-0 bg-blue-600/20 blur-xl group-hover:bg-blue-600/30 transition duration-500 rounded-3xl" />
                <div className="relative h-full p-8 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 transform group-hover:-translate-y-2 bg-slate-800/40 backdrop-blur-xl rounded-3xl">
                    <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                        <Smartphone className="w-7 h-7 text-blue-400 group-hover:text-blue-300" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-200">Mobile App</h2>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Optimized for field surveyors and on-site engineers. Easy photo uploads, redline previews, and quick data entry.
                        </p>
                        <div className="flex items-center text-blue-400 font-bold text-sm bg-blue-500/10 py-2 px-4 rounded-lg w-fit group-hover:bg-blue-500 group-hover:text-white transition-all">
                            Launch Mobile Check <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                    </div>
                </div>
            </button>

            {/* Web Dashboard Option */}
            <button 
                onClick={() => navigate('/login')}
                className="group relative"
            >
                <div className="absolute inset-0 bg-purple-600/20 blur-xl group-hover:bg-purple-600/30 transition duration-500 rounded-3xl" />
                <div className="relative h-full p-8 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 transform group-hover:-translate-y-2 bg-slate-800/40 backdrop-blur-xl rounded-3xl">
                    <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                        <Globe className="w-7 h-7 text-purple-400 group-hover:text-purple-300" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-200">Web Dashboard</h2>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Full-featured desktop experience. Comprehensive GIS mapping, project management, analytics, and administration.
                        </p>
                        <div className="flex items-center text-purple-400 font-bold text-sm bg-purple-500/10 py-2 px-4 rounded-lg w-fit group-hover:bg-purple-500 group-hover:text-white transition-all">
                            Enter Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                    </div>
                </div>
            </button>
        </div>
        
        {/* Footer Info */}
        <div className="mt-16 grid grid-cols-3 gap-8 text-center text-slate-500 text-xs font-medium uppercase tracking-widest w-full max-w-2xl opacity-60">
            <div className="flex flex-col items-center gap-2">
                <Zap className="w-5 h-5 mb-1 text-yellow-500/50" />
                <span>Fast Performance</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Shield className="w-5 h-5 mb-1 text-emerald-500/50" />
                <span>Secure Data</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Globe className="w-5 h-5 mb-1 text-cyan-500/50" />
                <span>Real-time GIS</span>
            </div>
        </div>
      </div>
    </div>
  );
}
