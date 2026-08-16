import { useState, useEffect, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;

const listeners: Set<(toast: Toast) => void> = new Set();

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  const toast: Toast = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4000);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all animate-in slide-in-from-right ${
            toast.type === 'success' ? 'bg-[#4CAF50]' : 'bg-red-500'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="ml-2 text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
