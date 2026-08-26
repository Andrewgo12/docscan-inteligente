import os
from typing import Dict, Any
from backend.app.processing.universal_analyzer import UniversalAnalyzer
from backend.app.processing.analyzers.pdf_analyzer import PdfAnalyzer
from backend.app.processing.analyzers.word_analyzer import WordAnalyzer
from backend.app.processing.analyzers.excel_analyzer import ExcelAnalyzer
from backend.app.processing.analyzers.powerpoint_analyzer import PowerpointAnalyzer
from backend.app.processing.analyzers.zip_analyzer import ZipAnalyzer

class MasterDocumentDispatcher:
    """
    Despachador Maestro Centralizado (Factory / Dispatcher Pattern).
    Detecta A CIEGAS el formato binario exacto por Magic Bytes y delega el análisis
    al módulo analizador especializado correspondiente (Word, Excel, PowerPoint, PDF, ZIP).
    """

    def __init__(self):
        self.universal_detector = UniversalAnalyzer()
        self.pdf_analyzer = PdfAnalyzer()
        self.word_analyzer = WordAnalyzer()
        self.excel_analyzer = ExcelAnalyzer()
        self.powerpoint_analyzer = PowerpointAnalyzer()
        self.zip_analyzer = ZipAnalyzer()

    def dispatch_and_analyze(self, file_path: str) -> Dict[str, Any]:
        """
        Determina automáticamente el formato ciego y llama al analizador específico.
        """
        metadata = self.universal_detector.detect_file_type_blind(file_path)
        file_type = metadata.get("file_type")

        # Ruteo a los módulos analizadores independientes
        if file_type == "office_word":
            result = self.word_analyzer.analyze(file_path)
        elif file_type == "office_excel":
            result = self.excel_analyzer.analyze(file_path)
        elif file_type == "office_powerpoint":
            result = self.powerpoint_analyzer.analyze(file_path)
        elif file_type == "pdf" or file_type == "image":
            result = self.pdf_analyzer.analyze(file_path)
        elif file_type == "zip_archive":
            result = self.zip_analyzer.analyze(file_path)
        else:
            result = {
                "format": file_type,
                "file_name": os.path.basename(file_path),
                "summary": f"Archivo de tipo '{file_type}' procesado por el despachador central."
            }

        result["metadata"] = metadata
        result["filename"] = metadata.get("file_name", os.path.basename(file_path))
        result["status"] = "success"
        return result
