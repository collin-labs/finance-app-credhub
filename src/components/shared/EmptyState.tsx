import { LucideIcon, Inbox } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-surface-400" />
      </div>
      <h3 className="text-sm font-semibold text-surface-700 mb-1">{title}</h3>
      {description && <p className="text-xs text-surface-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
