import { LucideIcon } from 'lucide-react';

interface SettingsSectionHeaderProps {
  icon: LucideIcon;
  title: string;
}

export function SettingsSectionHeader({ icon: Icon, title }: SettingsSectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <Icon className="w-5 h-5 text-emerald-500" />
      <h2 className="text-xl font-semibold text-white">{title}</h2>
    </div>
  );
}

