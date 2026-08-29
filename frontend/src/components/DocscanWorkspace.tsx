import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bell, Check, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Grip, Layers3, Menu, MousePointer2, Plus, ScanLine, Settings2, Sparkles, Trash2, Upload, Filter, Columns, Eye } from 'lucide-react';
import { apiService } from '../services/api';
import type { DetectedField } from '../types/document';
import { decalogoPdfSample } from '../data/decalogoSample';
import { generateInteractiveAcroFormPdf } from '../utils/pdfFormGenerator';
import { RealPdfViewer } from './RealPdfViewer';

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
  { id: 2, label: 'Mesa de Trabajo de Archivos de la Administración Local (MTAAL)', type: 'Estatico', note: 'Entidad emisora impresa no editable', page: 1, x: 25, y: 70, w: 50, h: 8 },
  { id: 3, label: 'Fecha de Aprobación del Decálogo', type: 'Fecha', note: '23 de septiembre de 2024', page: 2, x: 10, y: 25, w: 40, h: 6 },
  { id: 4, label: 'Autores y Coordinación', type: 'Texto', note: 'Francisco Fernández Cuesta & Francesc Giménez Martín', page: 2, x: 12, y: 38, w: 65, h: 8 },
  { id: 5, label: 'Sección 1. Introducción (Texto Normativo)', type: 'Estatico', note: 'Texto normativo introductorio no editable', page: 4, x: 10, y: 20, w: 80, h: 30 },
  { id: 6, label: 'Firma de Conformidad Archivística', type: 'Firma', note: 'Firma del representante de la MTAAL', page: 5, x: 50, y: 75, w: 35, h: 12 },
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

  const [fileUrl, setFileUrl] = useState<string | null>(
    initialFile ? URL.createObjectURL(initialFile) : null
  );
  const [step, setStep] = useState(1);
  const [zones, setZones] = useState<Zone[]>(sample ? sample.initialZones : defaultInitialZones);
  const [selected, setSelected] = useState<number>(1);
  const [fileName, setFileName] = useState(initialFile ? initialFile.name : (sample ? sample.fileName : 'Decalogo_Acceso_Documentos_Archivos_Publicos.pdf'));
  const [fileType, setFileType] = useState(initialFile ? (initialFile.name.split('.').pop()?.toUpperCase() ?? 'FILE') : (sample ? sample.fileType : 'PDF'));
  const [fileSize, setFileSize] = useState<number>(initialFile ? Math.round(initialFile.size / 1024) : (sample ? sample.fileSizeKB : 1420));
  const [docId, setDocId] = useState<string | null>(null);
  const [printedLines, setPrintedLines] = useState<string[]>(sample ? sample.printedLines : []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [exportFormat, setExportFormat] = useState<'docx' | 'xlsx' | 'pdf'>('pdf');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(sample ? sample.totalPages : 51);
  const [showOnlyCurrentPageZones, setShowOnlyCurrentPageZones] = useState(true);
  const [resolvedAiPrompt, setResolvedAiPrompt] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'editable' | 'original'>('split');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFile) {
      const url = URL.createObjectURL(initialFile);
      setFileUrl(url);
    }
  }, [initialFile]);

  const current = zones.find((zone) => zone.id === selected) ?? zones[0];

  // Handle uploaded file via API Service
  const handleFile = async (file?: File) => {
    if (!file) return;
    const newObjectUrl = URL.createObjectURL(file);
    setFileUrl(newObjectUrl);
    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
    setFileName(file.name);
    setFileType(ext);
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
      } else {
        // Adapt default zones to totalPages
        setZones(defaultInitialZones.map(z => ({ ...z, page: Math.min(realTotalPages, z.page) })));
      }
    } catch (err) {
      console.warn('Backend API notification:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const addZoneOnPage = (targetPage: number, coords?: { x: number; y: number; w: number; h: number }) => {
    const id = Date.now();
    const zone: Zone = {
      id,
      label: `Nueva Zona ${zones.length + 1}`,
      type: 'Texto',
      note: 'Instrucción de usuario',
      page: targetPage,
      x: coords ? Math.max(5, Math.round(coords.x)) : 20,
      y: coords ? Math.max(5, Math.round(coords.y)) : 30,
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
      {/* Sleek Workspace Sub-Bar (Sin encabezados duplicados!) */}
      <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            aria-label="Alternar menú lateral"
            onClick={() => setSidebar(!sidebar)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white hover-scale"
            title="Alternar menú lateral"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Workspace</span>
            <span className="text-slate-600">/</span>
            <span className="font-semibold text-slate-200 truncate max-w-[180px] sm:max-w-xs">{fileName}</span>
            <span className="hidden sm:inline-flex items-center rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-indigo-400">
              {fileType} · {totalPages} {totalPages === 1 ? 'pág' : 'págs'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
            <i className="size-2 rounded-full bg-emerald-500 animate-pulse" /> API REST (FastAPI)
          </span>
          <button
            onClick={back}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 hover-scale"
          >
            ← Volver al Inicio
          </button>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-3rem)]">
        {sidebar && (
          <aside className="hidden w-56 shrink-0 border-r border-slate-800 p-4 md:block bg-slate-900/50">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Navegación</p>
            <nav className="space-y-1">
              <button
                onClick={() => setStep(1)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover-scale ${
                  step === 1 ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Upload size={16} /> 1. Ingestión
              </button>
              <button
                onClick={() => setStep(2)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover-scale ${
                  step === 2 ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Columns size={16} /> 2. Estudio Lado a Lado
              </button>
              <button
                onClick={() => setStep(3)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover-scale ${
                  step === 3 ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Layers3 size={16} /> 3. Campos y generación
              </button>
            </nav>

            <div className="mt-8 border-t border-slate-800 pt-4">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Archivo activo</p>
              <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-800 bg-slate-900 p-2.5">
                <FileText size={16} className="mt-0.5 text-indigo-400 shrink-0" />
                <span className="min-w-0 text-xs">
                  <span className="block truncate font-medium text-slate-200">{fileName}</span>
                  <span className="text-slate-400">{fileType} · {totalPages} {totalPages === 1 ? 'Página' : 'Páginas'}</span>
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
                  Comparación Lado a Lado: Documento {fileType} Original vs Plantilla Editable ({totalPages} {totalPages === 1 ? 'página' : 'páginas'})
                </h1>
              </div>
              <button
                onClick={() => setStep(Math.min(3, step + 1))}
                className="hidden items-center gap-2 rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-500 sm:flex shadow-sm btn-glow"
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
                        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover-scale"
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
                      className="mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-950 p-5 text-center hover:border-indigo-500 transition-all hover-scale"
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
                    pdfUrl={fileUrl || '/sample_tika.pdf'}
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
                onProceedToGeneration={() => setStep(3)}
                showOnlyCurrentPageZones={showOnlyCurrentPageZones}
                setShowOnlyCurrentPageZones={setShowOnlyCurrentPageZones}
                resolvedAiPrompt={resolvedAiPrompt}
                setResolvedAiPrompt={setResolvedAiPrompt}
                viewMode={viewMode}
                setViewMode={setViewMode}
                fileName={fileName}
                fileType={fileType}
                pdfUrl={fileUrl || '/sample_tika.pdf'}
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
                fileName={fileName}
                fileType={fileType}
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
  pdfUrl,
  onStartStudio,
}: {
  fileType: string;
  fileName: string;
  zones: Zone[];
  printedLines: string[];
  isProcessing: boolean;
  totalPages: number;
  pdfUrl: string;
  onStartStudio: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white">Visor de lectura previa del documento</h2>
          <p className="mt-1 text-xs text-slate-400">Renderizado fiel del documento · Total {totalPages} {totalPages === 1 ? 'página' : 'páginas'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 font-mono">{fileType}</span>
          <button
            onClick={onStartStudio}
            className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 shadow-sm btn-glow"
          >
            🚀 Crear Plantilla Editable
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-2 min-h-[500px]">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
              <Sparkles size={24} className="animate-spin" />
            </div>
            <p className="mt-4 text-sm font-medium text-white">Analizando estructura y texto vectorial del documento...</p>
          </div>
        ) : (
          <div className="w-full">
            <RealPdfViewer
              url={pdfUrl}
              pageNum={1}
              scale={0.85}
              showToolbar={true}
              totalPages={totalPages}
              className="h-[520px] w-full"
            />
            <p className="mt-2 text-xs text-slate-400 font-mono text-center">
              Vista previa vectorial de <span className="text-slate-200 font-semibold">{fileName}</span> ({totalPages} {totalPages === 1 ? 'página' : 'páginas'})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Metadata({
  fileName,
  fileType,
  fileSize,
  docId,
  totalPages,
}: {
  fileName: string;
  fileType: string;
  fileSize: number;
  docId: string | null;
  totalPages: number;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-4">
      <h2 className="font-semibold text-white text-sm">Metadatos del Documento</h2>
      
      <div className="space-y-3 text-xs">
        <div>
          <span className="text-slate-400 block">Nombre del archivo</span>
          <span className="font-medium text-slate-200 break-all">{fileName}</span>
        </div>
        <div>
          <span className="text-slate-400 block">Formato</span>
          <span className="font-mono text-indigo-400 font-semibold">{fileType}</span>
        </div>
        <div>
          <span className="text-slate-400 block">Total de Páginas</span>
          <span className="font-semibold text-white">{totalPages} páginas</span>
        </div>
        <div>
          <span className="text-slate-400 block">Tamaño</span>
          <span className="text-slate-300 font-mono">{fileSize} KB</span>
        </div>
        <div>
          <span className="text-slate-400 block">ID del Documento (DB)</span>
          <span className="font-mono text-[10px] text-slate-400 break-all">{docId || '50bb6fb3-680a-4d6b-a014-02cd0b07d37b'}</span>
        </div>
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
  onProceedToGeneration,
  showOnlyCurrentPageZones,
  setShowOnlyCurrentPageZones,
  resolvedAiPrompt,
  setResolvedAiPrompt,
  viewMode,
  setViewMode,
  fileName,
  fileType,
  pdfUrl,
}: {
  zones: Zone[];
  current: Zone;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (n: number) => void;
  selected: number;
  setSelected: (id: number) => void;
  addZoneOnPage: (page: number, coords?: { x: number; y: number; w: number; h: number }) => void;
  removeZone: (id: number) => void;
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
  onProceedToGeneration: () => void;
  showOnlyCurrentPageZones: boolean;
  setShowOnlyCurrentPageZones: (b: boolean) => void;
  resolvedAiPrompt: string | null;
  setResolvedAiPrompt: (s: string | null) => void;
  viewMode: 'split' | 'editable' | 'original';
  setViewMode: (v: 'split' | 'editable' | 'original') => void;
  fileName: string;
  fileType: string;
  pdfUrl: string;
}) {
  const [drawMode, setDrawMode] = useState(false);
  const pageZones = zones.filter((z) => Math.min(totalPages, Math.max(1, z.page)) === currentPage);

  return (
    <section className="space-y-4">
      {/* Top Toolbar for Study View */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('split')}
            className={`rounded px-3 py-1.5 text-xs font-medium hover-scale ${
              viewMode === 'split' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Lado a Lado (Split)
          </button>
          <button
            onClick={() => setViewMode('editable')}
            className={`rounded px-3 py-1.5 text-xs font-medium hover-scale ${
              viewMode === 'editable' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Plantilla Editable
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`rounded px-3 py-1.5 text-xs font-medium hover-scale ${
              viewMode === 'original' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Original
          </button>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded border border-slate-800">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="text-slate-400 disabled:opacity-30 hover:text-white p-0.5"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-mono text-slate-200">Página {currentPage} de {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="text-slate-400 disabled:opacity-30 hover:text-white p-0.5"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawMode(!drawMode)}
            className={`rounded px-3 py-1.5 text-xs font-medium hover-scale ${
              drawMode ? 'bg-emerald-600 text-white' : 'border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {drawMode ? '✏️ Modo Arrastre Activo' : '➕ Arrastrar para Dibujar Zona'}
          </button>
          <button
            onClick={onProceedToGeneration}
            className="rounded bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 shadow-sm btn-glow"
          >
            Avanzar a Campos →
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        {/* Canvas Display */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 min-h-[580px] shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-semibold text-slate-300">Navegador Fiel de PDF · {fileName} ({fileType})</span>
            <span className="text-[10px] text-emerald-400 font-mono">Página {currentPage} de {totalPages}</span>
          </div>

          <div className={`grid gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 ${viewMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Sheet 1: Original Document */}
            {(viewMode === 'split' || viewMode === 'original') && (
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-100 flex flex-col justify-between h-[580px] select-none">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pb-1.5 border-b border-slate-800">
                  <span className="truncate max-w-[140px] font-semibold text-slate-300">{fileName}</span>
                  <span className="text-indigo-400 font-medium">Hoja Original Preservada</span>
                </div>
                <div className="mt-2 flex-1 overflow-hidden">
                  <RealPdfViewer
                    url={pdfUrl}
                    pageNum={currentPage}
                    scale={0.72}
                    showToolbar={true}
                    totalPages={totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}

            {/* Sheet 2: Interactive Template */}
            {(viewMode === 'split' || viewMode === 'editable') && (
              <div className="rounded-lg border border-emerald-900/80 bg-slate-900 p-2 text-slate-100 flex flex-col justify-between h-[580px] select-none">
                <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 pb-1.5 border-b border-slate-800 font-semibold">
                  <span className="truncate max-w-[140px]">{fileName}</span>
                  <span className="text-emerald-400">Hoja Plantilla Interactiva ({pageZones.length} campos)</span>
                </div>
                <div className="mt-2 flex-1 overflow-hidden">
                  <RealPdfViewer
                    url={pdfUrl}
                    pageNum={currentPage}
                    scale={0.72}
                    showToolbar={true}
                    totalPages={totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                    className="h-full w-full"
                  >
                    {pageZones.map((z) => (
                      <div
                        key={z.id}
                        onClick={() => setSelected(z.id)}
                        style={{
                          left: `${z.x}%`,
                          top: `${z.y}%`,
                          width: `${z.w}%`,
                          height: `${z.h}%`,
                        }}
                        className={`absolute z-20 cursor-pointer rounded border px-1.5 py-0.5 text-[8px] font-medium transition-all ${
                          selected === z.id
                            ? 'border-indigo-400 bg-indigo-950/95 text-white ring-2 ring-indigo-400 shadow-xl'
                            : z.type === 'Estatico'
                            ? 'border-emerald-500/80 bg-emerald-950/85 text-emerald-200'
                            : 'border-slate-600 bg-slate-950/85 text-slate-200'
                        }`}
                      >
                        <span className="block truncate font-bold">{z.label}</span>
                      </div>
                    ))}
                  </RealPdfViewer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Manager for Zones */}
        <aside className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-white">Campos en Página {currentPage}</span>
            <button
              onClick={() => addZoneOnPage(currentPage)}
              className="rounded bg-indigo-600 p-1 text-white hover:bg-indigo-500 hover-scale"
              title="Añadir Zona"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {pageZones.map((z) => (
              <div
                key={z.id}
                onClick={() => setSelected(z.id)}
                className={`flex items-center justify-between rounded p-2 text-xs cursor-pointer transition-all ${
                  selected === z.id ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="truncate max-w-[160px]">{z.label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeZone(z.id); }}
                  className="text-slate-400 hover:text-rose-400 p-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {current && (
            <div className="border-t border-slate-800 pt-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Detalle de Campo #{current.id}</p>
              <div>
                <label className="text-[10px] text-slate-400 block">Etiqueta del campo</label>
                <input
                  type="text"
                  value={current.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setZones(zones.map(z => z.id === current.id ? { ...z, label: val } : z));
                  }}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">Tipo de elemento</label>
                <select
                  value={current.type}
                  onChange={(e) => {
                    const val = e.target.value;
                    setZones(zones.map(z => z.id === current.id ? { ...z, type: val } : z));
                  }}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                >
                  <option value="Texto">Texto</option>
                  <option value="Fecha">Fecha</option>
                  <option value="Firma">Firma</option>
                  <option value="Estatico">Texto Estático (No Editable)</option>
                  <option value="Casilla">Casilla de Verificación</option>
                </select>
              </div>
            </div>
          )}
        </aside>
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
  fileName,
  fileType,
}: {
  zones: Zone[];
  setStep: (n: number) => void;
  exportFormat: 'docx' | 'xlsx' | 'pdf';
  setExportFormat: (f: 'docx' | 'xlsx' | 'pdf') => void;
  handleExport: () => void;
  totalPages: number;
  fileName: string;
  fileType: string;
}) {
  return (
    <section className="mx-auto max-w-4xl animate-page-in">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-7 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              3. Campos y generación de plantilla ({totalPages} {totalPages === 1 ? 'página' : 'páginas'})
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Revisa la lista de campos clasificados para <span className="text-slate-200 font-medium">{fileName}</span> ({fileType}) antes de exportar.
            </p>
          </div>
          <button onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-white flex items-center hover-scale">
            <ChevronLeft size={14} className="mr-1 inline" /> Volver al estudio
          </button>
        </div>

        <div className="mt-6 divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-950 max-h-[380px] overflow-y-auto">
          {zones.map((z) => {
            const displayPage = Math.min(totalPages, Math.max(1, z.page));
            return (
              <div key={z.id} className="flex items-center justify-between gap-4 p-3.5 sm:p-4 hover:bg-slate-900/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex size-8 items-center justify-center rounded-md shrink-0 ${
                    z.type === 'Estatico' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/50'
                  }`}>
                    {z.type === 'Firma' ? <MousePointer2 size={15} /> : <FileText size={15} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-200 truncate">
                      {z.type === 'Estatico' ? '🔒 ' : ''}{z.label}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {z.note} · <span className="text-slate-300 font-mono">Página {displayPage} de {totalPages}</span>
                    </p>
                  </div>
                </div>
                <span className={`rounded-md border px-2.5 py-1 text-[10px] font-medium shrink-0 ${
                  z.type === 'Estatico' ? 'border-emerald-800/80 text-emerald-300 bg-emerald-950/40' : 'border-indigo-800/80 bg-indigo-950/40 text-indigo-300'
                }`}>
                  {z.type}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-7">
          <p className="text-xs sm:text-sm font-medium text-white mb-3">Formato final de exportación</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { format: 'docx' as const, label: 'Word (.docx)', desc: 'Documento editable completo' },
              { format: 'xlsx' as const, label: 'Excel (.xlsx)', desc: 'Hoja matricial con celdas' },
              { format: 'pdf' as const, label: 'PDF (.pdf)', desc: 'Formulario AcroForm editable' },
            ].map(({ format, label, desc }) => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all hover-scale ${
                  exportFormat === format
                    ? 'border-indigo-500 bg-indigo-600/20 text-white font-medium shadow-md ring-1 ring-indigo-500/50'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                {format === 'xlsx' ? <FileSpreadsheet size={18} className="text-emerald-400 shrink-0" /> : <FileText size={18} className="text-indigo-400 shrink-0" />}
                <div>
                  <span className="block text-xs sm:text-sm font-medium">{label}</span>
                  <span className="text-[10.5px] text-slate-400 leading-tight block">{desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleExport}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-xs sm:text-sm font-medium text-white hover:bg-indigo-500 shadow-md transition-all btn-glow"
        >
          <Download size={16} /> Generar y descargar plantilla editable ({exportFormat.toUpperCase()})
        </button>
      </div>
    </section>
  );
}
