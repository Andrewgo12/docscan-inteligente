import React from 'react';
import type { DetectedField } from '../types/document';

interface DocumentCanvasViewerProps {
  fields: DetectedField[];
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  isDrawing: boolean;
  drawnBox: { x: number; y: number; width: number; height: number } | null;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;
}

export const DocumentCanvasViewer: React.FC<DocumentCanvasViewerProps> = ({
  fields,
  selectedFieldId,
  setSelectedFieldId,
  isDrawing,
  drawnBox,
  onMouseDown,
  onMouseMove,
  onMouseUp
}) => {
  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'texto': return 'rgba(56, 189, 248, 0.4)';
      case 'fecha': return 'rgba(52, 211, 153, 0.4)';
      case 'firma': return 'rgba(244, 114, 182, 0.4)';
      case 'casilla': return 'rgba(251, 191, 36, 0.4)';
      default: return 'rgba(139, 92, 246, 0.4)';
    }
  };

  return (
    <div className="hero-card" style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
          Lienzo del Documento Digitalizado
        </h3>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          💡 Arrastra el ratón para trazar un nuevo campo manualmente
        </span>
      </div>

      <div 
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '520px',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.5) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          border: '2px dashed var(--border-color)',
          borderRadius: '16px',
          overflow: 'hidden',
          cursor: isDrawing ? 'crosshair' : 'default',
          userSelect: 'none'
        }}
      >
        {/* Rendered Bounding Boxes */}
        {fields.map(field => {
          const isSelected = selectedFieldId === field.id;
          const borderColor = isSelected ? '#ffffff' : getBadgeColor(field.tipo_campo);
          return (
            <div
              key={field.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFieldId(field.id);
              }}
              style={{
                position: 'absolute',
                left: `${field.coordenadas.x}px`,
                top: `${field.coordenadas.y}px`,
                width: `${field.coordenadas.width}px`,
                height: `${field.coordenadas.height}px`,
                border: `2px solid ${borderColor}`,
                background: isSelected ? 'rgba(139, 92, 246, 0.25)' : getBadgeColor(field.tipo_campo).replace('0.4', '0.1'),
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 0 15px rgba(139, 92, 246, 0.8)' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                padding: '2px 4px',
                zIndex: isSelected ? 20 : 10
              }}
            >
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 'bold',
                color: '#ffffff',
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '1px 4px',
                borderRadius: '3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}>
                {field.etiqueta || 'Campo'}
              </span>
            </div>
          );
        })}

        {/* Drawn Active Box when Dragging Mouse */}
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
            pointerEvents: 'none',
            zIndex: 30
          }} />
        )}
      </div>
    </div>
  );
};
