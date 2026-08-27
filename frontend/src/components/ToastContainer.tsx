import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types/document';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={20} color="#34d399" />}
          {toast.type === 'warning' && <AlertCircle size={20} color="#fbbf24" />}
          {toast.type === 'error' && <AlertCircle size={20} color="#f87171" />}
          {toast.type === 'info' && <Info size={20} color="#38bdf8" />}

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>{toast.title}</p>
          </div>

          <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={16} />
          </button>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  );
};
