import React, { useState } from 'react';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import type { DetectedField, SavedTemplateProfile } from '../types/document';

interface TemplateManagerProps {
  fields: DetectedField[];
  setFields: (fields: DetectedField[]) => void;
  savedTemplates: SavedTemplateProfile[];
  setSavedTemplates: React.Dispatch<React.SetStateAction<SavedTemplateProfile[]>>;
  addToast: (title: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  fields,
  setFields,
  savedTemplates,
  setSavedTemplates,
  addToast
}) => {
  const [templateName, setTemplateName] = useState('');

  const saveCurrentTemplate = () => {
    if (!templateName.trim()) {
      addToast('Ingresa un nombre para la plantilla.', 'warning');
      return;
    }
    const newProfile: SavedTemplateProfile = {
      id: `tpl-${Date.now()}`,
      name: templateName.trim(),
      fields: [...fields]
    };
    const updated = [...savedTemplates, newProfile];
    setSavedTemplates(updated);
    localStorage.setItem('docscan_saved_templates', JSON.stringify(updated));
    setTemplateName('');
    addToast(`Plantilla "${newProfile.name}" guardada con éxito.`, 'success');
  };

  const loadTemplate = (profile: SavedTemplateProfile) => {
    setFields(profile.fields);
    addToast(`Plantilla "${profile.name}" aplicada.`, 'info');
  };

  const deleteTemplate = (id: string, name: string) => {
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem('docscan_saved_templates', JSON.stringify(updated));
    addToast(`Plantilla "${name}" eliminada.`, 'info');
  };

  return (
    <div className="hero-card" style={{ marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles size={18} color="var(--theme-primary)" /> Perfiles y Plantillas Personalizadas
      </h3>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem' }}>
        <input 
          type="text" 
          placeholder="Nombre de la nueva plantilla (ej: Formulario de Contratación)..."
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          style={{
            flex: 1,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-color)',
            color: 'white',
            padding: '0.6rem 1rem',
            borderRadius: '10px',
            fontSize: '0.9rem'
          }}
        />
        <button className="btn btn-primary" onClick={saveCurrentTemplate} style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
          <Plus size={16} /> Guardar Perfil
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.8rem' }}>
        {savedTemplates.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#64748b', gridColumn: '1/-1', textAlign: 'center', padding: '1rem' }}>
            No hay perfiles de plantilla guardados. Guarda la disposición de campos actual para reutilizarla.
          </p>
        ) : (
          savedTemplates.map(tpl => (
            <div key={tpl.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--theme-border)', borderRadius: '12px', padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#f8fafc', display: 'block' }}>{tpl.name}</strong>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tpl.fields.length} campos guardados</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => loadTemplate(tpl)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                  Cargar
                </button>
                <button onClick={() => deleteTemplate(tpl.id, tpl.name)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.3rem' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
