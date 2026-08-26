import os
import zipfile
from typing import List

EXTRACTED_IMG_DIR = "backend/storage/uploads/extracted_images"
os.makedirs(EXTRACTED_IMG_DIR, exist_ok=True)

class ImageExtractor:
    """Extractor especializado de imágenes incrustadas, logotipos y firmas."""

    def extract_from_zip(self, file_path: str, media_prefix: str) -> List[str]:
        extracted = []
        try:
            with zipfile.ZipFile(file_path, 'r') as z:
                for member in z.namelist():
                    if member.startswith(media_prefix) and not member.endswith('/'):
                        filename = os.path.basename(member)
                        out_path = os.path.join(EXTRACTED_IMG_DIR, f"{os.path.basename(file_path)}_{filename}")
                        with open(out_path, 'wb') as f_out:
                            f_out.write(z.read(member))
                        extracted.append(out_path)
        except Exception:
            pass
        return extracted
