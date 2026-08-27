import React from 'react';
import { Trash2, Download, RefreshCw, FileText, FileSpreadsheet } from 'lucide-react';
import type { DetectedField } from '../types/document';

interface FieldEditorPanelProps {
  fields: DetectedField[];
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  updateFieldLabel: (id: string, label: string) => void;
  updateFieldType: (id: string, type: 'texto' | 'fecha' | 'firma' | 'casilla') => void;
  deleteField: (id: string) => void;
  exportFormat: 'docx' | 'xlsx' | 'pdf';
  setExportFormat: (format: 'docx' | 'xlsx' | 'pdf') => void;
  handleExport: () => void;
  handleSaveToDatabase: () => void;
}

export const FieldEditorPanel: React.FC<FieldEditorPanelProps> = ({
  fields,
  selectedFieldId,
  setSelectedFieldId,
  updateFieldLabel,
  updateFieldType,
  deleteField,
  exportFormat,
  setExportFormat,
  handleExport,
  handleSaveToDatabase
}) => {
  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <div className="hero-card" style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
          Editor de Campos ({fields.length})
        </h3>
        <button className="btn btn-secondary" onClick={handleSaveToDatabase} style={{ fontSize: '0.75rem', padding: '0.4rem 0.7rem' }}>
          <RefreshCw size={14} /> Guardar BD
        </button>
      </div>

      {/* Selected Field Details */}
      {selectedField ? (
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--theme-border)' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            CAMPO SELECCIONADO
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '0.2rem' }}>Etiqueta:</label>
              <input 
                type="text" 
                value={selectedField.etiqueta} 
                onChange={(e) => updateFieldLabel(selectedField.id, e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: '#white',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '0.2rem' }}>Tipo de Campo:</label>
              <select
                value={selectedField.tipo_campo}
                onChange={(e) => updateFieldType(selectedField.id, e.target.value as any)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              >
                <option value="texto">Texto</option>
                <option value="fecha">Fecha</option>
                <option value="firma">Firma</option>
                <option value="casilla">Casilla de Verificación</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Confianza: {Math.round(selectedField.confianza * 100)}%
              </span>
              <button 
                onClick={() => deleteField(selectedField.id)}
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          Haz clic en cualquier campo del lienzo para modificar sus propiedades.
        </p>
      )}

      {/* List of All Fields */}
      <div style={{ flex: 1, maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {fields.map(f => (
          <div 
            key={f.id}
            onClick={() => setSelectedFieldId(f.id)}
            style={{
              padding: '0.5rem 0.8rem',
              borderRadius: '8px',
              background: selectedFieldId === f.id ? 'var(--theme-light)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${selectedFieldId === f.id ? 'var(--theme-border)' : 'transparent'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
              {f.etiqueta || 'Campo Sin Nombre'}
            </span>
            <span className={`badge badge-${f.tipo_campo}`}>
              {f.tipo_campo}
            </span>
          </div>
        ))}
      </div>

      {/* Export Format Selector and Button */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>Formato de Exportación Final:</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${exportFormat === 'docx' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
            onClick={() => setExportFormat('docx')}
          >
            <FileText size={14} /> Word
          </button>
          <button 
            className={`btn ${exportFormat === 'xlsx' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
            onClick={() => setExportFormat('xlsx')}
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button 
            className={`btn ${exportFormat === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
            onClick={() => setExportFormat('pdf')}
          >
            <FileText size={14} /> PDF
          </button>
        </div>

        <button className="btn btn-success" onClick={handleExport} style={{ width: '100%', justifyContent: 'center' }}>
          <Download size={18} /> Descargar Plantilla Editable
        </button>
      </div>
    </div>
  );
};
