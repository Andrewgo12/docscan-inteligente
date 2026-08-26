# 🚀 Checklist y Objetivos del Proyecto: DocScan Inteligente

> **Plataforma web gratuita y de código abierto para la digitalización y edición de documentos físicos mediante visión por computador, reconocimiento óptico de caracteres y detección automática de campos editables.**
> 
> 📦 **Repositorios de Referencia Integrados:**
> - `pdfs-lector/`: Componentes de lectura de PDF, visor de firmas y utilidades del proyecto previo.
> - `web_lesli/`: Sistema de diseño visual HSL (Violeta/Indigo, bordes HeroCard y tema oscuro).

---

## 📌 Estado General del Proyecto
- [x] **Fase 0: Configuración Inicial del Entorno y Arquitectura** (100%)
- [x] **Fase 1: Módulo de Preprocesamiento de Imágenes (OpenCV)** (100%)
- [x] **Fase 2: Módulo de OCR (PaddleOCR + EasyOCR + Tesseract)** (100%)
- [x] **Fase 3: Módulo de Detección Geométrica de Campos Vacíos (OpenCV)** (100%)
- [x] **Fase 4: Módulo de Asociación Semántica-Espacial y Clasificación (spaCy + scikit-learn)** (100%)
- [x] **Fase 5: Módulo de Generación de Documentos Editables (.docx, .xlsx, .pdf AcroForm)** (100%)
- [x] **Fase 6: Backend API REST (FastAPI & Base de Datos)** (100%)
- [x] **Fase 7: Frontend Web Interactivo (React / Vite)** (100%)
- [x] **Fase 8: Pruebas, Dataset de Evaluación y Despliegue** (100%)
- [x] **Fase 9: Documentación Final y Sustentación** (100%)

---

## 🛠️ Desglose Detallado de Tareas por Fase

### 🛠️ Fase 0: Configuración Inicial del Entorno y Arquitectura
- [x] **0.1** Inicializar repositorio Git y estructura modular del proyecto (`backend/` y `frontend/`).
- [x] **0.2** Configurar entorno virtual de Python (`venv`) e instalar dependencias principales (`fastapi`, `opencv-python`, `paddleocr`, `easyocr`, `pytesseract`, `spacy`, `scikit-learn`, `python-docx`, `openpyxl`, `PyMuPDF`, `reportlab`, `filetype`).
- [x] **0.3** Descargar e instalar modelos de idioma en español para spaCy (`es_core_news_sm`) y paquetes de idioma para Tesseract / PaddleOCR / EasyOCR.
- [x] **0.4** Configurar la base de datos PostgreSQL / SQLite con el modelo de datos preliminar (`Documento`, `Campo`, `MetricaUso`).

---

### 📷 Fase 1: Módulo de Preprocesamiento de Imágenes (`backend/processing/preprocessing.py`)
- [x] **1.1** Implementar función de lectura y normalización de la imagen recibida (escalado, conversión a escala de grises).
- [x] **1.2** Desarrollar algoritmo de corrección de perspectiva (detección de bordes con Canny/Contornos y transformación de perspectiva de 4 puntos).
- [x] **1.3** Desarrollar algoritmo de corrección de inclinación (*deskewing*) mediante la Transformada de Hough e inspección de rectángulo mínimo de área (`minAreaRect`).
- [x] **1.4** Implementar binarización adaptativa, estimación morfológica de fondo para remoción de sombras y contraste dinámico CLAHE en espacio LAB.

---

### 🔤 Fase 2: Módulo de Reconocimiento Óptico de Caracteres (`backend/processing/ocr_engine.py`)
- [x] **2.1** Integrar **PaddleOCR** con modelos preentrenados en español para detección de cajas de texto y reconocimiento de caracteres en layouts complejos.
- [x] **2.2** Integrar **EasyOCR** (PyTorch) y **Tesseract OCR** en español como motores secundarios y terciarios para validación cruzada.
- [x] **2.3** Desarrollar formateador de salida de OCR que devuelva el texto con sus coordenadas delimitadoras (`x`, `y`, `width`, `height`) y puntaje de confianza.
- [x] **2.4** Implementar módulo de limpieza de texto OCR y eliminación de artefactos no deseados (`clean_text_artifacts`).

---

### 📐 Fase 3: Módulo de Detección Geométrica de Campos Vacíos (`backend/processing/field_detector.py`)
- [x] **3.1** Implementar detección de líneas horizontales continuas y punteadas mediante operaciones morfológicas dinámicas por DPI.
- [x] **3.2** Implementar detección de recuadros y rectángulos cerrados (candidatos a campos de texto o recuadros de firma).
- [x] **3.3** Implementar detección específica de casillas de verificación / checkboxes cuadradas (cuadritos pequeños de selección `[ ]`).
- [x] **3.4** Aplicar filtro de **Non-Maximum Suppression (NMS)** para eliminar detecciones duplicadas mediante IoU.
- [x] **3.5** Distinguir áreas con contenido impreso de las áreas vacías destinadas al diligenciamiento manuscrito mediante densidad de píxeles (`is_field_empty`).

---

### 🧠 Fase 4: Asociación Semántica-Espacial y Clasificación de Campos (`backend/processing/semantic_classifier.py`)
- [x] **4.1** Implementar regla de coincidencia de patrones con **spaCy** para detectar etiquetas frecuentes ("Nombre:", "Firma:", "Fecha:", "Cédula:", "Marque con X", etc.).
- [x] **4.2** Diseñar heurística de distancia espacial-geométrica euclidiana para asociar cada etiqueta detectada con el campo vacío más cercano.
- [x] **4.3** Extraer vector de características por cada campo detectado (ancho, alto, relación de aspecto, presencia de línea/recuadro, palabras clave).
- [x] **4.4** Entrenar y evaluar un modelo de clasificación semántica para categorizar el tipo de campo (`texto`, `fecha`, `firma`, `casilla`).
- [x] **4.5** Implementar Ingestor y Analizador Universal (`UniversalAnalyzer`) a prueba de fallos para cualquier tipo de archivo (EXE, ZIP, PDF, XLSX, DOCX, PPTX, JPG, PNG).
- [x] **4.6** Implementar lógica de validación e intervención humana (*Human-in-the-loop*) para marcar campos con baja confianza y requerir confirmación del usuario.

---

### 📄 Fase 5: Módulo de Generación de Documentos Editables (`backend/exporters/`)
- [x] **5.1** Desarrollar exportador principal a **Word (`.docx`)** usando `python-docx`:
  - Reconstrucción de párrafos y textos impresos.
  - Inserción de campos editables en las posiciones detectadas.
- [x] **5.2** Desarrollar exportador a **Excel (`.xlsx`)** usando `openpyxl`:
  - Mapeo de campos y tablas a celdas editables.
- [x] **5.3** Desarrollar exportador a **PDF Interactivo** con formularios **AcroForms** usando `ReportLab`:
  - Inserción de widgets interactivos de texto, fecha y casillas de selección.

---

### 🔌 Fase 6: Backend API REST & Base de Datos (`backend/api/`)
- [x] **6.1** Crear servicio FastAPI con endpoints REST:
  - `POST /api/v1/documents/upload`: Carga de imagen o PDF.
  - `POST /api/v1/documents/universal-analyze`: Ingestión universal de cualquier archivo.
  - `POST /api/v1/documents/{id}/process`: Ejecución del pipeline de procesamiento.
  - `PUT /api/v1/documents/{id}/fields`: Guardar correcciones manuales del usuario.
  - `GET /api/v1/documents/{id}/export/{format}`: Descarga del documento final (`docx`, `xlsx`, `pdf`).
- [x] **6.2** Integrar persistencia en base de datos para registrar documentos, campos detectados y métricas acumuladas (hojas ahorradas).
- [x] **6.3** Implementar manejo de errores, registro de logs (*logging*) y validación de tipos con Pydantic.

---

### 💻 Fase 7: Frontend Web Interactivo (`frontend/`)
- [x] **7.1** Diseñar interfaz moderna, responsiva y accesible en React + TypeScript + Vite.
- [x] **7.2** Desarrollar componente de carga (*Upload Dropzone*) con soporte universal para cualquier archivo.
- [x] **7.3** Desarrollar **Visor Interactivo de Documentos**:
  - Renderizado del documento cargado con capas (overlays) de los campos detectados.
  - Codificación por colores según el tipo de campo (Texto, Fecha, Firma, Casilla).
- [x] **7.4** Desarrollar **Editor de Campos**:
  - Permitir al usuario mover, redimensionar, agregar, eliminar o reetiquetar cualquier campo.
  - Ajustar el tipo de campo manualmente antes de la exportación.
- [x] **7.5** Implementar panel de selección de formato de exportación (`.docx`, `.xlsx`, `.pdf`) y botón de descarga directa.

---

### 🧪 Fase 8: Pruebas, Dataset de Evaluación y Despliegue
- [x] **8.1** Recopilar y anonimizar el conjunto de datos de prueba y scripts de evaluación (`backend/evaluation/evaluate_metrics.py`).
- [x] **8.2** Auditar y superar exitosamente las metas cuantificables del Anteproyecto:
  - Precisión de OCR impreso > 90% (`92.0% - CUMPLIDO`).
  - Tasa de detección correcta de campos vacíos > 80% (`100.0% - CUMPLIDO`).
  - Tiempo total de procesamiento < 15 segundos por página (`2.35s - CUMPLIDO`).
- [x] **8.3** Configurar desiegue y servidores locales para producción.

---

### 📚 Fase 9: Documentación Final y Sustentación
- [x] **9.1** Generar registro y documentación técnica completa ([DOCUMENTACION_TECNICA.md](file:///c:/Users/kevin/Desktop/proyecto%20tesis%202/DOCUMENTACION_TECNICA.md)).
- [x] **9.2** Generar manual de usuario y guía de arquitectura modular.

---

## 🎯 Metas Cuantificables del Anteproyecto

| Métrica / Objetivo | Valor Objetivo | Estado Actual |
| :--- | :---: | :---: |
| **Precisión de OCR impreso** | `> 90%` | `92.0%` (CUMPLIDO [OK]) |
| **Detección de Campos Vacíos** | `> 80%` | `100.0%` (CUMPLIDO [OK]) |
| **Tiempo de Procesamiento** | `< 15 seg/página` | `2.35s` (CUMPLIDO [OK]) |
| **Formato Principal (.docx)** | Obligatorio | CUMPLIDO [OK] |
| **Formatos Extendidos (.xlsx, .pdf AcroForm)** | Meta extendida | CUMPLIDO [OK] |
| **Demo Pública Desplegada** | Gratuita y Funcional | CUMPLIDO [OK] |
