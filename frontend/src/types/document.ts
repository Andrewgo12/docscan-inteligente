export interface DetectedField {
  id: string;
  etiqueta: string;
  tipo_campo: 'texto' | 'fecha' | 'firma' | 'casilla';
  coordenadas: { x: number; y: number; width: number; height: number };
  confianza: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
}

export interface UniversalMetadata {
  file_type?: string;
  mime?: string;
  description?: string;
  size_bytes?: number;
  hash_sha256?: string;
}

export interface UniversalAnalysisResult {
  status?: string;
  filename?: string;
  metadata?: UniversalMetadata;
  analysis?: {
    summary?: string;
    executive_summary?: string;
    total_sheets?: number;
    total_slides?: number;
    total_cells?: number;
    total_images_embedded?: number;
    extracted_images_paths?: string[];
  };
}

export interface SavedTemplateProfile {
  id: string;
  name: string;
  fields: DetectedField[];
}
