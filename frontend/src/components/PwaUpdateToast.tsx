import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function PwaUpdateToast() {
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swScriptUrl, registration) {
      if (!registration) return;
      intervalRef.current = setInterval(() => {
        registration.update().catch(() => {});
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl flex items-start gap-3 animate-in fade-in duration-150">
      <RefreshCw className="w-5 h-5 text-indigo-400 shrink-0 mt-1" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-100">Nouvelle version disponible</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Une mise à jour de l'application a été installée. Rafraîchis pour en profiter.
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="text-sm font-medium px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
        >
          Rafraîchir
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg cursor-pointer"
          title="Plus tard"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
