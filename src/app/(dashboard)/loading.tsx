import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="w-full h-full min-h-[75vh] flex flex-col space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Sleek Top Shimmering Progress Bar (Linear/GitHub style) */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-blue-100 overflow-hidden z-[9999]">
        <div className="h-full bg-blue-600 rounded-full w-1/3 animate-[shimmer-bar_1.5s_infinite_linear]" style={{
          backgroundImage: 'linear-gradient(90deg, #2563EB 0%, #3B82F6 50%, #2563EB 100%)',
          backgroundSize: '200% 100%',
        }} />
      </div>

      {/* 2. Shimmering Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          {/* Shimmering Title */}
          <div className="h-8 w-48 bg-slate-200/70 rounded-lg animate-pulse" />
          {/* Shimmering Subtitle */}
          <div className="h-4 w-72 bg-slate-200/50 rounded-lg animate-pulse" />
        </div>
        {/* Shimmering Top Action Button */}
        <div className="h-10 w-36 bg-slate-200/60 rounded-xl animate-pulse shrink-0" />
      </div>

      {/* 3. Shimmering KPI Stat Cards (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-200/60 rounded animate-pulse" />
              <div className="w-8 h-8 rounded-lg bg-slate-200/40 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-8 w-24 bg-slate-200/70 rounded-lg animate-pulse" />
              <div className="h-3.5 w-44 bg-slate-200/40 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. Shimmering Heavy Data Grid / Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1">
        {/* Table Toolbar Shimmer */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="h-10 w-full md:w-72 bg-slate-200/60 rounded-xl animate-pulse" />
          <div className="flex gap-2 w-full md:w-auto">
            <div className="h-10 w-24 bg-slate-200/40 rounded-xl animate-pulse" />
            <div className="h-10 w-24 bg-slate-200/40 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Table Rows Shimmer */}
        <div className="divide-y divide-slate-100 p-4 space-y-4">
          {[1, 2, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between py-2 gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-200/50 animate-pulse shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-4 w-1/3 bg-slate-200/70 rounded animate-pulse" />
                  <div className="h-3 w-1/4 bg-slate-200/40 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-20 bg-slate-200/50 rounded animate-pulse shrink-0" />
              <div className="h-6 w-16 bg-slate-200/40 rounded-full animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Center Floating Satisfying Shimmer Indicator */}
      <div className="fixed bottom-6 right-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-center text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <span className="text-xs font-semibold text-slate-600 font-sans tracking-wide">
          Syncing Operations...
        </span>
      </div>

    </div>
  );
}
