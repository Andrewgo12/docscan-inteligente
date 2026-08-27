import type { DetectedField, UniversalAnalysisResult } from '../types/document';

const API_BASE_URL = 'http://localhost:8000/api/v1/documents';

export const apiService = {
  async universalAnalyze(file: File): Promise<UniversalAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/universal-analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error('Error en el analizador universal.');
    }
    return await res.json();
  },

  async uploadDocument(file: File): Promise<{ id: string; nombre_archivo: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error('Error al cargar el documento.');
    }
    return await res.json();
  },

  async processDocument(docId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/${docId}/process`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Error durante el procesamiento del documento.');
    }
    return await res.json();
  },

  async updateFields(docId: string, fields: DetectedField[]): Promise<any> {
    const payload = fields.map(f => ({
      etiqueta: f.etiqueta,
      tipo_campo: f.tipo_campo,
      coordenadas: f.coordenadas,
      confianza_deteccion: f.confianza || 1.0,
      corregido_manualmente: true
    }));

    const res = await fetch(`${API_BASE_URL}/${docId}/fields`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error('Error al actualizar los campos en la base de datos.');
    }
    return await res.json();
  },

  getExportUrl(docId: string, format: 'docx' | 'xlsx' | 'pdf'): string {
    return `${API_BASE_URL}/${docId}/export/${format}`;
  }
};
