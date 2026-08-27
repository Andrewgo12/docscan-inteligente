import React from 'react';
import { Upload, Sparkles, FileText, FileSpreadsheet, Presentation, Archive } from 'lucide-react';

interface UniversalUploadZoneProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
  processingStage: string;
}

export const UniversalUploadZone: React.FC<UniversalUploadZoneProps> = ({
  onFileSelect,
  isProcessing,
  processingStage
}) => {
  return (
    <div className="hero-card" style={{ textAlign: 'center', margin: '0 auto 2.5rem auto', maxWidth: '850px' }}>
      <div style={{ display: 'inline-flex', padding: '0.9rem', borderRadius: '50%', background: 'var(--theme-light)', color: 'var(--theme-primary)', marginBottom: '1rem', border: '1px solid var(--theme-border)' }}>
        <Upload size={32} />
      </div>

      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.6rem' }}>
        Ingestión y Digitalización Universal de Archivos
      </h2>
      <p style={{ color: '#94a3b8', maxWidth: '640px', margin: '0 auto 1.8rem auto', fontSize: '0.95rem', lineHeight: '1.5' }}>
        Carga imágenes escaneadas (PNG, JPG, TIFF), PDFs, documentos de Word, hojas de cálculo de Excel, presentaciones de PowerPoint, paquetes ZIP o archivos binarios.
      </p>

      {/* Formats Pills */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.8rem' }}>
        <span className="brand-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={14} /> Word (.docx)
        </span>
        <span className="brand-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.4)' }}>
          <FileSpreadsheet size={14} /> Excel (.xlsx)
        </span>
        <span className="brand-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', background: 'rgba(248, 113, 113, 0.15)', borderColor: 'rgba(248, 113, 113, 0.4)' }}>
          <Presentation size={14} /> PowerPoint (.pptx)
        </span>
        <span className="brand-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f472b6', background: 'rgba(244, 114, 182, 0.15)', borderColor: 'rgba(244, 114, 182, 0.4)' }}>
          <FileText size={14} /> PDF & Imágenes
        </span>
        <span className="brand-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', borderColor: 'rgba(251, 191, 36, 0.4)' }}>
          <Archive size={14} /> Comprimidos ZIP
        </span>
      </div>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <input 
          type="file" 
          id="universal-file-input" 
          onChange={onFileSelect}
          style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
          disabled={isProcessing}
        />
        <button className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }} disabled={isProcessing}>
          <Sparkles size={20} />
          {isProcessing ? 'Procesando Archivo...' : 'Seleccionar o Arrastrar Documento'}
        </button>
      </div>

      {isProcessing && (
        <div style={{ marginTop: '1.8rem' }}>
          <div className="loading-orbit" />
          <p style={{ color: 'var(--theme-primary)', fontWeight: 600, fontSize: '0.95rem' }}>{processingStage}</p>
        </div>
      )}
    </div>
  );
};
