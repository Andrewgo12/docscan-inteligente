import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, FileImage, FileSpreadsheet, FileText, Info, LockKeyhole, Menu, MousePointer2, Play, ScanLine, ShieldCheck, Sparkles, X } from 'lucide-react';
import { DocscanWorkspace, SampleDocData } from './DocscanWorkspace';
import { RealPdfViewer } from './RealPdfViewer';

type View = 'home' | 'how' | 'workspace';
type Kind = 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'JPG';

const kindColors: Record<Kind, string> = {
  PDF: 'bg-rose-600',
  DOCX: 'bg-blue-600',
  XLSX: 'bg-emerald-600',
  PPTX: 'bg-orange-600',
  JPG: 'bg-violet-600'
};

const formats = [
  { kind: 'PDF' as Kind, label: 'PDF', detail: 'AcroForm, texto e imágenes preservadas', icon: FileText },
  { kind: 'DOCX' as Kind, label: 'Word', detail: 'Párrafos, estilos, tablas y enlaces', icon: FileText },
  { kind: 'XLSX' as Kind, label: 'Excel', detail: 'Hojas, celdas, fórmulas y formato', icon: FileSpreadsheet },
  { kind: 'PPTX' as Kind, label: 'PowerPoint', detail: 'Diapositivas, objetos y notas', icon: FileText },
  { kind: 'JPG' as Kind, label: 'Imagen / escaneo', detail: 'OCR, sellos, firmas y zonas visuales', icon: FileImage },
];

export interface StepDetail {
  title: string;
  summary: string;
  whatHappens: string;
  input: string;
  action: string;
  output: string;
  resultText: string;
}

const tutorialSteps: StepDetail[] = [
  {
    title: 'Bienvenida',
    summary: 'Entiende qué vas a construir y cómo DocScan conserva el documento original.',
    whatHappens: 'El sistema inicializa la sesión de digitalización conservando el documento fuente intacto sin alterar su estructura.',
    input: 'Documento original',
    action: 'Selección del archivo',
    output: 'Copia de trabajo aislada',
    resultText: 'Documento cargado en espacio aislado listo para verificación.'
  },
  {
    title: 'Modo de trabajo',
    summary: 'Elige análisis automático para avanzar rápido o modo manual para controlar cada detalle.',
    whatHappens: 'El usuario decide entre el pipeline automático asistido por visión por computador o la edición manual precisa página por página.',
    input: 'Preferencia del usuario',
    action: 'Selección Automático / Manual',
    output: 'Flujo de trabajo personalizado',
    resultText: 'Configuración del nivel de intervención humana (Human-in-the-loop).'
  },
  {
    title: 'Formato',
    summary: 'Selecciona PDF, Word, Excel, PowerPoint o imagen: la estrategia de construcción cambia según el archivo.',
    whatHappens: 'DocScan analiza los Magic Bytes del archivo para determinar la estrategia de extracción adecuada según sea Word, Excel, PowerPoint, PDF o Imagen.',
    input: 'PDF, DOCX, XLSX, PPTX o Imagen',
    action: 'Detección de tipo MIME',
    output: 'Extractor específico asignado',
    resultText: 'Estrategia de renderizado adaptada exactamente a la estructura del archivo.'
  },
  {
    title: 'Carga segura',
    summary: 'Sube el archivo, valida su extensión y tamaño, y conserva una copia intacta como referencia.',
    whatHappens: 'Se valida la integridad binaria del archivo, tamaño (máx 25 MB) y firma SHA-256 para evitar corrupción o errores.',
    input: 'Archivo local',
    action: 'Hash SHA-256 & Validación',
    output: 'Registro seguro en servidor',
    resultText: 'Documento verificado e inmune a alteraciones no autorizadas.'
  },
  {
    title: 'Lectura original',
    summary: 'Revisa cada página, hoja o diapositiva antes de indicar cualquier cambio.',
    whatHappens: 'Muestra una vista previa del contenido extraído para que el usuario verifique visualmente que es el documento correcto antes de cualquier modificación.',
    input: 'Archivo registrado',
    action: 'Renderizado de lectura previa',
    output: 'Confirmación del usuario',
    resultText: 'Lectura previa verificable con texto y estructura legibles.'
  },
  {
    title: 'Renderizado fiel',
    summary: 'El sistema reconstruye la apariencia: tipografías, posiciones, tablas, imágenes, enlaces y señales.',
    whatHappens: 'Reconstruye la apariencia del documento preservando fuentes, márgenes, tablas, imágenes y logotipos en su posición original.',
    input: 'Metadatos y geometría',
    action: 'Reconstrucción visual',
    output: 'Lienzo fiel al impreso',
    resultText: 'Apariencia visual equivalente al documento original.'
  },
  {
    title: 'Análisis estructural',
    summary: 'Identifica texto, bloques, tablas, imágenes, adjuntos, vínculos, códigos y elementos repetidos.',
    whatHappens: 'El motor OCR y visión artificial fragmentan el documento en bloques de texto impreso, tablas, encabezados, sellos y firmas.',
    input: 'Páginas del documento',
    action: 'Segmentación de bloques OCR',
    output: 'Mapa de coordenadas (bounding boxes)',
    resultText: 'Estructura interna totalmente identificada y clasificada.'
  },
  {
    title: 'Resumen',
    summary: 'Obtén una síntesis del documento para entender su propósito y orientar los campos.',
    whatHappens: 'La IA sintetiza el propósito general del documento y sugiere los campos clave requeridos para completar el formulario.',
    input: 'Texto completo extraído',
    action: 'Síntesis semántica',
    output: 'Resumen y sugerencia de campos',
    resultText: 'Comprensión instantánea del objetivo del formulario.'
  },
  {
    title: 'Sugerencias IA',
    summary: 'Revisa las zonas que la IA propone y acepta, corrige o descarta cada sugerencia.',
    whatHappens: 'El sistema propone recuadros automáticos sobre las líneas en blanco, fechas, firmas y casillas detectadas para su aprobación.',
    input: 'Mapa de bloques OCR',
    action: 'Propuestas automáticas de zonas',
    output: 'Zonas sugeridas resaltadas',
    resultText: 'Aprobación rápida con 1-clic de sugerencias de la IA.'
  },
  {
    title: 'Dibujo de zona',
    summary: 'Mantén el mouse presionado y dibuja un rectángulo exactamente donde debe existir un espacio.',
    whatHappens: 'El usuario arrastra el cursor del ratón sobre el lienzo para marcar manualmente cualquier recuadro editable o texto estático.',
    input: 'Arrastre de ratón (Drag-to-Draw)',
    action: 'Delimitación de coordenadas',
    output: 'Nueva zona creada (x, y, w, h)',
    resultText: 'Zona delimitada exactamente en las dimensiones indicadas.'
  },
  {
    title: 'Ajuste preciso',
    summary: 'Mueve, redimensiona y alinea la zona para que coincida con el área real del documento.',
    whatHappens: 'Se pueden mover, cambiar de tamaño o realinear las zonas marcadas para encajarlas perfectamente sobre el impreso.',
    input: 'Zona seleccionada',
    action: 'Ajuste de coordenadas y bordes',
    output: 'Alineación milimétrica',
    resultText: 'Recuadro alineado con los márgenes del formulario.'
  },
  {
    title: 'Instrucción libre',
    summary: 'Describe con tus propias palabras qué debe aparecer, sin estar limitado a tipos predefinidos.',
    whatHappens: 'Permite ingresar descripciones personalizadas en lenguaje natural sobre el comportamiento deseado para esa zona.',
    input: 'Comentarios / Notas del usuario',
    action: 'Asignación de reglas de negocio',
    output: 'Instrucción de campo vinculada',
    resultText: 'Reglas y restricciones de diligenciamiento registradas.'
  },
  {
    title: 'Tipo de elemento',
    summary: 'Marca texto, fecha, firma, hora, casilla, imagen, archivo, hipervínculo, sello, código, tabla, señal, cálculo u otro.',
    whatHappens: 'Clasificación de la zona entre Editable (Texto, Fecha, Firma, Casilla) o Texto Estático Impreso (No Editable).',
    input: 'Selector de tipo de campo',
    action: 'Asignación de categoría',
    output: 'Control de entrada configurado',
    resultText: 'Comportamiento del control asignado según su tipo.'
  },
  {
    title: 'Comentarios',
    summary: 'Añade ejemplos, reglas, instrucciones y contexto para que cualquier persona sepa cómo completar el campo.',
    whatHappens: 'Se agregan notas explicativas y ejemplos para guiar a la persona que completará el campo.',
    input: 'Texto de ayuda / Tooltip',
    action: 'Asociación de ayuda al usuario',
    output: 'Guía interactiva de campo',
    resultText: 'Ayuda contextual visible al posicionar el cursor sobre el campo.'
  },
  {
    title: 'Baja confianza',
    summary: 'Responde preguntas puntuales de la IA cuando una región pueda interpretarse de varias formas.',
    whatHappens: 'Si la IA detecta incertidumbre en una región, presenta una tarjeta interactiva preguntando al usuario por la clasificación correcta.',
    input: 'Zona con confianza < 80%',
    action: 'Consulta Human-in-the-Loop',
    output: 'Confirmación definitiva del usuario',
    resultText: 'Aclaración directa que elimina cualquier ambigüedad en la plantilla.'
  },
  {
    title: 'Comparación',
    summary: 'Alterna entre original y plantilla para confirmar que ningún elemento no seleccionado fue alterado.',
    whatHappens: 'Permite alternar entre la vista del documento original y la nueva plantilla editable para verificar que ningún texto no seleccionado fue alterado.',
    input: 'Lienzo original vs Plantilla',
    action: 'Superposición y switch de vista',
    output: 'Verificación de fidelidad 100%',
    resultText: 'Garantía de preservación de todo el contenido estático impreso.'
  },
  {
    title: 'Salida',
    summary: 'Elige DOCX, XLSX o PDF y revisa qué capacidades editables ofrece cada construcción.',
    whatHappens: 'El usuario elige entre exportar en Word (.docx), Excel (.xlsx) o PDF con formularios interactivos AcroForms.',
    input: 'Formato de salida deseado',
    action: 'Selección de motor de construcción',
    output: 'Configuración de exportador',
    resultText: 'Formato de destino listo para la generación final.'
  },
  {
    title: 'Firmas',
    summary: 'Configura firma manuscrita con mouse/touch o una firma tipográfica digital para campos especiales.',
    whatHappens: 'Configuración del control de firma manuscrita (trazado con ratón/touch) o firma tipográfica digital.',
    input: 'Recuadro de firma',
    action: 'Asignación de lienzo de firma',
    output: 'Control de captura de firma activa',
    resultText: 'Campo de firma preparado para autenticación manuscrita.'
  },
  {
    title: 'Generación',
    summary: 'Procesa las zonas marcadas y reemplaza únicamente los espacios indicados por controles editables.',
    whatHappens: 'El servidor backend compila la plantilla reemplazando únicamente las zonas marcadas por controles editables y preservando el resto del archivo.',
    input: 'Matriz de campos + Original',
    action: 'Compilación en backend Python',
    output: 'Archivo ejecutable final',
    resultText: 'Documento convertido en plantilla 100% editable.'
  },
  {
    title: 'Descarga y edición',
    summary: 'Descarga, comparte o vuelve a editar una plantilla que permanece ajustable según tus necesidades.',
    whatHappens: 'Descarga directa del archivo procesado en `.docx`, `.xlsx` o `.pdf` listo para ser completado o compartido.',
    input: 'Plantilla compilada',
    action: 'Descarga desde la API REST',
    output: 'Plantilla final entregada',
    resultText: 'Plantilla descargada y disponible para uso inmediato.'
  }
];

export function DocscanApp() {
  const [view, setView] = useState<View>('home');
  const [login, setLogin] = useState(false);
  const [howStep, setHowStep] = useState(0);
  const [notice, setNotice] = useState(false);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [activeSampleData, setActiveSampleData] = useState<SampleDocData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const go = (next: View) => {
    setMobileMenuOpen(false);
    setView(next);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Responsivo */}
      <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 sm:px-8">
        <button onClick={() => go('home')} className="flex items-center gap-2.5 sm:gap-3 hover-scale">
          <span className="flex size-7 sm:size-8 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm">
            <ScanLine size={16} className="sm:size-[17px]" />
          </span>
          <span className="font-semibold text-sm sm:text-base tracking-tight text-white">
            DocScan <span className="font-normal text-slate-400">Inteligente</span>
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <button
            onClick={() => go('home')}
            className={`rounded-md px-3 py-2 text-sm transition-all hover-scale ${view === 'home' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
          >
            Inicio
          </button>
          <button
            onClick={() => go('how')}
            className={`rounded-md px-3 py-2 text-sm transition-all hover-scale ${view === 'how' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
          >
            Cómo funciona
          </button>
          <button
            onClick={() => go('workspace')}
            className={`rounded-md px-3 py-2 text-sm transition-all hover-scale ${view === 'workspace' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
          >
            Workspace
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogin(true)}
            className="hidden rounded-md border border-slate-800 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium hover:bg-slate-800 sm:block text-slate-200 hover-scale"
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => setNotice(!notice)}
            aria-label="Notificaciones"
            className="relative rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white hover-scale transition-all"
          >
            <Info size={18} />
            {notice && (
              <div className="absolute right-0 top-11 w-64 rounded-lg border border-indigo-500/40 bg-slate-900 p-4 text-left text-xs shadow-2xl z-50 animate-dropdown">
                <p className="font-medium text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-400" /> Modo invitado activo
                </p>
                <p className="mt-1 text-slate-400">Puedes probar todas las funciones y exportar archivos sin necesidad de registrarte.</p>
              </div>
            )}
          </button>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 md:hidden hover-scale"
            aria-label="Menú móvil"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-14 z-40 border-b border-slate-800 bg-slate-950 p-4 md:hidden animate-dropdown">
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => go('home')}
              className={`rounded-md px-3 py-2 text-left text-sm ${view === 'home' ? 'bg-slate-800 text-white font-medium' : 'text-slate-300'}`}
            >
              Inicio
            </button>
            <button
              onClick={() => go('how')}
              className={`rounded-md px-3 py-2 text-left text-sm ${view === 'how' ? 'bg-slate-800 text-white font-medium' : 'text-slate-300'}`}
            >
              Cómo funciona
            </button>
            <button
              onClick={() => go('workspace')}
              className={`rounded-md px-3 py-2 text-left text-sm ${view === 'workspace' ? 'bg-slate-800 text-white font-medium' : 'text-slate-300'}`}
            >
              Workspace
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); setLogin(true); }}
              className="mt-2 rounded-md border border-slate-700 px-3 py-2 text-center text-sm font-medium text-white hover-scale"
            >
              Iniciar sesión
            </button>
          </nav>
        </div>
      )}

      {/* ANIMACIONES DE CAMBIO DE VISTA (TRANSICIONES SUAVES FADE & SLIDE) */}
      <div key={view} className="animate-page-in">
        {view === 'home' && <Landing start={() => go('workspace')} how={() => go('how')} login={() => setLogin(true)} />}
        {view === 'how' && <How start={() => go('workspace')} back={() => go('home')} step={howStep} setStep={setHowStep} />}
        {view === 'workspace' && <DocscanWorkspace initialFile={activeFile} initialSampleData={activeSampleData} back={() => go('home')} />}
      </div>

      {login && <LoginModal close={() => setLogin(false)} />}
    </div>
  );
}

function Landing({ start, how, login }: { start: () => void; how: () => void; login: () => void }) {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-8 sm:gap-14 px-4 sm:px-6 pb-16 sm:pb-24 pt-12 sm:pt-20 lg:grid-cols-[1fr_1fr] lg:pt-24">
        <div>
          <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400">
            <ShieldCheck size={14} className="text-indigo-400 shrink-0" /> Gratis para empezar · Sin registro obligatorio
          </div>
          <h1 className="max-w-3xl text-balance text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.045em] text-white leading-tight sm:leading-none">
            Convierte cualquier documento en una plantilla <span className="text-indigo-400">editable al 100%.</span>
          </h1>
          <p className="mt-4 sm:mt-6 max-w-xl text-pretty text-base sm:text-lg leading-7 sm:leading-8 text-slate-400">
            Analiza PDFs, Word, Excel, PowerPoint e imágenes. Resume su contenido, conserva su apariencia e identifica espacios en controles listos para completar.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
            <button
              onClick={start}
              className="rounded-md bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500 shadow-md transition-all text-center justify-center flex items-center btn-glow"
            >
              Comenzar gratis <ArrowRight size={16} className="ml-2 inline" />
            </button>
            <button
              onClick={how}
              className="rounded-md border border-slate-800 px-5 py-3 text-sm font-medium hover:bg-slate-800 text-slate-200 text-center justify-center flex items-center hover-scale"
            >
              <Play size={14} className="mr-2 inline text-indigo-400" /> Ver cómo funciona
            </button>
          </div>
          <button onClick={login} className="mt-4 sm:mt-5 text-xs text-slate-400 underline underline-offset-4 hover:text-slate-200 hover-scale">
            Iniciar sesión opcionalmente para guardar tu trabajo
          </button>
        </div>

        {/* DEMOSTRACIÓN VISUAL SIDE-BY-SIDE REAL (RENDERIZADO AMBOS CON PDF.JS NATIVO) */}
        <PreviewCard />
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Una herramienta, muchos usos</p>
            <h2 className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-white">Del archivo original a un flujo digital completo.</h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-6 sm:leading-7 text-slate-400">
              Reduce papel, evita rehacer formatos y convierte procesos manuales en experiencias claras. DocScan entiende que cada formato necesita una construcción diferente.
            </p>
          </div>
          <div className="mt-8 sm:mt-10 grid gap-6 sm:gap-8 md:grid-cols-3">
            <Benefit
              icon={<Sparkles size={17} />}
              title="Analiza y resume"
              text="Extrae estructura, texto, tablas, imágenes y señales para que puedas comprender el documento antes de editarlo."
            />
            <Benefit
              icon={<MousePointer2 size={17} />}
              title="Señala lo que sea"
              text="Dibuja una zona y escribe cualquier instrucción: un archivo, imagen, hipervínculo, sello, cálculo o tabla."
            />
            <Benefit
              icon={<ShieldCheck size={17} />}
              title="Preserva la apariencia"
              text="El contenido no seleccionado permanece intacto. La plantilla cambia solo en los espacios definidos y sigue editándose."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {formats.map(({ kind, label, detail, icon: Icon }) => (
            <div key={kind} className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 sm:p-4 hover-scale hover:border-slate-700">
              <span className={`flex size-8 sm:size-9 items-center justify-center rounded-md ${kindColors[kind]} text-white shadow-sm`}>
                <Icon size={16} />
              </span>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-white">{label}</p>
              <p className="mt-1 text-[11px] sm:text-xs leading-4 sm:leading-5 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function PreviewCard() {
  const [editableTitle, setEditableTitle] = useState('Tika - Content Analysis Toolkit 2026');
  const [editableText, setEditableText] = useState('Apache Tika is a toolkit for detecting and extracting metadata...');

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 sm:p-4 shadow-2xl overflow-hidden hover-scale">
      <div className="flex items-center justify-between border-b border-slate-800 px-2 pb-3">
        <div className="flex items-center gap-2">
          <ScanLine size={15} className="text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200">Demostración Lado a Lado (Renderizado PDF.js Real)</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-medium">100% Fidelidad al Impreso</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
        
        {/* HOJA IZQUIERDA: DOCUMENTO ORIGINAL PDF (RENDERIZADO CANVAS CON PDF.JS DEL MISMO PDF REAL) */}
        <div className="rounded border border-slate-700 bg-slate-900 p-2 text-slate-100 flex flex-col justify-between aspect-[0.7] select-none overflow-hidden transition-all">
          <div>
            <div className="flex justify-between items-center text-[7px] font-mono text-slate-400 pb-1 border-b border-slate-800">
              <span className="truncate max-w-[90px] font-semibold text-slate-300">10_Tika_Test_Sample.pdf</span>
              <span className="text-indigo-400">PDF.js Original</span>
            </div>

            {/* RENDERIZADO CANVAS CON PDF.JS DEL PDF REAL ORIGINAL */}
            <div className="mt-2 flex justify-center">
              <RealPdfViewer url="/sample_tika.pdf" pageNum={1} scale={0.44} className="max-h-[220px]" />
            </div>
          </div>

          <div className="text-[6.5px] text-slate-400 border-t border-slate-800 pt-1 flex justify-between">
            <span>HOJA 1: PDF ORIGINAL INTACTO</span>
            <span className="text-slate-400">Sin Modificaciones</span>
          </div>
        </div>

        {/* HOJA DERECHA: MISMO PDF REAL CON PDF.JS + CAPA DE CAMPOS EDITABLES LLENABLES */}
        <div className="rounded border border-emerald-900/80 bg-slate-900 p-2 text-slate-100 flex flex-col justify-between aspect-[0.7] select-none overflow-hidden transition-all">
          <div>
            <div className="flex justify-between items-center text-[7px] font-mono text-emerald-400 pb-1 border-b border-slate-800 font-semibold">
              <span className="truncate max-w-[90px]">10_Tika_Test_Sample.pdf</span>
              <span className="text-emerald-400">PDF.js + Campos Editables</span>
            </div>

            {/* RENDERIZADO CANVAS CON PDF.JS DEL MISMO PDF REAL CON CAPA SUPERPUESTA EDITABLE */}
            <div className="mt-2 flex justify-center">
              <RealPdfViewer url="/sample_tika.pdf" pageNum={1} scale={0.44} className="max-h-[220px]">
                {/* CAMPO EDITABLE 1: SOBRE EL TÍTULO DEL PDF */}
                <div className="absolute top-[14%] left-[10%] right-[10%] z-20">
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    className="w-full bg-indigo-950/95 border border-indigo-400 text-indigo-100 rounded px-1.5 py-0.5 text-[7.5px] font-bold shadow-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 transition-all"
                    title="Editar Título"
                  />
                </div>

                {/* CAMPO EDITABLE 2: SOBRE EL PARRAFO DEL PDF */}
                <div className="absolute top-[28%] left-[10%] right-[10%] z-20">
                  <textarea
                    rows={2}
                    value={editableText}
                    onChange={(e) => setEditableText(e.target.value)}
                    className="w-full bg-slate-950/95 border border-indigo-400 text-indigo-200 rounded px-1.5 py-0.5 text-[7px] shadow-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 leading-tight transition-all"
                    title="Editar Descripción"
                  />
                </div>

                {/* CAMPO EDITABLE 3: SELECTOR DE FECHA SOBRE EL BLOQUE DE NOTICIAS */}
                <div className="absolute bottom-[28%] left-[10%] z-20">
                  <input
                    type="date"
                    defaultValue="2007-03-22"
                    className="bg-slate-950/95 border border-emerald-400 text-emerald-200 rounded px-1 text-[7px] font-mono shadow-md transition-all"
                  />
                </div>

                {/* CAMPO EDITABLE 4: FIRMA MANUSCRITA SOBRE EL PIE DEL PDF */}
                <div className="absolute bottom-[10%] right-[10%] z-20">
                  <button className="bg-indigo-900/95 border border-indigo-400 text-indigo-100 rounded px-1.5 py-0.5 text-[7px] font-medium shadow-md hover:bg-indigo-800 hover-scale">
                    ✍️ Firma Aprobación PMC
                  </button>
                </div>
              </RealPdfViewer>
            </div>
          </div>

          <div className="text-[6.5px] text-emerald-400 border-t border-slate-800 pt-1 flex justify-between font-medium">
            <span>HOJA 2: MISMO PDF + CONTROLES LLENABLES</span>
            <span className="text-emerald-300">100% Interactivo</span>
          </div>
        </div>

      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 px-1">
        <Check size={14} className="text-emerald-400 shrink-0" /> Renderizado con PDF.js en ambas hojas: El archivo PDF fuente se conserva intacto a la izquierda y se vuelve 100% editable a la derecha.
      </div>
    </div>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="hover-scale">
      <span className="flex size-9 items-center justify-center rounded-md border border-slate-800 text-indigo-400 bg-slate-900 shadow-sm">
        {icon}
      </span>
      <h2 className="mt-3 sm:mt-4 font-medium text-white text-base sm:text-lg">{title}</h2>
      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function How({ start, back, step, setStep }: { start: () => void; back: () => void; step: number; setStep: (n: number) => void }) {
  const current = tutorialSteps[step] || tutorialSteps[0];
  const activeStepRef = useRef<HTMLButtonElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // AUTO-SCROLL AL PASO ACTIVO
  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (mainCardRef.current && window.innerWidth < 768) {
      mainCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [step]);

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-8 min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          <button onClick={back} className="text-xs sm:text-sm text-slate-400 hover:text-white flex items-center hover-scale">
            <ArrowLeft size={15} className="mr-1 inline" /> Volver al inicio
          </button>
          
          {/* SELECTOR DESPLEGABLE COMPACTO EN MÓVIL */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-indigo-300 font-medium hover-scale"
            >
              Paso {step + 1}: {current.title} <ChevronDown size={14} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-9 z-50 w-60 max-h-64 overflow-y-auto rounded-lg border border-indigo-500/40 bg-slate-900 p-2 shadow-2xl animate-dropdown">
                {tutorialSteps.map((item, i) => (
                  <button
                    key={item.title}
                    onClick={() => { setStep(i); setDropdownOpen(false); }}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs ${
                      i === step ? 'bg-indigo-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{i + 1}. {item.title}</span>
                    {i < step && <Check size={12} className="text-emerald-400 shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:gap-8 lg:grid-cols-[260px_1fr] items-start">
          
          {/* BARRA LATERAL AUTO-SCROLL DE PASOS (RESPONSIVA & AUTO-FOCUS) */}
          <aside className="hidden sm:block rounded-xl border border-slate-800 bg-slate-900 p-4 max-h-[480px] overflow-y-auto scroll-smooth">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Guía completa</p>
            <p className="mt-0.5 text-xs text-slate-400">{step + 1} de {tutorialSteps.length} etapas</p>
            
            <div className="mt-3 space-y-1">
              {tutorialSteps.map((item, i) => {
                const isActive = i === step;
                return (
                  <button
                    key={item.title}
                    ref={isActive ? activeStepRef : null}
                    onClick={() => setStep(i)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-md ring-1 ring-indigo-400 hover-scale'
                        : i < step
                        ? 'text-slate-300 hover:bg-slate-800/80 hover-scale'
                        : 'text-slate-400 hover:bg-slate-800/40 hover-scale'
                    }`}
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                        i < step ? 'border-emerald-500 bg-emerald-950 text-emerald-400 font-bold' : isActive ? 'border-white text-white font-bold' : 'border-slate-700'
                      }`}
                    >
                      {i < step ? <Check size={11} /> : i + 1}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* SECCIÓN PRINCIPAL TARJETA DE PASO (AUTO-FOCUS) */}
          <section ref={mainCardRef}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Cómo funciona · paso {step + 1} de 20</p>
                <h1 className="mt-1 text-xl sm:text-3xl font-semibold tracking-tight text-white">{current.title}</h1>
              </div>
              <div className="flex gap-1">
                <button
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                  className="rounded-md border border-slate-800 p-2 text-slate-300 disabled:opacity-30 hover:bg-slate-800 hover-scale"
                  title="Paso Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={step === tutorialSteps.length - 1}
                  onClick={() => setStep(step + 1)}
                  className="rounded-md bg-indigo-600 p-2 text-white disabled:opacity-30 hover:bg-indigo-500 shadow-sm btn-glow"
                  title="Siguiente Paso"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-xl flex flex-col justify-between min-h-[360px] animate-pop-in">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                      <Sparkles size={18} />
                    </span>
                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Etapa {step + 1}</span>
                  </div>

                  <p className="mt-4 text-sm sm:text-base leading-6 sm:leading-7 text-slate-200">{current.summary}</p>
                  
                  {/* DYNAMIC WHAT HAPPENS BOX */}
                  <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Qué ocurre en esta etapa</p>
                    <p className="mt-2 text-xs sm:text-sm leading-5 text-slate-300">
                      {current.whatHappens}
                    </p>
                    <div className="mt-4 grid gap-2.5 grid-cols-1 sm:grid-cols-3">
                      <div className="rounded-md border border-slate-800 bg-slate-900 p-2.5 hover-scale">
                        <p className="text-[10px] text-slate-400">Entrada</p>
                        <p className="mt-0.5 text-xs font-medium text-white truncate">{current.input}</p>
                      </div>
                      <div className="rounded-md border border-indigo-500/50 bg-indigo-500/10 p-2.5 hover-scale">
                        <p className="text-[10px] text-indigo-400">Acción</p>
                        <p className="mt-0.5 text-xs font-medium text-white truncate">{current.action}</p>
                      </div>
                      <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-2.5 hover-scale">
                        <p className="text-[10px] text-emerald-400">Resultado</p>
                        <p className="mt-0.5 text-xs font-medium text-white truncate">{current.output}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                  <button
                    disabled={step === 0}
                    onClick={() => setStep(step - 1)}
                    className="rounded-md border border-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 disabled:opacity-30 hover:bg-slate-800 flex items-center gap-1 hover-scale"
                  >
                    <ChevronLeft size={15} /> Anterior
                  </button>
                  {step === tutorialSteps.length - 1 ? (
                    <button
                      onClick={start}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 shadow-md flex items-center gap-1 btn-glow"
                    >
                      Probar DocScan <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep(step + 1)}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 shadow-md flex items-center gap-1 btn-glow"
                    >
                      Siguiente ({step + 2}/20) <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* DYNAMIC EXPECTED RESULT ASIDE */}
              <aside className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between animate-pop-in">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resultado esperado</p>
                  <div className="mt-3 rounded-md border border-slate-800 bg-slate-950 p-3">
                    <div className="h-2 w-24 rounded bg-slate-800 mb-3" />
                    <div className="space-y-2">
                      <div className="h-7 rounded border border-indigo-500/60 bg-indigo-500/10 flex items-center px-2 text-[11px] text-indigo-300 font-medium truncate">
                        {current.action}
                      </div>
                      <div className="h-7 rounded border border-slate-800 flex items-center px-2 text-[11px] text-slate-400 truncate">
                        {current.input}
                      </div>
                      <div className="h-7 rounded border border-emerald-500/60 bg-emerald-500/10 flex items-center px-2 text-[11px] text-emerald-300 font-medium truncate">
                        {current.output}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-300">
                    {current.resultText}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium border-t border-slate-800/80 pt-3">
                  <Check size={14} className="shrink-0" /> Documento original intacto
                </div>
              </aside>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function LoginModal({ close }: { close: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-5 animate-page-in">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6 shadow-2xl animate-pop-in">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex size-9 items-center justify-center rounded-md bg-indigo-600 text-white shadow-md">
              <LockKeyhole size={17} />
            </div>
            <h2 className="mt-4 sm:mt-5 text-lg sm:text-xl font-semibold text-white">Inicia sesión cuando quieras</h2>
            <p className="mt-2 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-400">
              Es opcional. Guarda tus plantillas y vuelve a ellas desde cualquier dispositivo.
            </p>
          </div>
          <button onClick={close} aria-label="Cerrar" className="rounded-md p-2 hover:bg-slate-800 text-slate-400 hover-scale">
            <X size={17} />
          </button>
        </div>
        <button
          onClick={close}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-md border border-slate-700 px-4 py-2.5 text-xs sm:text-sm font-medium hover:bg-slate-800 text-white hover-scale btn-glow"
        >
          <LockKeyhole size={16} /> Continuar con Google
        </button>
        <button onClick={close} className="mt-3 w-full text-xs text-slate-400 hover:text-white hover-scale">
          Continuar como invitado
        </button>
      </div>
    </div>
  );
}
