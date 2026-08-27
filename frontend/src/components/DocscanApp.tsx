import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, FileImage, FileSpreadsheet, FileText, Info, LockKeyhole, Menu, MousePointer2, Play, ScanLine, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import { DocscanWorkspace } from './DocscanWorkspace';

type View = 'home' | 'how' | 'loading' | 'upload' | 'workspace';
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

const tutorial = [
  ['Bienvenida', 'Entiende qué vas a construir y cómo DocScan conserva el documento original.'],
  ['Modo de trabajo', 'Elige análisis automático para avanzar rápido o modo manual para controlar cada detalle.'],
  ['Formato', 'Selecciona PDF, Word, Excel, PowerPoint o imagen: la estrategia de construcción cambia según el archivo.'],
  ['Carga segura', 'Sube el archivo, valida su extensión y tamaño, y conserva una copia intacta como referencia.'],
  ['Lectura original', 'Revisa cada página, hoja o diapositiva antes de indicar cualquier cambio.'],
  ['Renderizado fiel', 'El sistema reconstruye la apariencia: tipografías, posiciones, tablas, imágenes, enlaces y señales.'],
  ['Análisis estructural', 'Identifica texto, bloques, tablas, imágenes, adjuntos, vínculos, códigos y elementos repetidos.'],
  ['Resumen', 'Obtén una síntesis del documento para entender su propósito y orientar los campos.'],
  ['Sugerencias IA', 'Revisa las zonas que la IA propone y acepta, corrige o descarta cada sugerencia.'],
  ['Dibujo de zona', 'Mantén el mouse presionado y dibuja un rectángulo exactamente donde debe existir un espacio.'],
  ['Ajuste preciso', 'Mueve, redimensiona y alinea la zona para que coincida con el área real del documento.'],
  ['Instrucción libre', 'Describe con tus propias palabras qué debe aparecer, sin estar limitado a tipos predefinidos.'],
  ['Tipo de elemento', 'Marca texto, fecha, firma, hora, casilla, imagen, archivo, hipervínculo, sello, código, tabla, señal, cálculo u otro.'],
  ['Comentarios', 'Añade ejemplos, reglas, instrucciones y contexto para que cualquier persona sepa cómo completar el campo.'],
  ['Baja confianza', 'Responde preguntas puntuales de la IA cuando una región pueda interpretarse de varias formas.'],
  ['Comparación', 'Alterna entre original y plantilla para confirmar que ningún elemento no seleccionado fue alterado.'],
  ['Salida', 'Elige DOCX, XLSX o PDF y revisa qué capacidades editables ofrece cada construcción.'],
  ['Firmas', 'Configura firma manuscrita con mouse/touch o una firma tipográfica digital para campos especiales.'],
  ['Generación', 'Procesa las zonas marcadas y reemplaza únicamente los espacios indicados por controles editables.'],
  ['Descarga y edición', 'Descarga, comparte o vuelve a editar una plantilla que permanece ajustable según tus necesidades.'],
];

export function DocscanApp() {
  const [view, setView] = useState<View>('home');
  const [login, setLogin] = useState(false);
  const [howStep, setHowStep] = useState(0);
  const [notice, setNotice] = useState(false);
  const [activeFile, setActiveFile] = useState<File | null>(null);

  const go = (next: View) => {
    if (next === 'loading') {
      setView('loading');
      window.setTimeout(() => setView('upload'), 900);
    } else {
      setView(next);
    }
  };

  const handleSelectedFile = (file: File) => {
    setActiveFile(file);
    setView('workspace');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur px-5 sm:px-8">
        <button onClick={() => go('home')} className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm">
            <ScanLine size={17} />
          </span>
          <span className="font-semibold tracking-tight text-white">
            DocScan <span className="font-normal text-slate-400">Inteligente</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          <button
            onClick={() => go('home')}
            className={`rounded-md px-3 py-2 text-sm ${view === 'home' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
          >
            Inicio
          </button>
          <button
            onClick={() => go('how')}
            className={`rounded-md px-3 py-2 text-sm ${view === 'how' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
          >
            Cómo funciona
          </button>
          <button
            onClick={() => go('workspace')}
            className={`rounded-md px-3 py-2 text-sm ${view === 'workspace' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
          >
            Workspace
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogin(true)}
            className="hidden rounded-md border border-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-800 sm:block text-slate-200"
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => setNotice(!notice)}
            aria-label="Notificaciones"
            className="relative rounded-md p-2 text-slate-400 hover:bg-slate-800"
          >
            <Info size={18} />
            {notice && (
              <div className="absolute right-0 top-11 w-64 rounded-lg border border-slate-800 bg-slate-900 p-4 text-left text-xs shadow-xl z-50">
                <p className="font-medium text-white">Modo invitado disponible</p>
                <p className="mt-1 text-slate-400">Puedes probar todas las funciones sin necesidad de crear cuenta.</p>
              </div>
            )}
          </button>
          <button onClick={() => go('home')} className="rounded-md p-2 md:hidden text-slate-400">
            <Menu size={19} />
          </button>
        </div>
      </header>

      {view === 'home' && <Landing start={() => go('loading')} how={() => go('how')} login={() => setLogin(true)} />}
      {view === 'how' && <How start={() => go('loading')} back={() => go('home')} step={howStep} setStep={setHowStep} />}
      {view === 'loading' && <Loading />}
      {view === 'upload' && <UploadView start={(f) => handleSelectedFile(f)} back={() => go('home')} />}
      {view === 'workspace' && <DocscanWorkspace initialFile={activeFile} back={() => go('upload')} />}

      {login && <LoginModal close={() => setLogin(false)} />}
    </div>
  );
}

function Landing({ start, how, login }: { start: () => void; how: () => void; login: () => void }) {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:pt-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400">
            <ShieldCheck size={14} className="text-indigo-400" /> Gratis para empezar · Sin registro obligatorio
          </div>
          <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-[-0.045em] sm:text-6xl text-white">
            Convierte cualquier documento en una plantilla <span className="text-indigo-400">editable al 100%.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-400">
            Analiza PDFs, Word, Excel, PowerPoint e imágenes. Resume su contenido, conserva su apariencia e identifica espacios en controles listos para completar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={start}
              className="rounded-md bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500 shadow-md transition-all"
            >
              Comenzar gratis <ArrowRight size={16} className="ml-2 inline" />
            </button>
            <button
              onClick={how}
              className="rounded-md border border-slate-800 px-5 py-3 text-sm font-medium hover:bg-slate-800 text-slate-200"
            >
              <Play size={14} className="mr-2 inline" /> Ver cómo funciona
            </button>
          </div>
          <button onClick={login} className="mt-5 text-xs text-slate-400 underline underline-offset-4 hover:text-slate-200">
            Iniciar sesión opcionalmente para guardar tu trabajo
          </button>
        </div>
        <PreviewCard />
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Una herramienta, muchos usos</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Del archivo original a un flujo digital completo.</h2>
            <p className="mt-4 leading-7 text-slate-400">
              Reduce papel, evita rehacer formatos y convierte procesos manuales en experiencias claras. DocScan entiende que cada formato necesita una construcción diferente.
            </p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
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

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-5">
          {formats.map(({ kind, label, detail, icon: Icon }) => (
            <div key={kind} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <span className={`flex size-9 items-center justify-center rounded-md ${kindColors[kind]} text-white`}>
                <Icon size={17} />
              </span>
              <p className="mt-4 text-sm font-medium text-white">{label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function PreviewCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 pb-4">
        <div className="flex items-center gap-2">
          <ScanLine size={15} className="text-indigo-400" />
          <span className="text-xs font-medium text-slate-200">Plantilla reconstruida</span>
        </div>
        <span className="text-[10px] text-emerald-400">Apariencia preservada</span>
      </div>
      <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-5">
        <div className="flex justify-between">
          <div className="h-2 w-32 rounded bg-slate-800" />
          <div className="h-2 w-12 rounded bg-slate-800" />
        </div>
        <div className="mt-8 grid gap-4">
          <div className="h-2 w-3/4 rounded bg-slate-800" />
          <div className="h-9 rounded border border-indigo-500/60 bg-indigo-500/10 flex items-center px-3 text-xs text-indigo-300">
            Campo editable de texto
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-9 rounded border border-slate-800 flex items-center px-3 text-xs text-slate-500">Fecha</div>
            <div className="h-9 rounded border border-slate-800 flex items-center px-3 text-xs text-slate-500">Firma</div>
          </div>
          <div className="h-16 rounded border border-emerald-500/60 bg-emerald-500/10 flex items-center px-3 text-xs text-emerald-300">
            Texto estático impreso no modificado
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <Check size={14} className="text-emerald-400" /> Solo cambia lo que indicaste
      </div>
    </div>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <span className="flex size-9 items-center justify-center rounded-md border border-slate-800 text-indigo-400 bg-slate-900">
        {icon}
      </span>
      <h2 className="mt-4 font-medium text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function How({ start, back, step, setStep }: { start: () => void; back: () => void; step: number; setStep: (n: number) => void }) {
  const current = tutorial[step];
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <button onClick={back} className="text-sm text-slate-400 hover:text-white mb-6">
        <ArrowLeft size={15} className="mr-1 inline" /> Volver al inicio
      </button>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-4 max-h-[700px] overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Guía completa</p>
          <p className="mt-2 text-sm text-slate-400">{step + 1} de {tutorial.length} etapas</p>
          <div className="mt-5 space-y-1">
            {tutorial.map(([title], i) => (
              <button
                key={title}
                onClick={() => setStep(i)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs ${
                  i === step ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    i < step ? 'border-emerald-500 text-emerald-400' : 'border-slate-700'
                  }`}
                >
                  {i < step ? <Check size={11} /> : i + 1}
                </span>
                {title}
              </button>
            ))}
          </div>
        </aside>

        <section>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Cómo funciona · paso {step + 1}</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">{current[0]}</h1>
            </div>
            <div className="hidden gap-1 sm:flex">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-10 rounded-sm ${i <= Math.floor(step / 4) ? 'bg-indigo-500' : 'bg-slate-800'}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_280px]">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
              <div className="flex min-h-[390px] flex-col justify-between">
                <div>
                  <span className="flex size-11 items-center justify-center rounded-lg bg-slate-800 text-indigo-400">
                    <Sparkles size={20} />
                  </span>
                  <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">{current[1]}</p>
                  <div className="mt-7 rounded-lg border border-slate-800 bg-slate-950 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Qué ocurre</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      DocScan conserva el original como referencia y crea una capa de trabajo separada. Tus instrucciones se aplican únicamente a la región seleccionada.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md border border-slate-800 p-3">
                        <p className="text-xs text-slate-400">Entrada</p>
                        <p className="mt-1 text-sm text-white">Archivo original</p>
                      </div>
                      <div className="rounded-md border border-indigo-500/50 p-3">
                        <p className="text-xs text-indigo-400">Acción</p>
                        <p className="mt-1 text-sm text-white">Tu indicación</p>
                      </div>
                      <div className="rounded-md border border-emerald-500/50 p-3">
                        <p className="text-xs text-emerald-400">Resultado</p>
                        <p className="mt-1 text-sm text-white">Zona editable</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
                  <button
                    disabled={step === 0}
                    onClick={() => setStep(step - 1)}
                    className="rounded-md border border-slate-800 px-3 py-2 text-sm text-slate-300 disabled:opacity-30"
                  >
                    <ChevronLeft size={15} className="mr-1 inline" /> Anterior
                  </button>
                  {step === tutorial.length - 1 ? (
                    <button
                      onClick={start}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      Probar DocScan <ArrowRight size={15} className="ml-1 inline" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep(step + 1)}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      Siguiente <ChevronRight size={15} className="ml-1 inline" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resultado esperado</p>
              <div className="mt-5 rounded-md border border-slate-800 bg-slate-950 p-4">
                <div className="h-2 w-28 rounded bg-slate-800" />
                <div className="mt-5 space-y-3">
                  <div className="h-2 w-full rounded bg-slate-800" />
                  <div className="h-8 rounded border border-indigo-500/60 bg-indigo-500/10 flex items-center px-2 text-xs text-indigo-300">
                    Zona marcada
                  </div>
                  <div className="h-8 rounded border border-slate-800" />
                  <div className="h-8 rounded border border-emerald-500/60 bg-emerald-500/10 flex items-center px-2 text-xs text-emerald-300">
                    Impreso intacto
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Una vista verificable, con el original intacto y las instrucciones listas para convertirse en campos editables.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-emerald-400">
                <Check size={14} /> Sin alterar lo no seleccionado
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Loading() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-indigo-400">
          <ScanLine size={25} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-white">Preparando tu espacio</h1>
        <p className="mt-2 text-sm text-slate-400">Configurando herramientas de carga y revisión…</p>
        <div className="mx-auto mt-6 h-1 w-48 overflow-hidden rounded bg-slate-800">
          <div className="h-full w-2/3 animate-pulse bg-indigo-500" />
        </div>
      </div>
    </main>
  );
}

function UploadView({ start, back }: { start: (file: File) => void; back: () => void }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      start(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      start(e.target.files[0]);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <button onClick={back} className="text-sm text-slate-400 hover:text-white mb-6">
        <ArrowLeft size={15} className="mr-1 inline" /> Inicio
      </button>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Paso 1 · Ingestión</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Carga tu documento</h1>
        <p className="mt-2 text-slate-400">Primero podrás leerlo y verificarlo; después indicarás qué debe cambiar.</p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_300px]">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed transition-all p-8 text-center ${
            dragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900 hover:border-slate-500'
          }`}
        >
          <Upload size={28} className="text-indigo-400" />
          <span className="mt-4 font-medium text-white">Arrastra un archivo aquí</span>
          <span className="mt-2 text-sm text-slate-400">DOCX, PDF, XLSX, PPTX o imagen · máximo 25 MB</span>
          <input className="sr-only" type="file" accept=".docx,.pdf,.xlsx,.pptx,image/*" onChange={handleFileChange} />
        </label>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Formatos compatibles</p>
          {formats.map(({ kind, label, icon: Icon }) => (
            <div key={kind} className="mt-4 flex items-center gap-3">
              <span className={`flex size-8 items-center justify-center rounded ${kindColors[kind]} text-white`}>
                <Icon size={15} />
              </span>
              <span className="text-sm text-slate-200">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function LoginModal({ close }: { close: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-5">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex size-9 items-center justify-center rounded-md bg-indigo-600 text-white">
              <LockKeyhole size={17} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">Inicia sesión cuando quieras</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Es opcional. Guarda tus plantillas y vuelve a ellas desde cualquier dispositivo.
            </p>
          </div>
          <button onClick={close} aria-label="Cerrar" className="rounded-md p-2 hover:bg-slate-800 text-slate-400">
            <X size={17} />
          </button>
        </div>
        <button
          onClick={close}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-md border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800 text-white"
        >
          <LockKeyhole size={16} /> Continuar con Google
        </button>
        <button onClick={close} className="mt-3 w-full text-xs text-slate-400 hover:text-white">
          Continuar como invitado
        </button>
      </div>
    </div>
  );
}
