import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
}

const iconColors = {
  brand:   'bg-brand-50 text-brand-600',
  success: 'bg-green-50 text-green-600',
  warning: 'bg-amber-50 text-amber-600',
  danger:  'bg-red-50 text-red-600',
  info:    'bg-cyan-50 text-cyan-600',
};

export function StatCard({ title, value, subtitle, icon: Icon, color = 'brand' }: Props) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-surface-500">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-surface-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
