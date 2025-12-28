import { Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

interface SettingsToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string;
}

export function SettingsToggle({ label, checked, onChange, tooltip }: SettingsToggleProps) {
  return (
    <label className="flex items-center justify-between py-2.5 px-4 border border-zinc-700 rounded cursor-pointer hover:bg-zinc-800/30 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-medium">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-zinc-400 hover:text-zinc-300" />
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs max-w-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
      />
    </label>
  );
}

