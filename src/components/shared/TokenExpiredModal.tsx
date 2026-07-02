import { useState, useEffect } from 'react';
import { AlertTriangle, LogOut, Clock } from 'lucide-react';

interface TokenExpiredModalProps {
  isOpen: boolean;
  onLogout: () => void;
  countdownSeconds?: number;
}

export function TokenExpiredModal({ 
  isOpen, 
  onLogout, 
  countdownSeconds = 10 
}: TokenExpiredModalProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(countdownSeconds);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto logout when countdown reaches 0
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onLogout, countdownSeconds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-white/20 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">Session Expired</h2>
          <p className="text-red-100 text-sm mt-1">Your login session has expired</p>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Your authentication token has expired. Please log in again to continue using the application.
            </p>
            
            {/* Countdown Display */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Auto logout in:</span>
              </div>
              <div className="text-3xl font-bold text-red-500">
                {countdown}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                seconds
              </div>
            </div>

            <p className="text-sm text-gray-500">
              You will be automatically logged out when the timer reaches zero, or you can logout manually now.
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <LogOut className="w-5 h-5" />
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}