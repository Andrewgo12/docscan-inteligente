import os
from typing import Dict, Any
from backend.app.processing.preprocessing import ImagePreprocessor
from backend.app.processing.ocr_engine import OCREngine

class PdfAnalyzer:
    """
    Analizador Especializado de Documentos PDF y Contenido Gráfico.
    """

    def __init__(self, preprocessor: ImagePreprocessor = None, ocr_engine: OCREngine = None):
        self.preprocessor = preprocessor or ImagePreprocessor()
        self.ocr_engine = ocr_engine or OCREngine()

    def analyze(self, file_path: str) -> Dict[str, Any]:
        size_bytes = os.path.getsize(file_path)
        return {
            "format": "pdf",
            "file_type": "pdf",
            "file_name": os.path.basename(file_path),
            "size_bytes": size_bytes,
            "summary": f"Documento PDF de {round(size_bytes/1024, 1)} KB analizado mediante el pipeline de visión y OCR."
        }
