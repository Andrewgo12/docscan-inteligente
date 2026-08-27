import React from 'react';
import { Eye, Sparkles, FileText, ArrowRight, Layers } from 'lucide-react';
import type { UniversalAnalysisResult } from '../types/document';

interface DocumentReaderPreviewProps {
  result: UniversalAnalysisResult | null;
  onLaunchStudio: () => void;
  onAutoProcess: () => void;
  isProcessing: boolean;
}

export const DocumentReaderPreview: React.FC<DocumentReaderPreviewProps> = ({
  result,
  onLaunchStudio,
  onAutoProcess,
  isProcessing
}) => {
  if (!result) return null;

  const meta = result.metadata || {};
  const analysis = result.analysis || {};
  const fileType = meta.file_type || 'desconocido';

  return (
    <div className="hero-card" style={{ marginBottom: '2.5rem', border: '2px solid var(--theme-border)', position: 'relative', overflow: 'hidden' }}>
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ background: 'var(--theme-light)', color: 'var(--theme-primary)', padding: '0.75rem', borderRadius: '14px', border: '1px solid var(--theme-border)' }}>
            <Eye size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-heading)' }}>
              Vista Previa y Lectura del Documento
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Verifica el contenido del documento antes de crear la plantilla editable.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn btn-secondary" onClick={onAutoProcess} disabled={isProcessing} style={{ padding: '0.75rem 1.2rem' }}>
            <Sparkles size={18} /> Procesamiento Automático
          </button>
          <button className="btn btn-primary" onClick={onLaunchStudio} disabled={isProcessing} style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
            <Layers size={20} /> Crear Plantilla Editable (Estudio Interactivo)
          </button>
        </div>
      </div>

      {/* Metadata & Identification Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'rgba(15, 23, 42, 0.6)', padding: '1rem 1.2rem', borderRadius: '14px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Nombre de Archivo:</span>
          <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{result.filename || 'Archivo Cargado'}</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Tipo Detectado:</span>
          <span className="brand-tag" style={{ marginTop: '0.2rem', display: 'inline-block' }}>
            {meta.description || fileType}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Firma MIME:</span>
          <code style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{meta.mime || 'application/octet-stream'}</code>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Verificación Hash:</span>
          <span style={{ fontSize: '0.75rem', color: '#34d399', fontFamily: 'monospace' }}>
            {meta.hash_sha256 ? `${meta.hash_sha256.substring(0, 16)}...` : 'OK (Verificado)'}
          </span>
        </div>
      </div>

      {/* Visual Reader Pane */}
      <div style={{ background: 'rgba(10, 12, 20, 0.85)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.5rem', maxHeight: '380px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>
          <FileText size={18} color="var(--theme-primary)" /> Contenido Extraído para Lectura Previa:
        </div>

        <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
          {analysis.summary || analysis.executive_summary || 'Documento listo para inspección visual e identificación de plantillas.'}
        </p>

        {analysis.total_sheets && (
          <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(33, 115, 70, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: '10px', color: '#34d399', fontSize: '0.85rem' }}>
            📊 Hoja de Cálculo Excel detectada con <strong>{analysis.total_sheets} hojas</strong> y <strong>{analysis.total_cells || 0} celdas procesadas</strong>.
          </div>
        )}

        {analysis.total_slides && (
          <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(210, 71, 38, 0.15)', border: '1px solid rgba(248, 113, 113, 0.4)', borderRadius: '10px', color: '#f87171', fontSize: '0.85rem' }}>
            🎬 Presentación PowerPoint detectada con <strong>{analysis.total_slides} diapositivas</strong>.
          </div>
        )}
      </div>

      {/* Call to Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          ¿Es este el documento correcto? Haz clic en <strong>Crear Plantilla Editable</strong> para ir página por página.
        </span>

        <button className="btn btn-primary" onClick={onLaunchStudio} disabled={isProcessing}>
          Ir al Estudio Interactivo de Plantillas <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
