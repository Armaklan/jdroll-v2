import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actions = [],
  className = '',
}) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 text-center shadow-xs ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {actions.map((action, idx) => {
            const ActionIcon = action.icon;
            const isPrimary = action.variant === 'primary';
            return (
              <button
                key={idx}
                type="button"
                onClick={action.onClick}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${
                  isPrimary
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
