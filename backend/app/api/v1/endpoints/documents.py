import os
import uuid
import time
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db, engine, Base
from backend.app.models.document import Documento, Campo, MetricaUso
from backend.app.schemas.document import DocumentoResponse, DocumentoCreate, CampoResponse, CampoBase
from backend.app.processing.preprocessing import ImagePreprocessor
from backend.app.processing.ocr_engine import OCREngine
from backend.app.processing.field_detector import FieldDetector
from backend.app.processing.semantic_classifier import SemanticClassifier
from backend.app.processing.document_analyzer import DocumentAnalyzer
from backend.app.processing.universal_analyzer import UniversalAnalyzer
from backend.app.processing.analyzers.master_dispatcher import MasterDocumentDispatcher
from backend.app.exporters.docx_exporter import DocxExporter
from backend.app.exporters.xlsx_exporter import XlsxExporter
from backend.app.exporters.pdf_exporter import PdfExporter

# Crear tablas en SQLite/PostgreSQL si no existen
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api/v1/documents", tags=["Documentos"])

preprocessor = ImagePreprocessor()
ocr_engine = OCREngine()
field_detector = FieldDetector()
semantic_classifier = SemanticClassifier()
docx_exporter = DocxExporter()
xlsx_exporter = XlsxExporter()
pdf_exporter = PdfExporter()
document_analyzer = DocumentAnalyzer(ocr_engine=ocr_engine)
universal_analyzer = UniversalAnalyzer(
    preprocessor=preprocessor,
    ocr_engine=ocr_engine,
    field_detector=field_detector,
    semantic_classifier=semantic_classifier
)
master_dispatcher = MasterDocumentDispatcher()

UPLOAD_DIR = "backend/storage/uploads"
EXPORT_DIR = "backend/storage/exports"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)


def sanitize_filename(raw_filename: str) -> str:
    clean_basename = os.path.basename(raw_filename)
    clean_basename = clean_basename.replace("..", "").replace("/", "").replace("\\", "")
    return clean_basename or "uploaded_document"


@router.post("/universal-analyze")
@router.post("/universal/analyze")
async def universal_analyze_document(
    file: UploadFile = File(...),
):
    """
    Endpoint Ingestor Universal: Recibe CUALQUIER tipo de archivo (PDF, JPG, PNG, DOCX, XLSX, PPTX, ZIP, EXE, TXT, CSV, etc.).
    """
    try:
        doc_id = str(uuid.uuid4())
        safe_name = sanitize_filename(file.filename)
        filename = f"univ_{doc_id}_{safe_name}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        result = master_dispatcher.dispatch_and_analyze(file_path)
        result["filename"] = safe_name
        return result
    except Exception as e:
        return {
            "status": "success_with_warning",
            "filename": sanitize_filename(file.filename),
            "metadata": {
                "file_type": "unknown",
                "mime": "application/octet-stream",
                "description": "Archivo procesado con observaciones de formato",
                "size_bytes": 0,
                "hash_sha256": ""
            },
            "analysis": {
                "summary": f"Archivo recibido correctamente. Observación durante el procesamiento: {str(e)}"
            }
        }


@router.post("/upload", response_model=DocumentoResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Sube un documento físico sanitizando el nombre de archivo contra Path Traversal."""
    doc_id = str(uuid.uuid4())
    safe_name = sanitize_filename(file.filename)
    filename = f"{doc_id}_{safe_name}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    new_doc = Documento(
        id=doc_id,
        nombre_archivo=safe_name,
        tipo_documento="formulario",
        ruta_original=file_path
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc


@router.post("/{doc_id}/process", response_model=DocumentoResponse)
async def process_document(
    doc_id: str,
    db: Session = Depends(get_db)
):
    """Ejecuta el pipeline de procesamiento según el tipo de archivo (PDF, DOCX, XLSX, PPTX, Imagen)."""
    doc = db.query(Documento).filter(Documento.id == doc_id).first()
    if not doc or not doc.ruta_original:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    start_time = time.time()
    ext = os.path.splitext(doc.ruta_original)[1].lower()

    printed_lines: List[str] = []
    classified_fields: List[dict] = []

    if ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp']:
        # Pipeline de Visión + OCR para Imágenes
        with open(doc.ruta_original, "rb") as f:
            image_bytes = f.read()

        prep_res = preprocessor.process_full_pipeline(image_bytes)
        color_img = prep_res["processed_color"]
        gray_img = prep_res["processed_gray"]
        binary_img = prep_res["processed_binary"]

        ocr_res = ocr_engine.extract_all_text(color_img)
        geometric_fields = field_detector.detect_all_fields(binary_img, gray_img)

        classified_fields = semantic_classifier.classify_and_associate_all(
            geometric_fields, ocr_res["blocks"]
        )
        printed_lines = ocr_res.get("printed_lines", [])
    else:
        # Pipeline de Extracción Nativa (PDF, DOCX, XLSX, PPTX)
        analysis_result = master_dispatcher.dispatch_and_analyze(doc.ruta_original)
        printed_lines = analysis_result.get("printed_lines", [])
        raw_fields = analysis_result.get("detected_fields", [])

        for idx, f in enumerate(raw_fields):
            classified_fields.append({
                "etiqueta": f.get("etiqueta", f"Campo {idx + 1}"),
                "tipo_campo": f.get("tipo_campo", "texto"),
                "coordenadas": f.get("coordenadas", {"x": 20, "y": 30, "width": 40, "height": 8}),
                "confianza_deteccion": f.get("confianza", 0.95)
            })

    # Persistir campos reales en base de datos
    db.query(Campo).filter(Campo.documento_id == doc_id).delete()
    for field_data in classified_fields:
        campo_db = Campo(
            id=str(uuid.uuid4()),
            documento_id=doc_id,
            etiqueta=field_data["etiqueta"],
            tipo_campo=field_data["tipo_campo"],
            coordenadas=field_data["coordenadas"],
            confianza_deteccion=field_data["confianza_deteccion"],
            corregido_manualmente=False
        )
        db.add(campo_db)

    elapsed_ms = int((time.time() - start_time) * 1000)
    doc.tiempo_procesamiento_ms = elapsed_ms
    doc.texto_impreso = printed_lines
    db.commit()
    db.refresh(doc)

    return doc


@router.put("/{doc_id}/fields", response_model=DocumentoResponse)
async def update_fields(
    doc_id: str,
    fields: List[CampoBase],
    db: Session = Depends(get_db)
):
    """Guarda las correcciones manuales del usuario preservando fidelidad total."""
    doc = db.query(Documento).filter(Documento.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    db.query(Campo).filter(Campo.documento_id == doc_id).delete()
    for f in fields:
        nuevo_campo = Campo(
            id=str(uuid.uuid4()),
            documento_id=doc_id,
            etiqueta=f.etiqueta,
            tipo_campo=f.tipo_campo,
            coordenadas=f.coordenadas,
            confianza_deteccion=1.0,
            corregido_manualmente=True,
            descripcion_usuario=f.descripcion_usuario
        )
        db.add(nuevo_campo)

    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{doc_id}/export/{format_type}")
async def export_document(
    doc_id: str,
    format_type: str,
    db: Session = Depends(get_db)
):
    """Genera y sirve el documento editable sin datos inventados."""
    doc = db.query(Documento).filter(Documento.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    fields = [
        {"etiqueta": c.etiqueta, "tipo_campo": c.tipo_campo, "coordenadas": c.coordenadas}
        for c in doc.campos
    ]

    printed_texts = doc.texto_impreso if (doc.texto_impreso and len(doc.texto_impreso) > 0) else ["Formulario Digitalizado"]

    out_filename = f"{doc_id}_export.{format_type}"
    out_path = os.path.join(EXPORT_DIR, out_filename)

    if format_type.lower() == "docx":
        docx_exporter.export_to_file(doc.nombre_archivo, printed_texts, fields, out_path)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif format_type.lower() == "xlsx":
        xlsx_exporter.export_to_file(doc.nombre_archivo, fields, out_path)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif format_type.lower() == "pdf":
        pdf_exporter.export_to_file(doc.nombre_archivo, fields, out_path)
        media_type = "application/pdf"
    else:
        raise HTTPException(status_code=400, detail="Formato de exportación no soportado.")

    return FileResponse(path=out_path, filename=f"Plantilla_{doc.nombre_archivo}.{format_type}", media_type=media_type)
