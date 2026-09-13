import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionPlaceholderPageProps {
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  onNavigateHome: () => void;
}

export const SectionPlaceholderPage: React.FC<SectionPlaceholderPageProps> = ({
  title,
  category,
  description,
  icon: Icon,
  onNavigateHome,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-6 border border-indigo-100 shadow-inner">
          <Icon className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold mb-4 border border-slate-200">
          <span>{category}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
          {title}
        </h1>

        <p className="text-slate-600 max-w-lg mx-auto text-sm sm:text-base mb-8">
          {description}
        </p>

        <div className="inline-block bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs sm:text-sm text-amber-800 mb-8 max-w-md">
          Cette section sera implémentée lors des prochaines étapes de la refonte selon les spécifications.
        </div>

        <div>
          <button
            onClick={onNavigateHome}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            Retourner à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};
