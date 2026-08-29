import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomIn, ZoomOut, Maximize2, Download, RotateCw, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// Configuración del worker de pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.2.108'}/build/pdf.worker.min.mjs`;

interface RealPdfViewerProps {
  url: string;
  pageNum?: number;
  scale?: number;
  className?: string;
  showToolbar?: boolean;
  onPageChange?: (newPage: number) => void;
  totalPages?: number;
  children?: React.ReactNode;
}

export function RealPdfViewer({
  url,
  pageNum = 1,
  scale: initialScale = 0.85,
  className = '',
  showToolbar = false,
  onPageChange,
  totalPages = 1,
  children,
}: RealPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(initialScale);
  const [rotation, setRotation] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(totalPages);

  // Synchronize initialScale when prop changes
  useEffect(() => {
    setZoom(initialScale);
  }, [initialScale]);

  // Load PDF document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
        }
      } catch (err: any) {
        console.warn('PDF.js loading error:', err);
        if (!isCancelled) {
          setError('No se pudo cargar el archivo PDF.');
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  // Render active page when pageNum, zoom, or rotation changes
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;
      setLoading(true);

      try {
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render at crisp high resolution using devicePixelRatio
        const dpr = Math.max(1.5, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: zoom * dpr, rotation });
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Display width & height styled via CSS for exact zoom scaling
        const cssViewport = page.getViewport({ scale: zoom, rotation });
        canvas.style.width = `${cssViewport.width}px`;
        canvas.style.height = `${cssViewport.height}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        await page.render(renderContext).promise;
        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF.js render error:', err);
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNum, zoom, rotation]);

  const handleZoomIn = () => setZoom((prev) => Math.min(2.5, prev + 0.15));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.3, prev - 0.15));
  const handleResetZoom = () => setZoom(initialScale);
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div className={`flex flex-col rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl ${className}`}>
      {/* Navegador PDF Estilo Chrome / Firefox Toolbar */}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 select-none">
          {/* Controles de página */}
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 font-medium text-slate-300 mr-2">
              <FileText size={14} className="text-indigo-400" /> Navegador PDF
            </span>
            {onPageChange && (
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-0.5">
                <button
                  disabled={pageNum <= 1}
                  onClick={() => onPageChange(pageNum - 1)}
                  className="text-slate-400 hover:text-white disabled:opacity-30"
                  title="Página Anterior"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-mono text-[11px]">
                  {pageNum} / {numPages}
                </span>
                <button
                  disabled={pageNum >= numPages}
                  onClick={() => onPageChange(pageNum + 1)}
                  className="text-slate-400 hover:text-white disabled:opacity-30"
                  title="Página Siguiente"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Controles de zoom y rotación */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Alejar (-)"
            >
              <ZoomOut size={15} />
            </button>

            <span className="w-12 text-center font-mono text-[11px] font-semibold text-indigo-300">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Acercar (+)"
            >
              <ZoomIn size={15} />
            </button>

            <button
              onClick={handleResetZoom}
              className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors ml-1"
              title="Ajustar Tamaño"
            >
              <Maximize2 size={14} />
            </button>

            <button
              onClick={handleRotate}
              className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Rotar 90°"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL CANVAS DEL PDF CON SCROLL Y FIT */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-slate-950/95 p-4 flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-800"
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-4 text-center z-30 backdrop-blur-xs">
            <div className="size-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-2" />
            <span className="text-xs font-medium text-slate-300">Renderizando PDF vectorial (PDF.js)...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-30">
            <p className="text-xs text-rose-400 font-medium">{error}</p>
          </div>
        )}

        <div className="relative inline-block my-auto shadow-2xl rounded">
          <canvas ref={canvasRef} className="block rounded bg-white border border-slate-800 transition-all duration-150" />
          {children && <div className="absolute inset-0 z-20 pointer-events-auto">{children}</div>}
        </div>
      </div>
    </div>
  );
}
