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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <Icon className="w-6 h-6 text-emerald-500" />
        </div>
        {trend && (
          <span className={`text-sm ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-zinc-400 text-sm mb-1">{title}</p>
      <p className="text-3xl text-white">{value}</p>
    </div>
  );
}
