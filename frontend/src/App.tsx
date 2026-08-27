import React, { useState } from 'react';
import { Header } from './components/Header';
import { UniversalUploadZone } from './components/UniversalUploadZone';
import { DocumentReaderPreview } from './components/DocumentReaderPreview';
import { InteractiveTemplateStudioModal } from './components/InteractiveTemplateStudioModal';
import { DocumentCanvasViewer } from './components/DocumentCanvasViewer';
import { FieldEditorPanel } from './components/FieldEditorPanel';
import { TemplateManager } from './components/TemplateManager';
import { ToastContainer } from './components/ToastContainer';

import type { DetectedField, ToastMessage, UniversalAnalysisResult, SavedTemplateProfile } from './types/document';
import { apiService } from './services/api';

// Sintetizador de Sonido de Notificación de Alta Fidelidad (Web Audio API)
const playNotificationSound = (type: 'success' | 'info' | 'warning' | 'error') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'info') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'warning' || type === 'error') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    // Audio context ignorado
  }
};

export function App() {
  const [docId, setDocId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('Analizando firma binaria...');
  const [universalResult, setUniversalResult] = useState<UniversalAnalysisResult | null>(null);

  // Form Processing States
  const [processedForm, setProcessedForm] = useState(false);
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'docx' | 'xlsx' | 'pdf'>('docx');

  // Mouse Drag-to-Draw State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawnBox, setDrawnBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Studio & Preview States
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [currentUploadedFile, setCurrentUploadedFile] = useState<File | null>(null);

  // Saved Template Profiles
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplateProfile[]>(() => {
    try {
      const stored = localStorage.getItem('docscan_saved_templates');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Modals & Drawers
  const [isBellOpen, setIsBellOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<ToastMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addToast = (title: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();
    const newMsg: ToastMessage = { id, title, type, timestamp };

    playNotificationSound(type);
    setToasts(prev => [...prev, newMsg]);
    setNotificationHistory(prev => [newMsg, ...prev]);
    setUnreadCount(prev => prev + 1);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getThemeClass = () => {
    if (!universalResult) return '';
    const fileType = universalResult.metadata?.file_type;
    if (fileType === 'office_word') return 'theme-word';
    if (fileType === 'office_excel') return 'theme-excel';
    if (fileType === 'office_powerpoint') return 'theme-powerpoint';
    if (fileType === 'image' || fileType === 'pdf') return 'theme-pdf';
    if (fileType === 'zip_archive') return 'theme-zip';
    if (fileType === 'exe_binary') return 'theme-binary';
    return '';
  };

  const handleUniversalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const inputFile = e.target.files[0];
      setCurrentUploadedFile(inputFile);
      setUniversalResult(null);
      setProcessedForm(false);
      
      setIsProcessing(true);
      setProcessingStage('Inspeccionando firma binaria y Magic Bytes...');
      addToast(`Cargando "${inputFile.name}"...`, 'info');

      try {
        const univData = await apiService.universalAnalyze(inputFile);
        setUniversalResult(univData);
        const desc = univData?.metadata?.description || 'Archivo identificado';
        addToast(`Documento listo para lectura previa: ${desc}`, 'success');
      } catch (err: any) {
        addToast(`Observación: ${err.message}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const triggerAutoProcess = async () => {
    if (!currentUploadedFile) return;
    setIsProcessing(true);
    setProcessingStage('Ejecutando pipeline automático de digitalización e IA...');
    try {
      const uploadRes = await apiService.uploadDocument(currentUploadedFile);
      setDocId(uploadRes.id);

      const procData = await apiService.processDocument(uploadRes.id);
      if (procData.campos) {
        const mappedFields: DetectedField[] = procData.campos.map((c: any) => ({
          id: c.id,
          etiqueta: c.etiqueta || 'Campo Detectado',
          tipo_campo: c.tipo_campo || 'texto',
          coordenadas: c.coordenadas || { x: 50, y: 50, width: 200, height: 30 },
          confianza: c.confianza_deteccion || 0.9
        }));
        setFields(mappedFields);
      }
      setProcessedForm(true);
      addToast('Procesamiento automático completado con éxito.', 'success');
    } catch (err: any) {
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mouse Drag-to-Draw Bounding Box Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawnBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const width = Math.abs(currentX - drawStart.x);
    const height = Math.abs(currentY - drawStart.y);

    setDrawnBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (isDrawing && drawnBox && drawnBox.width > 15 && drawnBox.height > 10) {
      const newField: DetectedField = {
        id: `field-manual-${Date.now()}`,
        etiqueta: 'Nuevo Campo Trazado',
        tipo_campo: 'texto',
        coordenadas: { ...drawnBox },
        confianza: 1.0
      };
      setFields(prev => [...prev, newField]);
      setSelectedFieldId(newField.id);
      addToast('Nuevo campo delimitado manualmente.', 'success');
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawnBox(null);
  };

  // Field Editor Operations
  const updateFieldLabel = (id: string, label: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, etiqueta: label } : f));
  };

  const updateFieldType = (id: string, type: 'texto' | 'fecha' | 'firma' | 'casilla') => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, tipo_campo: type } : f));
  };

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    addToast('Campo eliminado.', 'info');
  };

  // DB Sync & File Download
  const handleSaveToDatabase = async () => {
    if (!docId) {
      addToast('Guardado local de campos actualizado.', 'info');
      return;
    }
    try {
      await apiService.updateFields(docId, fields);
      addToast('Correcciones persistidas en base de datos SQLite (docscan.db).', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleExport = (fmt?: 'docx' | 'xlsx' | 'pdf') => {
    const targetFmt = fmt || exportFormat;
    if (!docId) {
      addToast(`Simulando exportación de plantilla en .${targetFmt}...`, 'info');
      return;
    }
    const exportUrl = apiService.getExportUrl(docId, targetFmt);
    window.open(exportUrl, '_blank');
    addToast(`Generando plantilla editable en formato .${targetFmt}...`, 'success');
  };

  return (
    <div className={`app-container ${getThemeClass()}`}>
      <Header 
        unreadCount={unreadCount}
        isBellOpen={isBellOpen}
        setIsBellOpen={setIsBellOpen}
        notificationHistory={notificationHistory}
        clearNotifications={() => { setNotificationHistory([]); setUnreadCount(0); }}
        themeClass={getThemeClass()}
      />

      <main>
        <UniversalUploadZone 
          onFileSelect={handleUniversalUpload}
          isProcessing={isProcessing}
          processingStage={processingStage}
        />

        {/* Step 1: Document Visual Reader Preview Pane */}
        {universalResult && !processedForm && (
          <DocumentReaderPreview 
            result={universalResult}
            onLaunchStudio={() => setIsStudioOpen(true)}
            onAutoProcess={triggerAutoProcess}
            isProcessing={isProcessing}
          />
        )}

        {/* Canvas & Editor Workspace */}
        {processedForm && (
          <>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <DocumentCanvasViewer 
                fields={fields}
                selectedFieldId={selectedFieldId}
                setSelectedFieldId={setSelectedFieldId}
                isDrawing={isDrawing}
                drawnBox={drawnBox}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              />

              <FieldEditorPanel 
                fields={fields}
                selectedFieldId={selectedFieldId}
                setSelectedFieldId={setSelectedFieldId}
                updateFieldLabel={updateFieldLabel}
                updateFieldType={updateFieldType}
                deleteField={deleteField}
                exportFormat={exportFormat}
                setExportFormat={setExportFormat}
                handleExport={() => handleExport()}
                handleSaveToDatabase={handleSaveToDatabase}
              />
            </div>

            <TemplateManager 
              fields={fields}
              setFields={setFields}
              savedTemplates={savedTemplates}
              setSavedTemplates={setSavedTemplates}
              addToast={addToast}
            />
          </>
        )}
      </main>

      {/* Interactive Page-by-Page Studio Modal */}
      <InteractiveTemplateStudioModal 
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        analysisResult={universalResult}
        fields={fields}
        setFields={setFields}
        onExport={handleExport}
        addToast={addToast}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
