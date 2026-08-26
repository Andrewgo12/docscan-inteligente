from typing import List, Dict, Any, Optional
from backend.app.exporters.pdf_exporter import PdfExporter

class PdfTemplateBuilder:
    """Diseñador y Creador Especializado de Plantillas Editables PDF AcroForm."""

    def __init__(self):
        self.exporter = PdfExporter()

    def build_pdf_template(self, title: str, fields: List[Dict[str, Any]], output_path: str, images: Optional[List[str]] = None) -> str:
        return self.exporter.export_to_file(title, fields, output_path, images_to_embed=images)
