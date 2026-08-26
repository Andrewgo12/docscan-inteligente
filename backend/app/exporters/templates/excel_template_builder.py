from typing import List, Dict, Any, Optional
from backend.app.exporters.xlsx_exporter import XlsxExporter

class ExcelTemplateBuilder:
    """Diseñador y Creador Especializado de Plantillas Editables Microsoft Excel (.xlsx)."""

    def __init__(self):
        self.exporter = XlsxExporter()

    def build_xlsx_template(self, title: str, fields: List[Dict[str, Any]], output_path: str, images: Optional[List[str]] = None) -> str:
        return self.exporter.export_to_file(title, fields, output_path, images_to_embed=images)
