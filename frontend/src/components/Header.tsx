import React from 'react';
import { FileText, Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { ToastMessage } from '../types/document';

interface HeaderProps {
  unreadCount: number;
  isBellOpen: boolean;
  setIsBellOpen: (open: boolean) => void;
  notificationHistory: ToastMessage[];
  clearNotifications: () => void;
  themeClass?: string;
}

export const Header: React.FC<HeaderProps> = ({
  unreadCount,
  isBellOpen,
  setIsBellOpen,
  notificationHistory,
  clearNotifications
}) => {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-icon">
          <FileText size={28} color="#ffffff" />
        </div>
        <div>
          <h1 className="brand-title">DocScan Inteligente</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
            <span className="brand-tag">Tesis 2.0</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Visión & OCR Multi-Motor</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Bell Activity Notification Center */}
        <div style={{ position: 'relative' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsBellOpen(!isBellOpen)}
            style={{ position: 'relative', padding: '0.6rem 0.9rem' }}
            title="Centro de Notificaciones y Actividad"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {isBellOpen && (
            <div style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '320px',
              background: 'rgba(22, 27, 44, 0.98)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--theme-border)',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
              zIndex: 1100
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#f8fafc' }}>Historial de Actividad</span>
                <button onClick={clearNotifications} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>
                  Limpiar
                </button>
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {notificationHistory.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>No hay notificaciones recientes.</p>
                ) : (
                  notificationHistory.map(n => (
                    <div key={n.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: 'rgba(255,255,255,0.04)', padding: '0.6rem', borderRadius: '8px' }}>
                      {n.type === 'success' && <CheckCircle2 size={16} color="#34d399" />}
                      {n.type === 'warning' && <AlertCircle size={16} color="#fbbf24" />}
                      {n.type === 'error' && <AlertCircle size={16} color="#f87171" />}
                      {n.type === 'info' && <Info size={16} color="#38bdf8" />}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: '1.2' }}>{n.title}</p>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{n.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
