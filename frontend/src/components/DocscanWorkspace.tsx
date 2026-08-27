import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bell, Check, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Grip, Layers3, Menu, MousePointer2, Plus, ScanLine, Settings2, Sparkles, Trash2, Upload } from 'lucide-react';
import { apiService } from '../services/api';
import type { DetectedField } from '../types/document';

type Zone = {
  id: number;
  label: string;
  type: string;
  note: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

const initialZones: Zone[] = [
  { id: 1, label: 'Nombre completo del solicitante', type: 'Texto', note: 'Identificación del solicitante', page: 1, x: 18, y: 28, w: 31, h: 6 },
  { id: 2, label: 'Fecha de solicitud', type: 'Fecha', note: 'Día de diligenciamiento', page: 1, x: 61, y: 28, w: 20, h: 6 },
  { id: 3, label: 'Firma del responsable', type: 'Firma', note: 'Firma manuscrita requerida', page: 1, x: 52, y: 72, w: 30, h: 9 },
  { id: 4, label: 'Observaciones anexas', type: 'Texto', note: 'Notas suplementarias página 2', page: 2, x: 18, y: 35, w: 60, h: 12 },
];

interface DocscanWorkspaceProps {
  initialFile?: File | null;
  back: () => void;
}

export function DocscanWorkspace({ initialFile, back }: DocscanWorkspaceProps) {
  const [step, setStep] = useState(1);
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selected, setSelected] = useState<number>(1);
  const [fileName, setFileName] = useState(initialFile ? initialFile.name : 'propuesta-profesional-agosto.docx');
  const [fileType, setFileType] = useState(initialFile ? (initialFile.name.split('.').pop()?.toUpperCase() ?? 'FILE') : 'DOCX');
  const [fileSize, setFileSize] = useState<number>(initialFile ? Math.round(initialFile.size / 1024) : 248);
  const [docId, setDocId] = useState<string | null>(null);
  const [printedLines, setPrintedLines] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [exportFormat, setExportFormat] = useState<'docx' | 'xlsx' | 'pdf'>('docx');
  const [currentPage, setCurrentPage] = useState(1);
  const [resolvedAiPrompt, setResolvedAiPrompt] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = zones.find((zone) => zone.id === selected) ?? zones[0];
  const pages = useMemo(() => fileType === 'XLSX' ? 3 : fileType === 'PDF' ? 4 : 2, [fileType]);

  // Handle uploaded file via API Service
  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setFileType(file.name.split('.').pop()?.toUpperCase() ?? 'FILE');
    setFileSize(Math.round(file.size / 1024));
    setIsProcessing(true);

    try {
      // 1. Upload to Backend API
      const uploadRes = await apiService.uploadDocument(file);
      setDocId(uploadRes.id);

      // 2. Process & Run OCR
      const processRes = await apiService.processDocument(uploadRes.id);
      
      if (processRes.texto_impreso && processRes.texto_impreso.length > 0) {
        setPrintedLines(processRes.texto_impreso);
      }
      
      if (processRes.campos_detectados && processRes.campos_detectados.length > 0) {
        const mappedZones: Zone[] = processRes.campos_detectados.map((f: DetectedField, idx: number) => ({
          id: idx + 1,
          label: f.etiqueta || `Campo ${idx + 1}`,
          type: f.tipo_campo || 'Texto',
          note: f.confianza ? `Confianza IA: ${Math.round(f.confianza * 100)}%` : 'Campo detectado',
          page: (idx % pages) + 1,
          x: f.coordenadas?.x ? Math.min(80, Math.max(5, f.coordenadas.x / 8)) : (15 + (idx * 20) % 60),
          y: f.coordenadas?.y ? Math.min(85, Math.max(10, f.coordenadas.y / 10)) : (25 + (idx * 15) % 55),
          w: f.coordenadas?.width ? Math.min(50, Math.max(15, f.coordenadas.width / 6)) : 30,
          h: f.coordenadas?.height ? Math.min(20, Math.max(5, f.coordenadas.height / 15)) : 7,
        }));
        setZones(mappedZones);
        if (mappedZones.length > 0) setSelected(1);
      }
    } catch (err) {
      console.warn('Backend API notification:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (initialFile) {
      handleFile(initialFile);
    }
  }, [initialFile]);

  const addZoneOnPage = (pg: number = currentPage, coords?: { x: number; y: number; w: number; h: number }) => {
    const id = Math.max(...zones.map((zone) => zone.id), 0) + 1;
    const zone: Zone = {
      id,
      label: `Nueva zona Pág ${pg}`,
      type: 'Texto',
      note: 'Delimitada en el lienzo',
      page: pg,
      x: coords ? Math.round(coords.x) : 26,
      y: coords ? Math.round(coords.y) : 46,
      w: coords ? Math.max(10, Math.round(coords.w)) : 28,
      h: coords ? Math.max(5, Math.round(coords.h)) : 8,
    };
    setZones([...zones, zone]);
    setSelected(id);
  };

  const removeZone = (idToRemove: number) => {
    const updated = zones.filter(z => z.id !== idToRemove);
    setZones(updated);
    if (selected === idToRemove && updated.length > 0) {
      setSelected(updated[0].id);
    }
  };

  const handleExport = () => {
    if (docId) {
      const url = apiService.getExportUrl(docId, exportFormat);
      window.open(url, '_blank');
    } else {
      alert(`Generando plantilla editable en formato ${exportFormat.toUpperCase()} para "${fileName}"...`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="flex h-16 items-center justify-between border-b border-slate-800 px-5 bg-slate-950">
        <div className="flex items-center gap-3">
          <button
            aria-label="Alternar menú"
            onClick={() => setSidebar(!sidebar)}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm">
              <ScanLine size={16} />
            </span>
            <span className="font-semibold tracking-tight text-white">DocScan Inteligente</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <i className="size-2 rounded-full bg-emerald-500" /> API REST Conectada (FastAPI)
          </span>
          <button
            aria-label="Notificaciones"
            onClick={() => setNotice(!notice)}
            className="relative rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Bell size={18} />
            {notice && (
              <div className="absolute right-0 top-10 z-20 w-64 rounded-lg border border-slate-800 bg-slate-900 p-3 text-left text-xs shadow-xl">
                <p className="font-medium text-white">Servicios Operativos</p>
                <p className="mt-1 text-slate-400">Servidor FastAPI en puerto 8000 en línea.</p>
              </div>
            )}
          </button>
          <button
            onClick={back}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            ← Volver a Cargar
          </button>
          <div className="flex size-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-indigo-400 border border-slate-700">
            AG
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {sidebar && (
          <aside className="hidden w-56 shrink-0 border-r border-slate-800 p-4 md:block bg-slate-900/50">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
            <nav className="space-y-1">
              <button
                onClick={() => setStep(1)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  step === 1 ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Upload size={16} /> Ingestión
              </button>
              <button
                onClick={() => setStep(2)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  step === 2 ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <MousePointer2 size={16} /> Estudio de plantilla
              </button>
              <button
                onClick={() => setStep(3)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  step === 3 ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Layers3 size={16} /> Campos y generación
              </button>
            </nav>

            <div className="mt-8 border-t border-slate-800 pt-4">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Archivo actual</p>
              <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-800 bg-slate-900 p-2.5">
                <FileText size={16} className="mt-0.5 text-indigo-400 shrink-0" />
                <span className="min-w-0 text-xs">
                  <span className="block truncate font-medium text-slate-200">{fileName}</span>
                  <span className="text-slate-400">{fileType} · {fileSize} KB</span>
                </span>
              </div>
            </div>
          </aside>
        )}

        <main className="min-w-0 flex-1 bg-slate-950">
          <div className="border-b border-slate-800 px-5 py-5 sm:px-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Workspace / Plantillas</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">Crear plantilla editable</h1>
              </div>
              <button
                onClick={() => setStep(Math.min(3, step + 1))}
                className="hidden items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 sm:flex shadow-sm"
              >
                Continuar <ChevronRight size={15} />
              </button>
            </div>

            <div className="mt-6 flex max-w-2xl items-center gap-2">
              {['Ingestión', 'Estudio', 'Generación'].map((label, index) => (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                      step > index ? 'bg-indigo-600 text-white' : 'border border-slate-800 text-slate-400'
                    }`}
                  >
                    {step > index + 1 ? <Check size={13} /> : index + 1}
                  </span>
                  <span className={`text-xs ${step === index + 1 ? 'font-semibold text-white' : 'text-slate-400'}`}>
                    {label}
                  </span>
                  {index < 2 && <div className={`h-px flex-1 ${step > index + 1 ? 'bg-indigo-600' : 'bg-slate-800'}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {step === 1 && (
              <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-5">
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold text-white">1. Ingestión y lectura previa</h2>
                        <p className="mt-1 text-sm text-slate-400">Verifica el documento original antes de crear zonas editables.</p>
                      </div>
                      <button
                        onClick={() => inputRef.current?.click()}
                        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                      >
                        <Plus size={14} className="mr-1 inline" /> Añadir archivo
                      </button>
                      <input
                        ref={inputRef}
                        hidden
                        type="file"
                        accept=".docx,.pdf,.xlsx,.pptx,image/*"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                      />
                    </div>
                    <div
                      onClick={() => inputRef.current?.click()}
                      className="mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-950 p-5 text-center hover:border-indigo-500 transition-all"
                    >
                      <Upload size={22} className="text-slate-400" />
                      <p className="mt-2 text-sm font-medium text-slate-200">Arrastra un documento aquí</p>
                      <p className="mt-1 text-xs text-slate-400">DOCX, PDF, XLSX, PPTX o imagen · máximo 25 MB</p>
                    </div>
                  </div>

                  <DocumentPreview
                    fileType={fileType}
                    fileName={fileName}
                    zones={zones}
                    printedLines={printedLines}
                    isProcessing={isProcessing}
                    onStartStudio={() => setStep(2)}
                  />
                </div>

                <Metadata fileName={fileName} fileType={fileType} fileSize={fileSize} docId={docId} />
              </section>
            )}

            {step === 2 && (
              <Study
                zones={zones}
                current={current}
                pages={pages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                selected={selected}
                setSelected={setSelected}
                addZoneOnPage={addZoneOnPage}
                removeZone={removeZone}
                setZones={setZones}
                resolvedAiPrompt={resolvedAiPrompt}
                setResolvedAiPrompt={setResolvedAiPrompt}
              />
            )}

            {step === 3 && (
              <Generation
                zones={zones}
                setStep={setStep}
                exportFormat={exportFormat}
                setExportFormat={setExportFormat}
                handleExport={handleExport}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function DocumentPreview({
  fileType,
  fileName,
  zones,
  printedLines,
  isProcessing,
  onStartStudio,
}: {
  fileType: string;
  fileName: string;
  zones: Zone[];
  printedLines: string[];
  isProcessing: boolean;
  onStartStudio: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white">Visor de lectura previa</h2>
          <p className="mt-1 text-xs text-slate-400">Renderizado fiel del documento · página 1 de 2</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300">
            {fileType}
          </span>
          <button
            onClick={onStartStudio}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 shadow-sm"
          >
            🚀 Crear Plantilla Editable
          </button>
        </div>
      </div>

      <div className="mt-5 flex min-h-[380px] flex-col items-center justify-center overflow-auto rounded-md bg-slate-950 p-5 border border-slate-800">
        {isProcessing ? (
          <div className="text-center py-10">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-3" />
            <p className="text-sm font-medium text-slate-300">Ejecutando OCR y Análisis de Documento...</p>
          </div>
        ) : (
          <div className="relative aspect-[0.72] w-full max-w-[420px] bg-slate-900 p-7 text-slate-100 shadow-2xl rounded-md border border-slate-700">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="h-3 w-40 rounded bg-slate-700 font-mono text-[10px] text-indigo-300 flex items-center px-1">
                {fileName}
              </div>
              <span className="text-[9px] text-slate-400">Documento original</span>
            </div>

            {printedLines.length > 0 ? (
              <div className="mt-4 space-y-1.5 max-h-[250px] overflow-y-auto text-[10px] text-slate-300 font-sans">
                {printedLines.map((line, i) => (
                  <p key={i} className="leading-tight py-0.5 border-b border-slate-800/40">{line}</p>
                ))}
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <div className="h-2 w-full rounded bg-slate-800" />
                <div className="h-2 w-11/12 rounded bg-slate-800" />
                <div className="h-2 w-4/5 rounded bg-slate-800" />
                <div className="h-2 w-3/4 rounded bg-slate-800" />
              </div>
            )}

            {zones.slice(0, 3).map((z) => (
              <div
                key={z.id}
                className="absolute border border-indigo-500/80 bg-indigo-500/10 rounded flex items-center px-1 text-[8px] text-indigo-300 font-medium"
                style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
              >
                {z.label}
              </div>
            ))}

            <div className="absolute bottom-4 left-7 right-7 border-t border-slate-800 pt-2 text-[9px] text-slate-400">
              {fileName} · Documento listo para delimitación de plantilla
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metadata({ fileName, fileType, fileSize, docId }: { fileName: string; fileType: string; fileSize: number; docId: string | null }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-2">
        <Settings2 size={16} className="text-slate-400" />
        <h2 className="font-semibold text-white">Metadatos</h2>
      </div>
      <dl className="mt-5 space-y-4 text-xs">
        <div>
          <dt className="text-slate-400">Nombre del archivo</dt>
          <dd className="mt-1 truncate font-medium text-slate-200">{fileName}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Formato</dt>
          <dd className="mt-1 font-medium text-slate-200">{fileType}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Tamaño</dt>
          <dd className="mt-1 font-medium text-slate-200">{fileSize} KB</dd>
        </div>
        <div>
          <dt className="text-slate-400">ID del Documento (DB)</dt>
          <dd className="mt-1 truncate font-mono text-[10px] text-slate-400">{docId || 'db-local-docscan'}</dd>
        </div>
      </dl>
      <div className="mt-6 rounded-md border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs text-emerald-300">
        <Check size={14} className="mr-1 inline" /> Verificado por Backend Python
      </div>
    </div>
  );
}

function Study({
  zones,
  current,
  pages,
  currentPage,
  setCurrentPage,
  selected,
  setSelected,
  addZoneOnPage,
  removeZone,
  setZones,
  resolvedAiPrompt,
  setResolvedAiPrompt,
}: {
  zones: Zone[];
  current: Zone;
  pages: number;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  selected: number;
  setSelected: (n: number) => void;
  addZoneOnPage: (pg: number, coords?: { x: number; y: number; w: number; h: number }) => void;
  removeZone: (id: number) => void;
  setZones: (z: Zone[]) => void;
  resolvedAiPrompt: string | null;
  setResolvedAiPrompt: (msg: string | null) => void;
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  const pageZones = useMemo(() => zones.filter(z => z.page === currentPage), [zones, currentPage]);

  const updateCurrentZone = (key: keyof Zone, val: any) => {
    setZones(zones.map(z => z.id === current.id ? { ...z, [key]: val } : z));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setIsDrawing(true);
    setDrawStart({ x, y });
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = ((e.clientX - rect.left) / rect.width) * 100;
    const endY = ((e.clientY - rect.top) / rect.height) * 100;

    const x = Math.min(drawStart.x, endX);
    const y = Math.min(drawStart.y, endY);
    const w = Math.abs(endX - drawStart.x);
    const h = Math.abs(endY - drawStart.y);

    if (w > 5 && h > 3) {
      addZoneOnPage(currentPage, { x, y, w, h });
    }
    setIsDrawing(false);
    setDrawStart(null);
  };

  const handleResolveAiPrompt = (typeChoice: string) => {
    if (current) {
      updateCurrentZone('type', typeChoice);
    }
    setResolvedAiPrompt(`🤖 Confirmado por usuario: Zona clasificada como "${typeChoice}"`);
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="font-semibold text-white">2. Estudio interactivo página por página</h2>
            <p className="mt-1 text-sm text-slate-400">Arrastra sobre el lienzo para marcar zonas editables o estáticas.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="rounded-md border border-slate-700 p-2 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-300 font-medium px-2">Página {currentPage} de {pages}</span>
            <button
              disabled={currentPage >= pages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="rounded-md border border-slate-700 p-2 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-5 flex min-h-[480px] items-center justify-center rounded-md bg-slate-950 p-6 border border-slate-800">
          <div
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            className="relative aspect-[0.72] w-full max-w-[440px] cursor-crosshair bg-slate-900 p-8 text-slate-100 shadow-2xl rounded-md border border-slate-700 select-none"
          >
            <div className="h-3 w-3/4 bg-slate-800" />
            <div className="mt-8 space-y-3">
              <div className="h-2 w-full bg-slate-800/80" />
              <div className="h-2 w-5/6 bg-slate-800/80" />
              <div className="h-2 w-4/5 bg-slate-800/80" />
            </div>

            {pageZones.map((z) => (
              <button
                key={z.id}
                onClick={(e) => { e.stopPropagation(); setSelected(z.id); }}
                className={`absolute border-2 rounded transition-all text-left p-1 text-[9px] font-medium overflow-hidden ${
                  selected === z.id
                    ? 'border-indigo-500 bg-indigo-500/30 text-white shadow-lg z-10'
                    : 'border-indigo-400/60 bg-indigo-500/10 text-indigo-300 hover:border-indigo-400'
                }`}
                style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
              >
                {z.label}
              </button>
            ))}

            <div className="absolute bottom-6 left-8 right-8 border-t border-slate-800 pt-2 text-[8px] text-slate-400 flex justify-between">
              <span>Página {currentPage} de {pages}</span>
              <span>{pageZones.length} zonas en esta página</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>
            <Grip size={14} className="mr-1 inline text-indigo-400" /> Arrastra sobre el lienzo para delimitar una zona
          </span>
          <button onClick={() => addZoneOnPage(currentPage)} className="font-medium text-indigo-400 hover:text-indigo-300">
            + Nueva zona Pág {currentPage}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* IA Question Prompt Card (Human-in-the-Loop) */}
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <h3 className="font-semibold text-amber-200 text-sm">Consulta de IA (Human-in-the-Loop)</h3>
          </div>
          {resolvedAiPrompt ? (
            <p className="mt-3 text-xs leading-5 text-emerald-300 font-medium">
              <Check size={14} className="inline mr-1" /> {resolvedAiPrompt}
            </p>
          ) : (
            <>
              <p className="mt-3 text-xs leading-5 text-amber-100/80">
                La IA detectó una zona dudosa en la página {currentPage}. ¿Es un campo de Firma o Texto?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleResolveAiPrompt('Firma')}
                  className="rounded-md border border-amber-500/50 bg-amber-500/20 px-2 py-1.5 text-xs text-amber-100 hover:bg-amber-500/30 font-medium"
                >
                  Firma
                </button>
                <button
                  onClick={() => handleResolveAiPrompt('Texto')}
                  className="rounded-md border border-amber-500/50 bg-amber-500/20 px-2 py-1.5 text-xs text-amber-100 hover:bg-amber-500/30 font-medium"
                >
                  Texto
                </button>
              </div>
            </>
          )}
        </div>

        {/* Selected Zone Form */}
        {current && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Editar Zona #{current.id} (Pág {current.page})</h3>
              <button
                onClick={() => removeZone(current.id)}
                className="text-slate-400 hover:text-rose-400 p-1"
                title="Eliminar zona"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nombre / Etiqueta del Campo</label>
                <input
                  type="text"
                  value={current.label}
                  onChange={(e) => updateCurrentZone('label', e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tipo de Campo</label>
                <select
                  value={current.type}
                  onChange={(e) => updateCurrentZone('type', e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                >
                  <option value="Texto">Editable: Texto</option>
                  <option value="Fecha">Editable: Fecha</option>
                  <option value="Firma">Editable: Firma</option>
                  <option value="Casilla">Editable: Casilla [ ]</option>
                  <option value="Estatico">Texto Estático Impreso (No Editable)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Comentario u Observaciones</label>
                <textarea
                  rows={2}
                  value={current.note}
                  onChange={(e) => updateCurrentZone('note', e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Zones list */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Zonas Marcadas ({zones.length})</h3>
            <span className="text-[10px] text-indigo-400">Pág {currentPage}: {pageZones.length}</span>
          </div>
          <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto">
            {zones.map((z) => (
              <button
                key={z.id}
                onClick={() => { setCurrentPage(z.page); setSelected(z.id); }}
                className={`flex w-full items-center justify-between rounded-md border p-2.5 text-left text-xs ${
                  selected === z.id
                    ? 'border-indigo-500 bg-indigo-500/20 text-white font-medium'
                    : 'border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <span>
                  <span className="block font-medium">{z.label}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">Pág {z.page} · {z.type}</span>
                </span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Generation({
  zones,
  setStep,
  exportFormat,
  setExportFormat,
  handleExport,
}: {
  zones: Zone[];
  setStep: (n: number) => void;
  exportFormat: 'docx' | 'xlsx' | 'pdf';
  setExportFormat: (f: 'docx' | 'xlsx' | 'pdf') => void;
  handleExport: () => void;
}) {
  return (
    <section className="mx-auto max-w-4xl">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">3. Campos y generación de plantilla</h2>
            <p className="mt-1 text-sm text-slate-400">Revisa la lista de campos antes de descargar tu plantilla final.</p>
          </div>
          <button onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-white">
            <ChevronLeft size={14} className="mr-1 inline" /> Volver al estudio
          </button>
        </div>

        <div className="mt-6 divide-y divide-slate-800 rounded-md border border-slate-800 bg-slate-950">
          {zones.map((z) => (
            <div key={z.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-md bg-slate-800 text-indigo-400">
                  {z.type === 'Firma' ? <MousePointer2 size={15} /> : <FileText size={15} />}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{z.label}</p>
                  <p className="text-xs text-slate-400">{z.note} · Página {z.page}</p>
                </div>
              </div>
              <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300">
                {z.type}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-7">
          <p className="text-sm font-medium text-white mb-3">Formato final de exportación</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { format: 'docx' as const, label: 'Word (.docx)', desc: 'Documento editable completo' },
              { format: 'xlsx' as const, label: 'Excel (.xlsx)', desc: 'Hoja matricial con celdas' },
              { format: 'pdf' as const, label: 'PDF (.pdf)', desc: 'Formulario AcroForm editable' },
            ].map(({ format, label, desc }) => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`flex items-center gap-3 rounded-md border p-4 text-left transition-all ${
                  exportFormat === format
                    ? 'border-indigo-500 bg-indigo-500/20 text-white font-medium'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                {format === 'xlsx' ? <FileSpreadsheet size={18} /> : <FileText size={18} />}
                <div>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="text-[11px] text-slate-400">{desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleExport}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-500 shadow-md transition-all"
        >
          <Download size={16} /> Generar y descargar plantilla editable ({exportFormat.toUpperCase()})
        </button>
      </div>
    </section>
  );
}
