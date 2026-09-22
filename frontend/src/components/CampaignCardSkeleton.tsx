import React from 'react';

export interface CampaignCardSkeletonProps {
  count?: number;
}

export const CampaignCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs animate-pulse flex flex-col justify-between">
      <div>
        <div className="h-32 bg-slate-200" />
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 bg-slate-200 rounded w-20" />
            <div className="h-4 bg-slate-100 rounded w-16" />
          </div>
          <div className="h-5 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="p-5 pt-0 border-t border-slate-100 mt-3 pt-3 flex justify-between items-center">
        <div className="h-7 bg-slate-100 rounded w-20" />
        <div className="h-7 bg-slate-100 rounded w-24" />
      </div>
    </div>
  );
};

export const CampaignGridSkeleton: React.FC<CampaignCardSkeletonProps> = ({ count = 6 }) => {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((n) => (
        <CampaignCardSkeleton key={n} />
      ))}
    </div>
  );
};
