import React, { useState } from 'react';
import { X, Layers, ChevronLeft, ChevronRight, Trash2, Download, HelpCircle, FileText, FileSpreadsheet } from 'lucide-react';
import type { DetectedField, UniversalAnalysisResult } from '../types/document';

interface InteractiveTemplateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: UniversalAnalysisResult | null;
  fields: DetectedField[];
  setFields: React.Dispatch<React.SetStateAction<DetectedField[]>>;
  onExport: (format: 'docx' | 'xlsx' | 'pdf') => void;
  addToast: (title: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

interface ManualMarking extends DetectedField {
  pageNumber: number;
  comment?: string;
  isStaticText?: boolean;
}

export const InteractiveTemplateStudioModal: React.FC<InteractiveTemplateStudioModalProps> = ({
  isOpen,
  onClose,
  analysisResult,
  fields,
  setFields,
  onExport,
  addToast
}) => {
  if (!isOpen) return null;

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, analysisResult?.analysis?.total_slides || analysisResult?.analysis?.total_sheets || 1);

  // Mouse Drag-to-Draw State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawnBox, setDrawnBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Marking Dialog Popup State
  const [pendingBox, setPendingBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newType, setNewType] = useState<'texto' | 'fecha' | 'firma' | 'casilla' | 'estatico'>('texto');

  // Interactive AI Questions (Human-in-the-Loop)
  const [aiPrompts, setAiPrompts] = useState<Array<{ id: string; x: number; y: number; width: number; height: number; suggestedType: string; question: string }>>([
    {
      id: 'ai-prompt-1',
      x: 180,
      y: 140,
      width: 220,
      height: 35,
      suggestedType: 'texto',
      question: '🤖 La IA detectó esta zona dudosa. ¿Es un campo de Texto o Fecha?'
    },
    {
      id: 'ai-prompt-2',
      x: 180,
      y: 320,
      width: 300,
      height: 60,
      suggestedType: 'firma',
      question: '🤖 ¿Esta zona inferior corresponde al Recuadro de Firma del solicitante?'
    }
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawnBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = Math.round(e.clientX - rect.left);
    const currentY = Math.round(e.clientY - rect.top);

    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const width = Math.abs(currentX - drawStart.x);
    const height = Math.abs(currentY - drawStart.y);

    setDrawnBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (isDrawing && drawnBox && drawnBox.width > 20 && drawnBox.height > 12) {
      setPendingBox({ ...drawnBox });
      setNewLabel('');
      setNewComment('');
      setNewType('texto');
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawnBox(null);
  };

  const confirmPendingBox = () => {
    if (!pendingBox) return;
    const isStatic = newType === 'estatico';
    const newField: ManualMarking = {
      id: `manual-field-${Date.now()}`,
      etiqueta: newLabel.trim() || (isStatic ? 'Texto Estático Impreso' : 'Campo Editable'),
      tipo_campo: isStatic ? 'texto' : (newType as any),
      coordenadas: { ...pendingBox },
      confianza: 1.0,
      pageNumber: currentPage,
      comment: newComment.trim(),
      isStaticText: isStatic
    };

    setFields(prev => [...prev, newField]);
    setPendingBox(null);
    addToast(isStatic ? 'Marcado como Texto Estático No Editable.' : `Campo "${newField.etiqueta}" agregado.`, 'success');
  };

  const resolveAiPrompt = (promptId: string, acceptedType: 'texto' | 'fecha' | 'firma' | 'casilla' | 'estatico') => {
    const prompt = aiPrompts.find(p => p.id === promptId);
    if (prompt) {
      if (acceptedType !== 'estatico') {
        const confirmedField: DetectedField = {
          id: `ai-confirmed-${Date.now()}`,
          etiqueta: `Campo Confirmado (${acceptedType.toUpperCase()})`,
          tipo_campo: acceptedType as any,
          coordenadas: { x: prompt.x, y: prompt.y, width: prompt.width, height: prompt.height },
          confianza: 1.0
        };
        setFields(prev => [...prev, confirmedField]);
        addToast('Respuesta de IA confirmada e integrada a la plantilla.', 'success');
      } else {
        addToast('Zona identificada como No Editable.', 'info');
      }
    }
    setAiPrompts(prev => prev.filter(p => p.id !== promptId));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '1100px', width: '95%', height: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        
        {/* Header with Page Navigator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: 'var(--theme-light)', color: 'var(--theme-primary)', padding: '0.6rem', borderRadius: '12px' }}>
              <Layers size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-heading)' }}>
                Estudio de Identificación de Plantilla Manual / Asistido
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Demarca qué es editable y qué es estático con el ratón + consultas de IA
              </span>
            </div>
          </div>

          {/* Page Selector Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.4rem 0.9rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button 
              className="btn btn-secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ padding: '0.3rem 0.6rem' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
              Página {currentPage} de {totalPages}
            </span>
            <button 
              className="btn btn-secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '0.3rem 0.6rem' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Studio Body: Left Canvas, Right AI Prompts & Field List */}
        <div style={{ flex: 1, display: 'flex', gap: '1.2rem', marginTop: '1rem', overflow: 'hidden' }}>
          
          {/* Interactive Document Page Canvas */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                🎨 Arrastra el ratón en la página para clasificar cualquier región:
              </span>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                Azul: Editable | Amarillo: Casilla | Rosa: Firma | Rojo: Estático
              </span>
            </div>

            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                flex: 1,
                position: 'relative',
                background: '#0b0f19',
                border: '2px dashed var(--theme-border)',
                borderRadius: '16px',
                overflow: 'auto',
                cursor: isDrawing ? 'crosshair' : 'default',
                userSelect: 'none',
                minHeight: '400px'
              }}
            >
              {/* Rendered Fields for current page */}
              {fields.map(field => (
                <div
                  key={field.id}
                  style={{
                    position: 'absolute',
                    left: `${field.coordenadas.x}px`,
                    top: `${field.coordenadas.y}px`,
                    width: `${field.coordenadas.width}px`,
                    height: `${field.coordenadas.height}px`,
                    border: `2px solid ${field.tipo_campo === 'firma' ? '#f472b6' : field.tipo_campo === 'casilla' ? '#fbbf24' : field.tipo_campo === 'fecha' ? '#34d399' : '#38bdf8'}`,
                    background: field.tipo_campo === 'firma' ? 'rgba(244, 114, 182, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    zIndex: 10
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'white', background: 'rgba(15,23,42,0.9)', padding: '1px 4px', borderRadius: '3px' }}>
                    {field.etiqueta}
                  </span>
                </div>
              ))}

              {/* Active Mouse Box while dragging */}
              {isDrawing && drawnBox && (
                <div style={{
                  position: 'absolute',
                  left: `${drawnBox.x}px`,
                  top: `${drawnBox.y}px`,
                  width: `${drawnBox.width}px`,
                  height: `${drawnBox.height}px`,
                  border: '2px dashed #38bdf8',
                  background: 'rgba(56, 189, 248, 0.2)',
                  borderRadius: '6px',
                  zIndex: 30
                }} />
              )}

              {/* Render AI Interactive Questions Directly on Page */}
              {aiPrompts.map(prompt => (
                <div
                  key={prompt.id}
                  style={{
                    position: 'absolute',
                    left: `${prompt.x}px`,
                    top: `${prompt.y}px`,
                    width: `${prompt.width}px`,
                    height: `${prompt.height}px`,
                    border: '2px dashed #fbbf24',
                    background: 'rgba(251, 191, 36, 0.2)',
                    borderRadius: '6px',
                    zIndex: 25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fbbf24', background: 'rgba(15,23,42,0.9)', padding: '2px 6px', borderRadius: '4px' }}>
                    ❓ ZONA DUDOSA DE IA
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar: AI Questions & Custom Marking Controls */}
          <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            
            {/* Human-in-the-Loop AI Interactive Prompts Card */}
            {aiPrompts.length > 0 && (
              <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.4)', borderRadius: '14px', padding: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
                  <HelpCircle size={18} /> Consultas de la IA (Confianza Baja)
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {aiPrompts.map(prompt => (
                    <div key={prompt.id} style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                      <p style={{ fontSize: '0.8rem', color: '#f8fafc', marginBottom: '0.6rem', lineHeight: '1.3' }}>
                        {prompt.question}
                      </p>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => resolveAiPrompt(prompt.id, 'texto')}
                          style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem' }}
                        >
                          Texto
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => resolveAiPrompt(prompt.id, 'firma')}
                          style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', color: '#f472b6' }}
                        >
                          Firma
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => resolveAiPrompt(prompt.id, 'fecha')}
                          style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', color: '#34d399' }}
                        >
                          Fecha
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => resolveAiPrompt(prompt.id, 'estatico')}
                          style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', color: '#94a3b8' }}
                        >
                          No Editable
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of Marked Fields */}
            <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                Zonas Identificadas en la Plantilla ({fields.length}):
              </span>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px' }}>
                {fields.map(f => (
                  <div key={f.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.8rem', color: '#f8fafc', display: 'block' }}>{f.etiqueta}</strong>
                      <span className={`badge badge-${f.tipo_campo}`} style={{ fontSize: '0.65rem' }}>{f.tipo_campo}</span>
                    </div>
                    <button onClick={() => setFields(prev => prev.filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Final Export Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button className="btn btn-success" onClick={() => onExport('docx')} style={{ justifyContent: 'center' }}>
                <Download size={18} /> Generar Plantilla Word (.docx)
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => onExport('xlsx')} style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}>
                  <FileSpreadsheet size={16} /> Excel (.xlsx)
                </button>
                <button className="btn btn-secondary" onClick={() => onExport('pdf')} style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}>
                  <FileText size={16} /> PDF AcroForm
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Dialog Popup when a new area is drawn with mouse */}
        {pendingBox && (
          <div className="modal-backdrop" style={{ zIndex: 1200 }}>
            <div className="modal-content" style={{ maxWidth: '420px', padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.8rem' }}>
                Clasificar Zona Seleccionada
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '0.2rem' }}>Nombre / Etiqueta del Campo:</label>
                  <input 
                    type="text"
                    placeholder="Ej: Nombre Completo, Firma Solicitante..."
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '0.2rem' }}>Tipo de Zona:</label>
                  <select 
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    <option value="texto">Editable: Texto Corto / General</option>
                    <option value="fecha">Editable: Fecha (DD/MM/AAAA)</option>
                    <option value="firma">Editable: Recuadro de Firma</option>
                    <option value="casilla">Editable: Casilla de Verificación [ ]</option>
                    <option value="estatico">Texto Estático Impreso (No Editable)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '0.2rem' }}>Comentario u Observaciones (Opcional):</label>
                  <textarea 
                    placeholder="Escribe un comentario sobre esta sección..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={2}
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setPendingBox(null)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={confirmPendingBox}>Guardar Zona</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
