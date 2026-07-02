import { TrendingUp, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { ProjectLocation } from '../../types/map';

interface MapBottomBarProps {
  projects: ProjectLocation[];
}

export function MapBottomBar({ projects }: MapBottomBarProps) {
  // Calculate overall statistics
  const totalBudget = projects.reduce((sum, p) => sum + p.details.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.details.spent, 0);
  const totalTeam = projects.reduce((sum, p) => sum + p.details.team, 0);
  const totalIssues = projects.reduce((sum, p) => sum + (p.stats?.issues || 0), 0);
  const avgProgress = projects.reduce((sum, p) => sum + p.details.progress, 0) / projects.length;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toFixed(1)}M`;
    }
    return `Rp ${(amount / 1000000).toFixed(0)}Jt`;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
      <div className="px-6 py-4">
        <div className="grid grid-cols-5 gap-6">
          {/* Average Progress */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Rata-rata Progress</p>
              <p className="text-xl font-bold text-gray-900">{avgProgress.toFixed(1)}%</p>
            </div>
          </div>

          {/* Total Budget */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Total Anggaran</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
            </div>
          </div>

          {/* Total Spent */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Total Terpakai</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
            </div>
          </div>

          {/* Total Team */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Total Tim</p>
              <p className="text-xl font-bold text-gray-900">{totalTeam} Orang</p>
            </div>
          </div>

          {/* Total Issues */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${totalIssues > 10 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500'} rounded-lg flex items-center justify-center shadow-lg`}>
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Total Issues</p>
              <p className={`text-xl font-bold ${totalIssues > 10 ? 'text-red-600' : 'text-gray-900'}`}>
                {totalIssues}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Overall Budget Usage</span>
            <span className="font-semibold">{((totalSpent / totalBudget) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500 rounded-full transition-all duration-1000 relative overflow-hidden"
              style={{ width: `${(totalSpent / totalBudget) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}
