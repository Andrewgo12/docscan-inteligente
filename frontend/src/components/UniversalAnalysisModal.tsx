import React from 'react';
import { X, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { UniversalAnalysisResult } from '../types/document';

interface UniversalAnalysisModalProps {
  result: UniversalAnalysisResult | null;
  onClose: () => void;
}

export const UniversalAnalysisModal: React.FC<UniversalAnalysisModalProps> = ({
  result,
  onClose
}) => {
  if (!result) return null;

  const meta = result.metadata || {};
  const analysis = result.analysis || {};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: 'var(--theme-light)', color: 'var(--theme-primary)', padding: '0.6rem', borderRadius: '12px' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-heading)' }}>
                Resultados del Ingestor Universal
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Reconocimiento Ciego por Firma Binaria</span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.4rem' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--theme-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>Nombre de Archivo:</span>
                <strong style={{ color: '#f8fafc' }}>{result.filename || 'Archivo'}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>Tipo Detectado:</span>
                <strong style={{ color: 'var(--theme-primary)' }}>{meta.description || meta.file_type || 'Desconocido'}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>MIME Type:</span>
                <code style={{ color: '#38bdf8' }}>{meta.mime || 'application/octet-stream'}</code>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>Tamaño:</span>
                <span style={{ color: '#e2e8f0' }}>{meta.size_bytes ? `${(meta.size_bytes / 1024).toFixed(1)} KB` : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
              Resumen de Análisis Ejecutado:
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', background: 'rgba(15,23,42,0.6)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {analysis.executive_summary || analysis.summary || 'Archivo analizado y verificado por el orquestador maestro.'}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={onClose}>
              <CheckCircle2 size={16} /> Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
