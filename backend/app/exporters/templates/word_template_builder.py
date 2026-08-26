from typing import List, Dict, Any, Optional
from backend.app.exporters.docx_exporter import DocxExporter

class WordTemplateBuilder:
    """Diseñador y Creador Especializado de Plantillas Editables Microsoft Word (.docx)."""

    def __init__(self):
        self.exporter = DocxExporter()

    def build_docx_template(self, title: str, paragraphs: List[str], fields: List[Dict[str, Any]], output_path: str, images: Optional[List[str]] = None) -> str:
        return self.exporter.export_to_file(title, paragraphs, fields, output_path, images_to_embed=images)
