from typing import List, Dict, Any
from backend.app.processing.ocr_engine import OCREngine

class TextExtractor:
    """Extractor especializado de texto impreso y orden de lectura."""

    def __init__(self, ocr_engine: OCREngine = None):
        self.ocr_engine = ocr_engine or OCREngine()

    def extract_text(self, image_or_path) -> Dict[str, Any]:
        res = self.ocr_engine.extract_all_text(image_or_path)
        return {
            "full_text": res.get("full_text", ""),
            "blocks": res.get("blocks", []),
            "blocks_count": len(res.get("blocks", []))
        }
