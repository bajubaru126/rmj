import { useState, useEffect } from 'react';
import { Search, Bell, Activity } from 'lucide-react';

export function TopHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format date/time: "Wed, 25 Jun 2026 · 14:32:05"
  const formatDateTime = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const day = days[date.getDay()];
    const dayNum = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}, ${dayNum} ${month} ${year} · ${hours}:${minutes}:${seconds}`;
  };

  return (
    <header
      className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 sm:px-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}
    >
      {/* Left: Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Cari project, ruas, designator..."
            className="h-8 w-64 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          />
        </div>
      </div>

      {/* Right: Sync Status, Activity, Time, Notification */}
      <div className="flex items-center gap-1">
        {/* Sync Status */}
        <div className="mr-2 hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1 lg:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Sync Aktif</span>
        </div>

        {/* Activity Icon */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition">
          <Activity className="h-4 w-4" />
        </button>



        {/* Notification Bell */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition">
          <Bell className="h-4 w-4" />
          <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#EF4444] text-[8px] font-bold text-white ring-1 ring-white">
            1
          </span>
        </button>
      </div>
    </header>
  );
}
