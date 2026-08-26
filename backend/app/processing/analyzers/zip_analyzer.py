import os
import zipfile
from typing import Dict, Any, List

class ZipAnalyzer:
    """
    Analizador Especializado de Archivos Comprimidos (ZIP) y Binarios.
    """

    def analyze(self, file_path: str) -> Dict[str, Any]:
        size_bytes = os.path.getsize(file_path)
        internal_files = []

        try:
            with zipfile.ZipFile(file_path, 'r') as z:
                internal_files = z.namelist()[:30] # Muestra hasta 30 elementos
        except Exception:
            pass

        return {
            "format": "zip",
            "file_type": "zip_archive",
            "file_name": os.path.basename(file_path),
            "size_bytes": size_bytes,
            "internal_files_count": len(internal_files),
            "internal_files": internal_files,
            "summary": f"Archivo comprimido ZIP de {round(size_bytes/1024, 1)} KB analizado. Contiene {len(internal_files)} elementos."
        }
