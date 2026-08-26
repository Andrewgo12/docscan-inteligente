import React, { useState } from 'react';
import { 
  FileText, Upload, Download, RefreshCw, 
  Trash2, Plus, Sparkles, AlertCircle, FileSpreadsheet, Leaf,
  ShieldCheck, FileCode, CheckCircle2, Info, X, Presentation,
  Archive, Cpu, Eye, Bell, Volume2
} from 'lucide-react';

interface DetectedField {
  id: string;
  etiqueta: string;
  tipo_campo: 'texto' | 'fecha' | 'firma' | 'casilla';
  coordenadas: { x: number; y: number; width: number; height: number };
  confianza: number;
}

interface ToastMessage {
  id: string;
  title: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
}

const API_BASE_URL = 'http://localhost:8000/api/v1/documents';

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
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'info') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
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
    // Audio context ignorado en caso de políticas de autoplay del navegador
  }
};

// Notificación Nativa del Sistema Operativo
const triggerNativeBrowserNotification = (title: string, body: string) => {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.ico' });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      });
    }
  }
};

export function App() {
  const [docId, setDocId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('Analizando firma binaria...');
  const [universalResult, setUniversalResult] = useState<any | null>(null);

  // Form Processing States
  const [processedForm, setProcessedForm] = useState(false);
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'docx' | 'xlsx' | 'pdf'>('docx');

  // Mouse Drag-to-Draw Bounding Box State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawnBox, setDrawnBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [newLabelText, setNewLabelText] = useState('');
  const [newLabelType, setNewLabelType] = useState<'texto' | 'fecha' | 'firma' | 'casilla'>('texto');
  const [showLabelPrompt, setShowLabelPrompt] = useState(false);

  // Template Profiles State
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<{ id: string; name: string; fields: DetectedField[] }[]>(() => {
    try {
      const stored = localStorage.getItem('docscan_saved_templates');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Modal Inspector & Bell Center States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);

  // Toast & Activity Center State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<ToastMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addToast = (title: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();
    const newMsg: ToastMessage = { id, title, type, timestamp };

    // 1. Sonido sintético
    playNotificationSound(type);

    // 2. Notificación en pantalla
    setToasts(prev => [...prev, newMsg]);

    // 3. Historial en centro de notificaciones
    setNotificationHistory(prev => [newMsg, ...prev]);
    setUnreadCount(prev => prev + 1);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Dynamic Brand Theme Resolver
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
      const uploadedFile = e.target.files[0];
      setUniversalResult(null);
      setProcessedForm(false);
      await analyzeUniversalFile(uploadedFile);
    }
  };

  const analyzeUniversalFile = async (inputFile: File) => {
    setIsProcessing(true);
    setProcessingStage('Inspeccionando firma binaria y Magic Bytes...');
    addToast(`Cargando "${inputFile.name}"...`, 'info');
    
    try {
      const formData = new FormData();
      formData.append('file', inputFile);

      setTimeout(() => setProcessingStage('Ejecutando motores OCR y Visión por Computador...'), 800);
      setTimeout(() => setProcessingStage('Extrayendo celdas, diapositivas y campos editables...'), 1600);

      const res = await fetch(`${API_BASE_URL}/universal-analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('No se pudo conectar con el analizador del servidor.');
      }

      const data = await res.json();
      setUniversalResult(data);
      setIsModalOpen(true);

      const desc = data?.metadata?.description || 'Archivo identificado';
      addToast(`Documento clasificado como: ${desc}`, 'success');
      triggerNativeBrowserNotification("DocScan Inteligente", `¡Análisis completado! ${inputFile.name} es ${desc}.`);

      const fileType = data?.metadata?.file_type;
      if (fileType === 'image' || fileType === 'pdf') {
        await processFormPipeline(inputFile);
      }
    } catch (err: any) {
      addToast(err.message || 'Error al procesar el archivo.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const processFormPipeline = async (inputFile: File) => {
    try {
      const formData = new FormData();
      formData.append('file', inputFile);

      const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        setDocId(uploadData.id);

        const processRes = await fetch(`${API_BASE_URL}/${uploadData.id}/process`, {
          method: 'POST',
        });

        if (processRes.ok) {
          const processData = await processRes.json();
          const backendFields: DetectedField[] = (processData.campos || []).map((c: any) => ({
            id: c.id,
            etiqueta: c.etiqueta || 'Campo detectado',
            tipo_campo: c.tipo_campo || 'texto',
            coordenadas: c.coordenadas,
            confianza: c.confianza_deteccion || 0.9,
          }));

          setFields(backendFields);
          setProcessedForm(true);
          addToast(`${backendFields.length} campos editables identificados.`, 'success');
        }
      }
    } catch (err) {
      addToast('Observación en procesador secundario.', 'warning');
    }
  };

  const updateField = (id: string, key: keyof DetectedField, value: any) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    addToast('Campo eliminado.', 'info');
  };

  const addField = () => {
    const newId = `f-${Date.now()}`;
    const newField: DetectedField = {
      id: newId,
      etiqueta: 'Nuevo Campo Editado',
      tipo_campo: 'texto',
      coordenadas: { x: 120, y: 440, width: 300, height: 35 },
      confianza: 1.0
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newId);
    addToast('Nuevo campo añadido al mapa.', 'info');
  };

  // Handlers de Dibujo Interactivo con Mouse por Arrastre
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawnBox({ x, y, width: 0, height: 0 });
    setShowLabelPrompt(false);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (drawnBox && drawnBox.width > 15 && drawnBox.height > 15) {
      setShowLabelPrompt(true);
      setNewLabelText('');
    } else {
      setDrawnBox(null);
    }
  };

  const confirmDrawnField = () => {
    if (!drawnBox) return;
    const label = newLabelText.trim() || `Campo Dibujado (${fields.length + 1})`;
    const newField: DetectedField = {
      id: `f-drawn-${Date.now()}`,
      etiqueta: label,
      tipo_campo: newLabelType,
      coordenadas: drawnBox,
      confianza: 1.0
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
    setDrawnBox(null);
    setShowLabelPrompt(false);
    addToast(`Campo "${label}" creado por arrastre de mouse.`, 'success');
  };

  const saveCurrentAsTemplateProfile = () => {
    const name = templateName.trim() || `Plantilla Reutilizable ${savedTemplates.length + 1}`;
    const newTemplate = {
      id: `tmpl-${Date.now()}`,
      name,
      fields
    };
    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem('docscan_saved_templates', JSON.stringify(updated));
    setTemplateName('');
    addToast(`¡Plantilla "${name}" guardada! Reutilizable para documentos idénticos.`, 'success');
  };

  const loadTemplateProfile = (tmpl: { id: string; name: string; fields: DetectedField[] }) => {
    setFields(tmpl.fields);
    addToast(`Plantilla "${tmpl.name}" cargada. ${tmpl.fields.length} campos mapeados.`, 'info');
  };

  const handleExport = async () => {
    if (!docId) {
      addToast('Debes procesar un formulario antes de exportar.', 'warning');
      return;
    }

    try {
      addToast(`Generando archivo editable .${exportFormat.toUpperCase()}...`, 'info');
      await fetch(`${API_BASE_URL}/${docId}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      window.open(`${API_BASE_URL}/${docId}/export/${exportFormat}`, '_blank');
      addToast(`¡Documento .${exportFormat.toUpperCase()} generado exitosamente!`, 'success');
      triggerNativeBrowserNotification("DocScan Exportador", `¡Documento exportado como .${exportFormat.toUpperCase()}!`);
    } catch (err) {
      addToast('Error al exportar el documento.', 'error');
    }
  };

  const resetAll = () => {
    setDocId(null);
    setUniversalResult(null);
    setProcessedForm(false);
    setFields([]);
    setIsModalOpen(false);
    addToast('Sistema listo para un nuevo archivo.', 'info');
  };

  return (
    <div className={`app-container ${getThemeClass()}`}>
      {/* Toast Notification Floating System with Sound */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={20} color="#34d399" />}
            {toast.type === 'info' && <Info size={20} color="#38bdf8" />}
            {toast.type === 'warning' && <AlertCircle size={20} color="#fbbf24" />}
            {toast.type === 'error' && <AlertCircle size={20} color="#f87171" />}
            <span style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>{toast.title}</span>
            <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: 'auto' }}>
              <X size={16} />
            </button>
            <div className="toast-progress" />
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={26} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">DocScan Inteligente</h1>
            <span style={{ fontSize: '0.8rem', color: '#a78bfa' }}>
              Plataforma de Digitalización, Ingestión Universal & Análisis de Documentos
            </span>
          </div>
          <span className="brand-tag">Código Abierto</span>
        </div>

        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', position: 'relative' }}>
          {/* Notification Bell Center */}
          <button 
            onClick={() => { setIsBellOpen(!isBellOpen); setUnreadCount(0); }} 
            style={{ position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.65rem', borderRadius: '12px', color: '#f1f5f9', cursor: 'pointer' }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Activity Log Dropdown Panel */}
          {isBellOpen && (
            <div style={{ position: 'absolute', top: '50px', right: '0', width: '340px', background: 'linear-gradient(145deg, rgba(20, 24, 40, 0.98), rgba(12, 14, 25, 0.99))', border: '1px solid var(--theme-border)', borderRadius: '16px', boxShadow: '0 15px 40px rgba(0,0,0,0.5)', padding: '1.2rem', zIndex: 1100 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Volume2 size={16} color="#c4b5fd" /> Centro de Notificaciones
                </h4>
                <button onClick={() => setIsBellOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {notificationHistory.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>Sin actividades recientes.</p>
                ) : (
                  notificationHistory.map(n => (
                    <div key={n.id} style={{ background: 'rgba(255,255,255,0.04)', padding: '0.6rem 0.8rem', borderRadius: '8px', borderLeft: `3px solid ${n.type === 'success' ? '#34d399' : n.type === 'error' ? '#f87171' : '#38bdf8'}` }}>
                      <div style={{ fontSize: '0.82rem', color: '#f1f5f9' }}>{n.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{n.timestamp}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <Leaf size={20} color="#10b981" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#a78bfa' }}>Impacto Ambiental</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>
                ~45 Hojas Ahorradas
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Introducción Básica y Hero Banner */}
      {!universalResult && !isProcessing && (
        <section className="hero-card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(27, 23, 42, 0.9), rgba(17, 14, 27, 0.95))' }}>
          <div style={{ maxWidth: '850px', margin: '0 auto', textAlign: 'center', padding: '1rem 0' }}>
            <span style={{ background: 'var(--theme-light)', color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.9rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '1px', border: '1px solid var(--theme-border)' }}>
              Plataforma Abierta de Digitalización
            </span>
            <h2 style={{ fontSize: '2.1rem', marginTop: '0.8rem', marginBottom: '1rem', background: 'linear-gradient(90deg, #ffffff, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Transforma Cualquier Documento Físico o Archivo en un Formato Editable
            </h2>
            <p style={{ color: '#a78bfa', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              DocScan Inteligente utiliza **Visión por Computador (OpenCV)**, **OCR (PaddleOCR)** y **Analizadores Binarios Universales** para reconocer automáticamente el formato de cualquier archivo que subas (imágenes, PDF, Word, Excel con 1000s de hojas, PowerPoint, ZIP o ejecutables), detectar sus campos y reconstruirlo en un archivo editable (.docx, .xlsx o PDF interactivo) sin costo de licenciamiento.
            </p>

            {/* 3 Pasos Clave */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', textAlign: 'left', marginTop: '1.5rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ background: 'var(--theme-light)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', fontWeight: 'bold', marginBottom: '0.8rem' }}>1</div>
                <h4 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.3rem' }}>Sube cualquier archivo</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sin restricciones de formato. Identificamos la firma binaria en segundos.</p>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.2)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontWeight: 'bold', marginBottom: '0.8rem' }}>2</div>
                <h4 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.3rem' }}>Análisis & OCR</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Detectamos áreas de escritura, firmas, casillas y texto impreso automáticamente.</p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontWeight: 'bold', marginBottom: '0.8rem' }}>3</div>
                <h4 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.3rem' }}>Edita & Exporta</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ajusta los campos detectados en pantalla y descarga tu archivo en Word, Excel o PDF.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Workspace Area */}
      <main className="hero-card">
        {/* Universal Drag and Drop File Input Area */}
        {!universalResult && !isProcessing && (
          <div style={{ border: '2px dashed var(--theme-border)', borderRadius: '16px', padding: '3.5rem 2rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ background: 'var(--theme-light)', padding: '1.4rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1.2rem', border: '1px solid var(--theme-border)' }}>
              <Upload size={44} color="#c4b5fd" />
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Arrastra o selecciona CUALQUIER archivo</h3>
            <p style={{ color: '#a78bfa', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto 1.8rem auto' }}>
              Acepta imágenes (JPG, PNG), documentos PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), archivos comprimidos (ZIP), ejecutables (EXE) o texto.
            </p>
            <label className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
              <Upload size={20} /> Seleccionar Archivo
              <input type="file" onChange={handleUniversalUpload} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {/* Processing Loader Modal Animation */}
        {isProcessing && (
          <div className="modal-backdrop">
            <div className="modal-content" style={{ textAlign: 'center', maxWidth: '480px', padding: '3rem 2rem' }}>
              <div className="loading-orbit">
                <Sparkles size={36} color="#c4b5fd" />
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.6rem' }}>Procesando Documento</h3>
              <p style={{ color: '#a78bfa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {processingStage}
              </p>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                <div style={{ background: 'var(--theme-primary)', height: '100%', width: '70%', animation: 'toastTimer 2s infinite ease-in-out' }} />
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Modal & Results Inspector */}
        {universalResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{ background: 'var(--theme-light)', padding: '0.8rem', borderRadius: '14px', border: '1px solid var(--theme-border)' }}>
                  {universalResult.metadata?.file_type === 'office_word' && <FileText size={28} color="#38bdf8" />}
                  {universalResult.metadata?.file_type === 'office_excel' && <FileSpreadsheet size={28} color="#34d399" />}
                  {universalResult.metadata?.file_type === 'office_powerpoint' && <Presentation size={28} color="#f87171" />}
                  {universalResult.metadata?.file_type === 'zip_archive' && <Archive size={28} color="#fbbf24" />}
                  {universalResult.metadata?.file_type === 'exe_binary' && <Cpu size={28} color="#22d3ee" />}
                  {(universalResult.metadata?.file_type === 'image' || universalResult.metadata?.file_type === 'pdf') && <FileCode size={28} color="#f472b6" />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem' }}>{universalResult.filename}</h3>
                  <span style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 600 }}>
                    {universalResult.metadata?.description || 'Archivo Identificado'} &bull; {Math.round((universalResult.metadata?.size_bytes || 0) / 1024)} KB
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-secondary">
                  <Eye size={16} /> Ver Detalles en Modal
                </button>
                <button onClick={resetAll} className="btn btn-secondary">
                  <RefreshCw size={16} /> Otro Archivo
                </button>
              </div>
            </div>

            {/* General Executive Summary Card */}
            <div style={{ background: 'var(--theme-light)', border: '1px solid var(--theme-border)', padding: '1.4rem', borderRadius: '16px' }}>
              <h4 style={{ color: '#c4b5fd', fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} /> Resumen Ejecutivo de Análisis
              </h4>
              <p style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: '1.5' }}>
                {universalResult.analysis?.summary || universalResult.analysis?.executive_summary || 'Análisis completado exitosamente.'}
              </p>
            </div>

            {/* FORMULARIO EDITABLE / VISOR CANVAS */}
            {processedForm && fields.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', marginTop: '1rem' }}>
                {/* Visual Canvas Overlay con Dibujo de Recuadros por Arrastre de Mouse */}
                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.5rem', minHeight: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', userSelect: 'none' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🖱️ Haz clic y arrastra con el mouse para dibujar un recuadro en cualquier área del documento
                  </div>
                  
                  <div 
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    style={{ width: '560px', height: '450px', background: '#fcfcfc', border: '1.5px solid #cbd5e1', position: 'relative', padding: '2rem', color: '#1e293b', cursor: 'crosshair', borderRadius: '8px', overflow: 'hidden' }}
                  >
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', marginBottom: '20px', borderBottom: '2px solid var(--theme-primary)', paddingBottom: '6px' }}>
                      LIENZO INTERACTIVO - DIBUJO DE CAMPOS POR ARRASTRE
                    </div>

                    {/* Campos Ya Existentes / Detectados */}
                    {fields.map(field => {
                      const isSelected = selectedFieldId === field.id;
                      const typeColor = field.tipo_campo === 'texto' ? '#38bdf8' :
                                        field.tipo_campo === 'fecha' ? '#34d399' :
                                        field.tipo_campo === 'firma' ? '#f472b6' : '#fbbf24';
                      return (
                        <div
                          key={field.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                          style={{
                            position: 'absolute',
                            left: `${field.coordenadas.x}px`,
                            top: `${field.coordenadas.y}px`,
                            width: `${field.coordenadas.width}px`,
                            height: `${field.coordenadas.height}px`,
                            border: `2px ${isSelected ? 'solid' : 'dashed'} ${typeColor}`,
                            background: isSelected ? `${typeColor}33` : `${typeColor}15`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '4px'
                          }}
                        >
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#ffffff', background: typeColor, padding: '1px 4px', borderRadius: '3px', position: 'absolute', top: '-16px', left: '0', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            {field.etiqueta}
                          </span>
                        </div>
                      );
                    })}

                    {/* Recuadro Dinámico Siendo Dibujado por el Usuario */}
                    {drawnBox && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${drawnBox.x}px`,
                          top: `${drawnBox.y}px`,
                          width: `${drawnBox.width}px`,
                          height: `${drawnBox.height}px`,
                          border: '2px solid #a855f7',
                          background: 'rgba(168, 85, 247, 0.25)',
                          borderRadius: '4px',
                          pointerEvents: 'none'
                        }}
                      />
                    )}

                    {/* Popover Emergente para Asignar Texto/Etiqueta al Recuadro Dibujado */}
                    {showLabelPrompt && drawnBox && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: `${Math.min(drawnBox.x, 320)}px`,
                          top: `${Math.min(drawnBox.y + drawnBox.height + 8, 350)}px`,
                          background: 'linear-gradient(145deg, #1e1b4b, #0f172a)',
                          border: '2px solid #a855f7',
                          borderRadius: '10px',
                          padding: '0.8rem',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          zIndex: 100,
                          width: '260px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', color: '#e9d5ff', fontWeight: 'bold' }}>
                          ✏️ Indicar lo que va en este cuadro:
                        </div>
                        <input
                          type="text"
                          autoFocus
                          value={newLabelText}
                          onChange={(e) => setNewLabelText(e.target.value)}
                          placeholder="Ej: Nombre de Cliente, Cédula, Firma..."
                          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white', padding: '0.35rem', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          {(['texto', 'fecha', 'firma', 'casilla'] as const).map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setNewLabelType(t)}
                              style={{ fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', border: newLabelType === t ? '1.5px solid #a855f7' : '1px solid var(--border-color)', background: newLabelType === t ? '#7c3aed' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <button onClick={confirmDrawnField} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}>
                            ➕ Guardar Campo
                          </button>
                          <button onClick={() => { setDrawnBox(null); setShowLabelPrompt(false); }} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Panel Inspector de Propiedades de Campo Seleccionado en Tiempo Real */}
                  {selectedFieldId && (() => {
                    const activeField = fields.find(f => f.id === selectedFieldId);
                    if (!activeField) return null;
                    return (
                      <div style={{ marginTop: '0.8rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--theme-primary)', padding: '0.9rem', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#c4b5fd', fontWeight: 'bold' }}>
                            🎛️ Propiedades de: "{activeField.etiqueta}"
                          </span>
                          <button 
                            onClick={() => {
                              const clone: DetectedField = {
                                ...activeField,
                                id: `f-${Date.now()}`,
                                etiqueta: `${activeField.etiqueta} (Copia)`,
                                coordenadas: { ...activeField.coordenadas, y: activeField.coordenadas.y + 40 }
                              };
                              setFields([...fields, clone]);
                              addToast(`Campo clonado como "${clone.etiqueta}"`, 'info');
                            }}
                            className="btn btn-secondary" 
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          >
                            📋 Clonar Campo
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                          <div>Posición X: <strong style={{ color: '#ffffff' }}>{activeField.coordenadas.x}px</strong></div>
                          <div>Posición Y: <strong style={{ color: '#ffffff' }}>{activeField.coordenadas.y}px</strong></div>
                          <div>Ancho: <strong style={{ color: '#ffffff' }}>{activeField.coordenadas.width}px</strong></div>
                          <div>Alto: <strong style={{ color: '#ffffff' }}>{activeField.coordenadas.height}px</strong></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Sidebar Controls & Template Design Studio */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Gestión de Plantillas Reutilizables Guardadas */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6), rgba(15, 23, 42, 0.8))', border: '1.5px solid #a855f7', padding: '1rem', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '0.88rem', color: '#e9d5ff', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                      💾 Plantilla Reutilizable para Futuros Documentos
                    </h4>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Nombre de plantilla (Ej: Contrato Típico)..."
                        style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem' }}
                      />
                      <button onClick={saveCurrentAsTemplateProfile} className="btn btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        💾 Guardar
                      </button>
                    </div>

                    {/* Selector de Plantillas Anteriormente Guardadas */}
                    {savedTemplates.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#c4b5fd', marginBottom: '0.3rem' }}>Cargar Plantilla Guardada:</div>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {savedTemplates.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => loadTemplateProfile(t)}
                              style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'rgba(168, 85, 247, 0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              📋 {t.name} ({t.fields.length} campos)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selector de Modo de Reconstrucción de Plantilla */}
                  <div style={{ background: 'var(--theme-light)', border: '1px solid var(--theme-border)', padding: '1rem', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem', color: '#c4b5fd', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🎨 Modo de Diseño y Reconstrucción
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
                      <button
                        onClick={() => { addToast('Modo seleccionado: Copia Fiel Exacta (Layout Original)', 'info'); }}
                        style={{ padding: '0.4rem 0.2rem', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'rgba(56, 189, 248, 0.15)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}
                      >
                        🎯 Exacto
                      </button>
                      <button
                        onClick={() => { addToast('Modo seleccionado: Reorganización Limpia por Bloques', 'info'); }}
                        style={{ padding: '0.4rem 0.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'center' }}
                      >
                        ✨ Bloques
                      </button>
                      <button
                        onClick={() => { addToast('Modo seleccionado: Capa de Superposición Transparente', 'info'); }}
                        style={{ padding: '0.4rem 0.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'center' }}
                      >
                        📑 Capa
                      </button>
                    </div>
                  </div>

                  {/* Caja de Herramientas de Añadido Rápido */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1rem' }}>Campos Detectados ({fields.length})</h4>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button 
                        onClick={() => {
                          const newField: DetectedField = { id: `f-${Date.now()}`, etiqueta: 'Nueva Firma', tipo_campo: 'firma', coordenadas: { x: 50, y: 380, width: 250, height: 60 }, confianza: 1.0 };
                          setFields([...fields, newField]);
                          addToast('Recuadro de Firma añadido.', 'success');
                        }} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                      >
                        ✍️ +Firma
                      </button>
                      <button 
                        onClick={() => {
                          const newField: DetectedField = { id: `f-${Date.now()}`, etiqueta: 'Acepto Términos', tipo_campo: 'casilla', coordenadas: { x: 50, y: 320, width: 200, height: 25 }, confianza: 1.0 };
                          setFields([...fields, newField]);
                          addToast('Casilla Checkbox añadida.', 'success');
                        }} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                      >
                        ☑️ +Casilla
                      </button>
                      <button onClick={addField} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}>
                        <Plus size={12} /> +Texto
                      </button>
                    </div>
                  </div>

                  <div style={{ flex: 1, maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {fields.map(field => {
                      const isLowConfidence = field.confianza < 0.70;
                      return (
                        <div 
                          key={field.id} 
                          onClick={() => setSelectedFieldId(field.id)} 
                          style={{ 
                            padding: '0.75rem', 
                            borderRadius: '10px', 
                            background: selectedFieldId === field.id ? 'var(--bg-card-hover)' : 'rgba(15, 23, 42, 0.5)', 
                            border: `1.5px solid ${isLowConfidence ? '#fbbf24' : (selectedFieldId === field.id ? 'var(--theme-primary)' : 'var(--border-color)')}`, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.4rem',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span className={`badge badge-${field.tipo_campo}`}>{field.tipo_campo}</span>
                              {isLowConfidence && (
                                <span style={{ fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(251, 191, 36, 0.3)', fontWeight: 'bold' }}>
                                  💬 Confirmación Requerida
                                </span>
                              )}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteField(field.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Pregunta Dirigida de Aprendizaje Activo cuando la confianza < 0.70 */}
                          {isLowConfidence && (
                            <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px dashed rgba(251, 191, 36, 0.4)', borderRadius: '8px', padding: '0.5rem', marginTop: '0.2rem' }}>
                              <div style={{ fontSize: '0.75rem', color: '#fef08a', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                💬 ¿Qué va en esta zona del documento?
                              </div>
                              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                {['texto', 'fecha', 'firma', 'casilla'].map((t) => (
                                  <button
                                    key={t}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateField(field.id, 'tipo_campo', t);
                                      updateField(field.id, 'confianza', 1.0);
                                      addToast(`Categoría confirmada como ${t.toUpperCase()}. ¡IA actualizada!`, 'success');
                                    }}
                                    style={{
                                      fontSize: '0.7rem',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color)',
                                      background: field.tipo_campo === t ? 'var(--theme-primary)' : 'rgba(255,255,255,0.05)',
                                      color: 'white',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <input 
                            type="text" 
                            value={field.etiqueta} 
                            onChange={(e) => updateField(field.id, 'etiqueta', e.target.value)} 
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.85rem' }} 
                            placeholder="Etiqueta / Nombre del campo..."
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <h5 style={{ marginBottom: '0.6rem' }}>Exportar Documento Editable</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginBottom: '1rem' }}>
                      <button onClick={() => setExportFormat('docx')} style={{ padding: '0.4rem', borderRadius: '8px', border: exportFormat === 'docx' ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)', background: exportFormat === 'docx' ? 'var(--theme-light)' : 'transparent', color: 'white', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                        <FileText size={16} color="#38bdf8" /> Word (.docx)
                      </button>
                      <button onClick={() => setExportFormat('xlsx')} style={{ padding: '0.4rem', borderRadius: '8px', border: exportFormat === 'xlsx' ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)', background: exportFormat === 'xlsx' ? 'var(--theme-light)' : 'transparent', color: 'white', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                        <FileSpreadsheet size={16} color="#34d399" /> Excel (.xlsx)
                      </button>
                      <button onClick={() => setExportFormat('pdf')} style={{ padding: '0.4rem', borderRadius: '8px', border: exportFormat === 'pdf' ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)', background: exportFormat === 'pdf' ? 'var(--theme-light)' : 'transparent', color: 'white', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                        <FileCode size={16} color="#f472b6" /> PDF (AcroForm)
                      </button>
                    </div>
                    <button onClick={handleExport} className="btn btn-success" style={{ width: '100%', justifyContent: 'center' }}>
                      <Download size={18} /> Exportar como .{exportFormat.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Dynamic Animated Glass Modal Inspector */}
      {isModalOpen && universalResult && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ background: 'var(--theme-light)', padding: '0.6rem', borderRadius: '12px', border: '1px solid var(--theme-border)' }}>
                  <Sparkles size={24} color="#c4b5fd" />
                </div>
                <h3 style={{ fontSize: '1.3rem' }}>Detalles del Análisis del Documento</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '12px' }}>
                <div><strong>Tipo:</strong> {universalResult.metadata?.description}</div>
                <div><strong>Tamaño:</strong> {Math.round((universalResult.metadata?.size_bytes || 0) / 1024)} KB</div>
                <div><strong>MIME:</strong> {universalResult.metadata?.mime}</div>
                <div><strong>Hash SHA-256:</strong> {universalResult.metadata?.hash_sha256?.substring(0, 16)}...</div>
              </div>

              {/* Contenido Extraído según formato */}
              {universalResult.analysis?.sheets && (
                <div>
                  <h4 style={{ color: '#34d399', marginBottom: '0.5rem' }}>Hojas de Excel Procesadas ({universalResult.analysis.sheets.length})</h4>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {universalResult.analysis.sheets.map((s: any, idx: number) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        Hoja "{s.sheet_name}": {s.rows_count} filas &bull; {s.embedded_images?.length || 0} imágenes OCR
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {universalResult.analysis?.slides && (
                <div>
                  <h4 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Diapositivas PowerPoint ({universalResult.analysis.slides.length})</h4>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {universalResult.analysis.slides.map((s: any, idx: number) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        Diapositiva {s.slide_index}: "{s.title}" &bull; {s.texts?.length || 0} bloques de texto
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-primary">
                Cerrar Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
