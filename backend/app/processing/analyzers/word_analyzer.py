import os
import zipfile
from typing import Dict, Any, List

EXTRACTED_IMG_DIR = "backend/storage/uploads/extracted_images"
os.makedirs(EXTRACTED_IMG_DIR, exist_ok=True)

class WordAnalyzer:
    """
    Analizador Especializado de Documentos Microsoft Word (.docx).
    """

    def extract_embedded_images(self, file_path: str) -> List[str]:
        extracted_paths = []
        try:
            with zipfile.ZipFile(file_path, 'r') as z:
                for member in z.namelist():
                    if member.startswith('word/media/') and not member.endswith('/'):
                        img_filename = os.path.basename(member)
                        out_path = os.path.join(EXTRACTED_IMG_DIR, f"{os.path.basename(file_path)}_{img_filename}")
                        with open(out_path, 'wb') as f_out:
                            f_out.write(z.read(member))
                        extracted_paths.append(out_path)
        except Exception:
            pass
        return extracted_paths

    def analyze(self, file_path: str) -> Dict[str, Any]:
        size_bytes = os.path.getsize(file_path)
        images = self.extract_embedded_images(file_path)
        
        return {
            "format": "word",
            "file_type": "office_word",
            "file_name": os.path.basename(file_path),
            "size_bytes": size_bytes,
            "embedded_images": len(images),
            "image_paths": images,
            "summary": f"Documento Word (.docx) analizado. Se extrajeron {len(images)} imágenes y logotipos incrustados."
        }
