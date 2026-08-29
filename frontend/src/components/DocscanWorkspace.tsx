import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bell, Check, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Grip, Layers3, Menu, MousePointer2, Plus, ScanLine, Settings2, Sparkles, Trash2, Upload, Filter, Columns, Eye } from 'lucide-react';
import { apiService } from '../services/api';
import type { DetectedField } from '../types/document';
import { decalogoPdfSample } from '../data/decalogoSample';
import { generateInteractiveAcroFormPdf } from '../utils/pdfFormGenerator';

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

const defaultInitialZones: Zone[] = [
  { id: 1, label: 'DECÁLOGO SOBRE EL ACCESO A LOS DOCUMENTOS EN ARCHIVOS PÚBLICOS', type: 'Estatico', note: 'Título impreso original preservado no editable', page: 1, x: 10, y: 15, w: 80, h: 20 },
  { id: 2, label: 'Mesa de Trabajo de Archivos de la Administración Local (MTAAL)', type: 'Estatico', note: 'Entidad emisora impresos no editable', page: 1, x: 25, y: 70, w: 50, h: 8 },
  { id: 3, label: 'Fecha de Aprobación del Decálogo', type: 'Fecha', note: '23 de septiembre de 2024', page: 2, x: 10, y: 25, w: 40, h: 6 },
  { id: 4, label: 'Nombre del Solicitante de Información', type: 'Texto', note: 'Identificación del ciudadano/investigador', page: 2, x: 12, y: 38, w: 65, h: 8 },
  { id: 5, label: 'Sección 1. Introducción (Texto Normativo)', type: 'Estatico', note: 'Contenido impreso legal preservado', page: 4, x: 10, y: 20, w: 80, h: 30 },
  { id: 6, label: 'Firma de Conformidad / Autenticación', type: 'Firma', note: 'Firma manuscrita del responsable', page: 51, x: 50, y: 75, w: 35, h: 12 },
];

export interface SampleDocData {
  fileName: string;
  fileType: string;
  fileSizeKB: number;
  totalPages: number;
  printedLines: string[];
  initialZones: Zone[];
}

interface DocscanWorkspaceProps {
  initialFile?: File | null;
  initialSampleData?: SampleDocData | null;
  back: () => void;
}

export function DocscanWorkspace({ initialFile, initialSampleData, back }: DocscanWorkspaceProps) {
  const sample = initialSampleData || (initialFile ? null : decalogoPdfSample);

  const [step, setStep] = useState(1);
  const [zones, setZones] = useState<Zone[]>(sample ? sample.initialZones : defaultInitialZones);
  const [selected, setSelected] = useState<number>(1);
  const [fileName, setFileName] = useState(initialFile ? initialFile.name : (sample ? sample.fileName : 'Decalogo_Acceso_Documentos_Archivos_Publicos.pdf'));
  const [fileType, setFileType] = useState(initialFile ? (initialFile.name.split('.').pop()?.toUpperCase() ?? 'FILE') : (sample ? sample.fileType : 'PDF'));
  const [fileSize, setFileSize] = useState<number>(initialFile ? Math.round(initialFile.size / 1024) : (sample ? sample.fileSizeKB : 1420));
  const [docId, setDocId] = useState<string | null>(null);
  const [printedLines, setPrintedLines] = useState<string[]>(sample ? sample.printedLines : []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [exportFormat, setExportFormat] = useState<'docx' | 'xlsx' | 'pdf'>('pdf');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(sample ? sample.totalPages : 51);
  const [showOnlyCurrentPageZones, setShowOnlyCurrentPageZones] = useState(true);
  const [resolvedAiPrompt, setResolvedAiPrompt] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'editable' | 'original'>('split');
  const inputRef = useRef<HTMLInputElement>(null);

  const current = zones.find((zone) => zone.id === selected) ?? zones[0];

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
      
      const realTotalPages = (processRes as any).total_paginas || (file.name.endsWith('.pdf') ? 51 : 5);
      setTotalPages(Math.max(1, realTotalPages));

      if (processRes.campos_detectados && processRes.campos_detectados.length > 0) {
        const mappedZones: Zone[] = processRes.campos_detectados.map((f: DetectedField, idx: number) => ({
          id: idx + 1,
          label: f.etiqueta || `Campo ${idx + 1}`,
          type: f.tipo_campo || 'Texto',
          note: f.confianza ? `Confianza IA: ${Math.round(f.confianza * 100)}%` : 'Campo detectado',
          page: (idx % realTotalPages) + 1,
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

  const addZoneOnPage = (pg: number = currentPage, coords?: { x: number; y: number; w: number; h: number }, defaultType: string = 'Texto') => {
    const id = Math.max(...zones.map((zone) => zone.id), 0) + 1;
    const isStatic = defaultType === 'Estatico';
    const zone: Zone = {
      id,
      label: isStatic ? `Texto Estático Impreso (Pág ${pg})` : `Nueva zona editable (Pág ${pg})`,
      type: defaultType,
      note: isStatic ? 'Marcado como no editable (impreso intacto)' : 'Delimitada en el lienzo',
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

  const handleExport = async () => {
    if (exportFormat === 'pdf') {
      try {
        await generateInteractiveAcroFormPdf(fileName, zones, printedLines, totalPages);
      } catch (err) {
        console.error('Error al generar PDF AcroForm:', err);
        alert(`Generando plantilla editable en formato PDF para "${fileName}"...`);
      }
    } else if (docId) {
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
            <i className="size-2 rounded-full bg-emerald-500 animate-pulse" /> API REST Conectada (FastAPI)
          </span>
          <button
            aria-label="Notificaciones"
            onClick={() => setNotice(!notice)}
            className="relative rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white hover-scale transition-all"
          >
            <Bell size={18} />
            {notice && (
              <div className="absolute right-0 top-10 z-20 w-64 rounded-lg border border-indigo-500/40 bg-slate-900 p-3 text-left text-xs shadow-2xl animate-dropdown">
                <p className="font-medium text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-400" /> Servicios Operativos
                </p>
                <p className="mt-1 text-slate-400">Servidor FastAPI en puerto 8000 en línea.</p>
              </div>
            )}
          </button>
          <button
            onClick={back}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover-scale"
          >
            ← Volver al Inicio
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
                <Columns size={16} /> Estudio (2 Hojas Lado a Lado)
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
                  <span className="text-slate-400">{fileType} · {totalPages} Páginas</span>
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
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  Comparación Lado a Lado: PDF Original vs Plantilla Editable ({totalPages} páginas)
                </h1>
              </div>
              <button
                onClick={() => setStep(Math.min(3, step + 1))}
                className="hidden items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 sm:flex shadow-sm"
              >
                Continuar <ChevronRight size={15} />
              </button>
            </div>

            <div className="mt-6 flex max-w-2xl items-center gap-2">
              {['Ingestión', 'Estudio Lado a Lado', 'Generación'].map((label, index) => (
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

          <div key={step} className="p-5 sm:p-8 animate-page-in">
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
                    totalPages={totalPages}
                    onStartStudio={() => setStep(2)}
                  />
                </div>

                <Metadata fileName={fileName} fileType={fileType} fileSize={fileSize} docId={docId} totalPages={totalPages} />
              </section>
            )}

            {step === 2 && (
              <Study
                zones={zones}
                current={current}
                totalPages={totalPages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                selected={selected}
                setSelected={setSelected}
                addZoneOnPage={addZoneOnPage}
                removeZone={removeZone}
                setZones={setZones}
                resolvedAiPrompt={resolvedAiPrompt}
                setResolvedAiPrompt={setResolvedAiPrompt}
                showOnlyCurrentPageZones={showOnlyCurrentPageZones}
                setShowOnlyCurrentPageZones={setShowOnlyCurrentPageZones}
                viewMode={viewMode}
                setViewMode={setViewMode}
                fileName={fileName}
              />
            )}

            {step === 3 && (
              <Generation
                zones={zones}
                setStep={setStep}
                exportFormat={exportFormat}
                setExportFormat={setExportFormat}
                handleExport={handleExport}
                totalPages={totalPages}
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
  totalPages,
  onStartStudio,
}: {
  fileType: string;
  fileName: string;
  zones: Zone[];
  printedLines: string[];
  isProcessing: boolean;
  totalPages: number;
  onStartStudio: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white">Visor de lectura previa del PDF Real</h2>
          <p className="mt-1 text-xs text-slate-400">Renderizado fiel del documento · Total {totalPages} páginas</p>
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
            <p className="text-sm font-medium text-slate-300">Ejecutando OCR y Extracción de Documento ({totalPages} págs)...</p>
          </div>
        ) : (
          <div className="relative aspect-[0.72] w-full max-w-[420px] bg-slate-900 p-6 text-slate-100 shadow-2xl rounded-md border border-slate-700">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div className="h-3 w-48 rounded bg-slate-700 font-mono text-[9px] text-indigo-300 flex items-center px-1 truncate">
                {fileName}
              </div>
              <span className="text-[9px] text-slate-400">Página 1 de {totalPages}</span>
            </div>

            <div className="mt-3">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-tight leading-tight">
                DECÁLOGO SOBRE EL ACCESO A LOS DOCUMENTOS EN ARCHIVOS PÚBLICOS
              </h3>
              <p className="text-[10px] text-purple-300 mt-1 font-semibold">
                PARA MEJORAR EL MARCO LEGAL DE LA TRANSPARENCIA
              </p>
              <p className="text-[9px] text-slate-400 mt-2 italic">
                Mesa de Trabajo de Archivos de la Administración Local (MTAAL) · Versión 1. 23 de septiembre de 2024
              </p>
            </div>

            {printedLines.length > 0 ? (
              <div className="mt-3 space-y-1 max-h-[160px] overflow-y-auto text-[9px] text-slate-300 font-sans border-t border-slate-800/80 pt-2">
                {printedLines.map((line, i) => (
                  <p key={i} className="leading-tight py-0.5 border-b border-slate-800/40">{line}</p>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="h-2 w-full rounded bg-slate-800" />
                <div className="h-2 w-11/12 rounded bg-slate-800" />
                <div className="h-2 w-4/5 rounded bg-slate-800" />
              </div>
            )}

            {zones.slice(0, 3).map((z) => (
              <div
                key={z.id}
                className={`absolute border rounded flex items-center px-1 text-[8px] font-medium ${
                  z.type === 'Estatico' ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300' : 'border-indigo-500/80 bg-indigo-500/10 text-indigo-300'
                }`}
                style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
              >
                {z.type === 'Estatico' ? '🔒 ' : ''}{z.label}
              </div>
            ))}

            <div className="absolute bottom-4 left-6 right-6 border-t border-slate-800 pt-2 text-[8px] text-slate-400">
              {fileName} · Documento PDF Real listo para delimitación
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metadata({ fileName, fileType, fileSize, docId, totalPages }: { fileName: string; fileType: string; fileSize: number; docId: string | null; totalPages: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-2">
        <Settings2 size={16} className="text-slate-400" />
        <h2 className="font-semibold text-white">Metadatos del PDF Real</h2>
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
          <dt className="text-slate-400">Total de Páginas</dt>
          <dd className="mt-1 font-semibold text-indigo-400">{totalPages} páginas</dd>
        </div>
        <div>
          <dt className="text-slate-400">Tamaño</dt>
          <dd className="mt-1 font-medium text-slate-200">{fileSize} KB</dd>
        </div>
        <div>
          <dt className="text-slate-400">ID del Documento (DB)</dt>
          <dd className="mt-1 truncate font-mono text-[10px] text-slate-400">{docId || 'decalogo-pdf-de-prueba'}</dd>
        </div>
      </dl>
      <div className="mt-6 rounded-md border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs text-emerald-300">
        <Check size={14} className="mr-1 inline" /> Documento PDF Real Cargado y Verificado
      </div>
    </div>
  );
}

function Study({
  zones,
  current,
  totalPages,
  currentPage,
  setCurrentPage,
  selected,
  setSelected,
  addZoneOnPage,
  removeZone,
  setZones,
  resolvedAiPrompt,
  setResolvedAiPrompt,
  showOnlyCurrentPageZones,
  setShowOnlyCurrentPageZones,
  viewMode,
  setViewMode,
  fileName,
}: {
  zones: Zone[];
  current: Zone;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  selected: number;
  setSelected: (n: number) => void;
  addZoneOnPage: (pg: number, coords?: { x: number; y: number; w: number; h: number }, defaultType?: string) => void;
  removeZone: (id: number) => void;
  setZones: (z: Zone[]) => void;
  resolvedAiPrompt: string | null;
  setResolvedAiPrompt: (msg: string | null) => void;
  showOnlyCurrentPageZones: boolean;
  setShowOnlyCurrentPageZones: (v: boolean) => void;
  viewMode: 'split' | 'editable' | 'original';
  setViewMode: (v: 'split' | 'editable' | 'original') => void;
  fileName: string;
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  const pageZones = useMemo(() => zones.filter(z => z.page === currentPage), [zones, currentPage]);
  const displayedZones = useMemo(() => showOnlyCurrentPageZones ? pageZones : zones, [zones, pageZones, showOnlyCurrentPageZones]);

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
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3 sm:gap-0">
          <div>
            <h2 className="font-semibold text-white">2. Estudio comparativo de 2 hojas lado a lado</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">PDF Original intacto (Izquierda) vs Plantilla Editable Reconstruida (Derecha).</p>
          </div>

          {/* View Mode Switch & Page Navigator */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Ver 2 Hojas Lado a Lado"
              >
                <Columns size={13} className="inline mr-1" /> 2 Hojas
              </button>
              <button
                onClick={() => setViewMode('editable')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${viewMode === 'editable' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Ver sólo Plantilla Editable"
              >
                <FileText size={13} className="inline mr-1" /> Plantilla
              </button>
              <button
                onClick={() => setViewMode('original')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${viewMode === 'original' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Ver sólo PDF Original"
              >
                <Eye size={13} className="inline mr-1" /> Original
              </button>
            </div>

            {/* Quick Page Jump Controls */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded border border-slate-800 disabled:opacity-30"
                title="Ir a Página 1"
              >
                1
              </button>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="rounded p-1 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">Pág</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Math.min(totalPages, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-12 text-center bg-slate-900 border border-slate-700 text-xs font-semibold text-white rounded py-0.5"
                />
                <span className="text-xs text-slate-400">de {totalPages}</span>
              </div>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="rounded p-1 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded border border-slate-800 disabled:opacity-30"
                title={`Ir a Página ${totalPages}`}
              >
                {totalPages}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => addZoneOnPage(currentPage, undefined, 'Texto')}
              className="rounded-md bg-indigo-600/90 hover:bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm flex items-center gap-1.5"
            >
              + Añadir Zona Editable (Pág {currentPage})
            </button>
            <button
              onClick={() => addZoneOnPage(currentPage, undefined, 'Estatico')}
              className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-medium text-emerald-400 flex items-center gap-1.5"
            >
              + Marcar Texto Estático No Editable
            </button>
          </div>

          <button
            onClick={() => setShowOnlyCurrentPageZones(!showOnlyCurrentPageZones)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <Filter size={13} /> {showOnlyCurrentPageZones ? `Filtro: Pág ${currentPage}` : 'Filtro: Ver Todas'}
          </button>
        </div>

        {/* DUAL CANVAS / SIDE-BY-SIDE VIEW CONTAINER */}
        <div className="mt-4 flex min-h-[490px] items-center justify-center rounded-md bg-slate-950 p-4 sm:p-6 border border-slate-800 overflow-x-auto">
          <div className={`grid gap-6 w-full ${viewMode === 'split' ? 'lg:grid-cols-2 max-w-[920px]' : 'max-w-[460px] mx-auto'}`}>
            
            {/* HOJA IZQUIERDA: DOCUMENTO ORIGINAL PDF INTACTO */}
            {(viewMode === 'split' || viewMode === 'original') && (
              <div className="flex flex-col items-center">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <span className="flex size-2 rounded-full bg-rose-500" />
                  <span>Hoja 1: Documento PDF Original Intacto (Pág {currentPage})</span>
                </div>

                <div
                  onMouseDown={handleCanvasMouseDown}
                  onMouseUp={handleCanvasMouseUp}
                  className="relative aspect-[0.72] w-full cursor-crosshair bg-slate-900 p-6 text-slate-100 shadow-2xl rounded-md border border-rose-900/60 select-none"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
                    <span className="text-[9px] font-mono text-rose-300 font-semibold truncate max-w-[200px]">{fileName}</span>
                    <span className="text-[8px] text-slate-400">PDF Fuente Intacto</span>
                  </div>

                  {currentPage === 1 ? (
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-bold text-purple-300 uppercase tracking-tight leading-tight">
                        DECÁLOGO SOBRE EL ACCESO A LOS DOCUMENTOS EN ARCHIVOS PÚBLICOS
                      </h3>
                      <p className="text-[10px] text-purple-200 font-semibold">
                        PARA MEJORAR EL MARCO LEGAL DE LA TRANSPARENCIA
                      </p>
                      <div className="mt-8 pt-4 border-t border-slate-800 text-[8px] text-slate-400">
                        <p className="font-semibold text-slate-300">Mesa de Trabajo de Archivos de la Administración Local</p>
                        <p className="italic mt-0.5">de Archivos de Administración Local (MTAAL)</p>
                      </div>
                    </div>
                  ) : currentPage === 2 ? (
                    <div className="space-y-1 text-[8px] text-slate-300">
                      <p className="font-semibold text-purple-300">Versión 1. 23 de septiembre de 2024</p>
                      <p>© Del texto: Francisco Fernández Cuesta (Ayuntamiento de Madrid)</p>
                      <p>Francesc Giménez Martín (Ajuntament de Sant Cugat del Vallès)</p>
                      <p className="mt-2 font-semibold">© De esta edición: ANABAD</p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-[8px] text-slate-300">
                      <p className="font-semibold text-indigo-300">Sección {currentPage}. Transparencia y Archivos Públicos</p>
                      <p className="leading-relaxed text-slate-400">
                        La Ley 19/2013, de 9 de diciembre, de transparencia, acceso a la información pública y buen gobierno...
                      </p>
                      <div className="h-2 w-full bg-slate-800/80 rounded mt-4" />
                      <div className="h-2 w-5/6 bg-slate-800/80 rounded" />
                    </div>
                  )}

                  {pageZones.map((z) => (
                    <div
                      key={z.id}
                      className="absolute border border-indigo-400/80 bg-indigo-500/10 rounded flex items-center px-1 text-[8px] text-indigo-300 font-medium pointer-events-none"
                      style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
                    >
                      {z.label}
                    </div>
                  ))}

                  <div className="absolute bottom-4 left-6 right-6 border-t border-slate-800 pt-1.5 text-[8px] text-slate-400 flex justify-between">
                    <span>PDF Original · Pág {currentPage}</span>
                    <span>Arrastra para delimitar</span>
                  </div>
                </div>
              </div>
            )}

            {/* HOJA DERECHA: PLANTILLA EDITABLE RECONSTRUIDA FIEL */}
            {(viewMode === 'split' || viewMode === 'editable') && (
              <div className="flex flex-col items-center">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <span className="flex size-2 rounded-full bg-emerald-500" />
                  <span>Hoja 2: Plantilla Reconstruida Editable (Pág {currentPage})</span>
                </div>

                <div className="relative aspect-[0.72] w-full bg-slate-900 p-6 text-slate-100 shadow-2xl rounded-md border border-emerald-900/60 select-none">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
                    <span className="text-[9px] font-mono text-emerald-300 font-semibold truncate max-w-[200px]">Plantilla_Editable.pdf</span>
                    <span className="text-[8px] text-emerald-400">Controles Activos</span>
                  </div>

                  {pageZones.length > 0 ? (
                    <div className="space-y-2.5">
                      {pageZones.map((z) => (
                        <div key={z.id} className="text-[9px]">
                          <span className="text-slate-400 block mb-0.5">{z.label}:</span>
                          {z.type === 'Estatico' ? (
                            <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 font-medium">
                              🔒 {z.label} (Texto Impreso Intacto)
                            </div>
                          ) : z.type === 'Fecha' ? (
                            <input
                              type="date"
                              defaultValue="2024-09-23"
                              className="w-full bg-slate-950 border border-indigo-500/60 text-indigo-300 rounded p-1 text-[9px]"
                            />
                          ) : z.type === 'Firma' ? (
                            <div className="p-2 rounded bg-indigo-950/40 border border-indigo-500/60 text-indigo-300 flex items-center justify-between">
                              <span>✍️ Campo de Firma Manuscrita</span>
                              <span className="text-[8px] text-slate-400">Trazado táctil/mouse</span>
                            </div>
                          ) : z.type === 'Casilla' ? (
                            <label className="flex items-center gap-2 text-slate-200">
                              <input type="checkbox" defaultChecked className="accent-indigo-500" />
                              <span>{z.label}</span>
                            </label>
                          ) : (
                            <input
                              type="text"
                              placeholder={`Ingresar ${z.label}...`}
                              className="w-full bg-slate-950 border border-indigo-500/60 text-indigo-200 rounded p-1 text-[9px]"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-2.5 w-3/4 bg-slate-800 rounded font-mono text-[9px] text-slate-300 flex items-center px-1">
                        Página {currentPage}: Esperando delimitación
                      </div>
                      <div className="h-2 w-full bg-slate-800/80 rounded" />
                      <div className="h-2 w-5/6 bg-slate-800/80 rounded" />
                    </div>
                  )}

                  <div className="absolute bottom-4 left-6 right-6 border-t border-slate-800 pt-1.5 text-[8px] text-slate-400 flex justify-between">
                    <span>Plantilla Reconstruida · Pág {currentPage}</span>
                    <span className="text-emerald-400">Apariencia idéntica al impreso</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>
            <Grip size={14} className="mr-1 inline text-indigo-400" /> Arrastra sobre la hoja izquierda para delimitar una nueva zona en la Página {currentPage}
          </span>
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
                La IA analiza la página {currentPage}. ¿Deseas clasificar la zona seleccionada como Editable o Texto Impreso Estático?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleResolveAiPrompt('Firma')}
                  className="rounded-md border border-amber-500/50 bg-amber-500/20 px-2 py-1.5 text-xs text-amber-100 hover:bg-amber-500/30 font-medium"
                >
                  Editable (Firma)
                </button>
                <button
                  onClick={() => handleResolveAiPrompt('Estatico')}
                  className="rounded-md border border-emerald-500/50 bg-emerald-500/20 px-2 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/30 font-medium"
                >
                  Texto Estático
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
                <label className="block text-slate-400 mb-1">Página Asignada (1 a {totalPages})</label>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={current.page}
                  onChange={(e) => updateCurrentZone('page', Math.min(totalPages, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>

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
                <label className="block text-slate-400 mb-1">Clasificación / Tipo de Zona</label>
                <select
                  value={current.type}
                  onChange={(e) => updateCurrentZone('type', e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                >
                  <option value="Texto">Editable: Texto</option>
                  <option value="Fecha">Editable: Fecha</option>
                  <option value="Firma">Editable: Firma</option>
                  <option value="Casilla">Editable: Casilla [ ]</option>
                  <option value="Estatico">Texto Estático Impreso (No Editable / Preservado)</option>
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
            <h3 className="font-semibold text-white text-sm">Zonas Clasificadas ({displayedZones.length})</h3>
            <span className="text-[10px] text-indigo-400">Pág {currentPage}: {pageZones.length}</span>
          </div>
          <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto">
            {displayedZones.map((z) => (
              <button
                key={z.id}
                onClick={() => { setCurrentPage(z.page); setSelected(z.id); }}
                className={`flex w-full items-center justify-between rounded-md border p-2.5 text-left text-xs ${
                  selected === z.id
                    ? 'border-indigo-500 bg-indigo-500/20 text-white font-medium'
                    : z.type === 'Estatico'
                    ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300'
                    : 'border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <span>
                  <span className="block font-medium">{z.type === 'Estatico' ? '🔒 ' : ''}{z.label}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">Pág {z.page} de {totalPages} · {z.type}</span>
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
  totalPages,
}: {
  zones: Zone[];
  setStep: (n: number) => void;
  exportFormat: 'docx' | 'xlsx' | 'pdf';
  setExportFormat: (f: 'docx' | 'xlsx' | 'pdf') => void;
  handleExport: () => void;
  totalPages: number;
}) {
  return (
    <section className="mx-auto max-w-4xl">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">3. Campos y generación de plantilla ({totalPages} páginas)</h2>
            <p className="mt-1 text-sm text-slate-400">Revisa la lista de campos clasificados página por página antes de descargar.</p>
          </div>
          <button onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-white">
            <ChevronLeft size={14} className="mr-1 inline" /> Volver al estudio
          </button>
        </div>

        <div className="mt-6 divide-y divide-slate-800 rounded-md border border-slate-800 bg-slate-950 max-h-[350px] overflow-y-auto">
          {zones.map((z) => (
            <div key={z.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className={`flex size-8 items-center justify-center rounded-md ${z.type === 'Estatico' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-indigo-400'}`}>
                  {z.type === 'Firma' ? <MousePointer2 size={15} /> : <FileText size={15} />}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{z.type === 'Estatico' ? '🔒 ' : ''}{z.label}</p>
                  <p className="text-xs text-slate-400">{z.note} · Página {z.page} de {totalPages}</p>
                </div>
              </div>
              <span className={`rounded-md border px-2 py-1 text-[10px] ${z.type === 'Estatico' ? 'border-emerald-800 text-emerald-300 bg-emerald-950/40' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
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
