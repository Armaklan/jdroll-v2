import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface FeedbackAlertProps {
  type: 'success' | 'error';
  message: string;
  onClose?: () => void;
  className?: string;
}

export const FeedbackAlert: React.FC<FeedbackAlertProps> = ({
  type,
  message,
  onClose,
  className = '',
}) => {
  if (!message) return null;

  return (
    <div
      className={`border rounded-2xl p-4 flex items-start justify-between gap-3 animate-in fade-in duration-150 ${
        type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-red-50 border-red-200 text-red-900'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {type === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        )}
        <div className="text-sm font-medium">{message}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
