import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configuración del worker de pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.2.108'}/build/pdf.worker.min.mjs`;

interface RealPdfViewerProps {
  url: string;
  pageNum?: number;
  scale?: number;
  className?: string;
  children?: React.ReactNode;
}

export function RealPdfViewer({ url, pageNum = 1, scale = 0.5, className = '', children }: RealPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadAndRender() {
      if (!canvasRef.current) return;
      setLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;

        if (isCancelled) return;

        const page = await pdf.getPage(pageNum);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        await (page as any).render(renderContext).promise;
        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF.js render notice:', err);
        if (!isCancelled) {
          setError('Cargando renderizado vectorial...');
          setLoading(false);
        }
      }
    }

    loadAndRender();

    return () => {
      isCancelled = true;
    };
  }, [url, pageNum, scale]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded bg-slate-900 ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-4 text-center z-10">
          <div className="size-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-2" />
          <span className="text-[9px] font-medium text-slate-300">Renderizando PDF Real (PDF.js)...</span>
        </div>
      )}
      <div className="relative">
        <canvas ref={canvasRef} className="max-w-full rounded shadow-md border border-slate-700/60" />
        {children && (
          <div className="absolute inset-0 z-20 pointer-events-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
