import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-zinc-900/50 rounded-xl p-4 lg:p-6 hover:bg-zinc-900 transition-colors">
      <div className="flex items-start justify-between mb-3 lg:mb-4">
        <div className="p-1.5 lg:p-2 bg-emerald-500/10 rounded-lg">
          <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />
        </div>
        {trend && (
          <span className={`text-xs lg:text-sm ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-zinc-400 text-xs lg:text-sm mb-1">{title}</p>
      <p className="text-xl lg:text-3xl text-white">{value}</p>
    </div>
  );
}
