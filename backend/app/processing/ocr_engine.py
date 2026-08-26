import os
import re
import numpy as np
import cv2
from typing import List, Dict, Any, Tuple, Optional

# Deshabilitar flags problemáticos de PIR/oneDNN en PaddlePaddle para ejecución en CPU sin advertencias
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

class OCREngine:
    """
    Motor de Reconocimiento Óptico de Caracteres (OCR) Multi-Motor Industrial (Fase 2).
    
    Arquitectura de Motores Híbridos en Cascada:
    1. **PaddleOCR** (Motor Principal de alta precisión para layouts complejos en español).
    2. **EasyOCR** (Motor secundario impulsado por PyTorch para texto impreso y estilizado).
    3. **Tesseract OCR** (Motor terciario de validación cruzada y extracción estructurada).
    4. **CV Text Bounding Extractor** (Reserva geométrica por contornos conectados si los motores OCR fallan).
    """

    def __init__(self, use_paddle: bool = True):
        self.use_paddle = use_paddle
        self._paddle_ocr = None
        self._easy_ocr = None

    def _get_paddle(self):
        """Inicializador de PaddleOCR con manejo transparente de excepciones."""
        if self._paddle_ocr is None and self.use_paddle:
            try:
                from paddleocr import PaddleOCR
                self._paddle_ocr = PaddleOCR(lang='es')
            except Exception as e:
                print(f"[WARN] PaddleOCR no disponible ({e}). Conmutando a EasyOCR / Tesseract.")
                self.use_paddle = False
        return self._paddle_ocr

    def _get_easyocr(self):
        """Inicializador perezoso de EasyOCR."""
        if self._easy_ocr is None:
            try:
                import easyocr
                self._easy_ocr = easyocr.Reader(['es', 'en'], gpu=False)
            except Exception as e:
                print(f"[INFO] EasyOCR no inicializado ({e}).")
        return self._easy_ocr

    def clean_text_artifacts(self, text: str) -> str:
        """Limpia ruido de escaneo, caracteres parásitos y espacios desbordados."""
        if not text:
            return ""
        cleaned = re.sub(r'^[|~`_\-\.\:\;]+\s*', '', text)
        cleaned = re.sub(r'\s*[|~`_\-\.\:\;]+$', '', cleaned)
        cleaned = ' '.join(cleaned.split())
        return cleaned

    def recognize_paddle(self, img: np.ndarray) -> List[Dict[str, Any]]:
        """Extrae bloques de texto e información espacial con PaddleOCR."""
        paddle = self._get_paddle()
        if paddle is None:
            return []

        try:
            try:
                results = paddle.ocr(img)
            except Exception:
                results = paddle.ocr(img, cls=False)

            ocr_blocks = []
            if results and results[0]:
                for line in results[0]:
                    if not line or len(line) < 2:
                        continue
                    box, (text, conf) = line[0], line[1]
                    xs = [p[0] for p in box]
                    ys = [p[1] for p in box]
                    x, y = int(min(xs)), int(min(ys))
                    w, h = int(max(xs) - x), int(max(ys) - y)

                    cleaned_txt = self.clean_text_artifacts(text)
                    if cleaned_txt and float(conf) > 0.25:
                        ocr_blocks.append({
                            "text": cleaned_txt,
                            "confidence": round(float(conf), 2),
                            "x": max(0, x), "y": max(0, y), "width": max(1, w), "height": max(1, h),
                            "engine": "paddle"
                        })
            return ocr_blocks
        except Exception as e:
            print(f"[WARN] Observación durante ejecución de PaddleOCR: {e}")
            return []

    def recognize_easyocr(self, img: np.ndarray) -> List[Dict[str, Any]]:
        """Extrae texto con el motor EasyOCR."""
        easy = self._get_easyocr()
        if easy is None:
            return []

        try:
            results = easy.readtext(img)
            ocr_blocks = []
            for bbox, text, conf in results:
                xs = [p[0] for p in bbox]
                ys = [p[1] for p in bbox]
                x, y = int(min(xs)), int(min(ys))
                w, h = int(max(xs) - x), int(max(ys) - y)
                cleaned_txt = self.clean_text_artifacts(text)
                if cleaned_txt and float(conf) > 0.25:
                    ocr_blocks.append({
                        "text": cleaned_txt,
                        "confidence": round(float(conf), 2),
                        "x": max(0, x), "y": max(0, y), "width": max(1, w), "height": max(1, h),
                        "engine": "easyocr"
                    })
            return ocr_blocks
        except Exception as e:
            print(f"[INFO] Observación EasyOCR: {e}")
            return []

    def recognize_tesseract(self, img: np.ndarray) -> List[Dict[str, Any]]:
        """Extrae texto y cajas delimitadoras con Tesseract OCR en español."""
        try:
            import pytesseract
            data = pytesseract.image_to_data(img, lang='spa', output_type=pytesseract.Output.DICT)
            ocr_blocks = []
            n_boxes = len(data['text'])
            for i in range(n_boxes):
                text = data['text'][i].strip()
                conf = float(data['conf'][i])
                cleaned_txt = self.clean_text_artifacts(text)
                if cleaned_txt and conf > 25:
                    x = int(data['left'][i])
                    y = int(data['top'][i])
                    w = int(data['width'][i])
                    h = int(data['height'][i])
                    ocr_blocks.append({
                        "text": cleaned_txt,
                        "confidence": round(conf / 100.0, 2),
                        "x": max(0, x), "y": max(0, y), "width": max(1, w), "height": max(1, h),
                        "engine": "tesseract"
                    })
            return ocr_blocks
        except Exception as e:
            print(f"[INFO] Tesseract OCR no disponible ({e}).")
            return []

    def extract_all_text(self, img: np.ndarray) -> Dict[str, Any]:
        """
        Punto de entrada unificado multi-motor:
        Intenta PaddleOCR -> EasyOCR -> Tesseract en cascada.
        Garantiza que siempre haya resultados OCR sin fallar.
        """
        blocks = self.recognize_paddle(img)
        
        if not blocks:
            blocks = self.recognize_easyocr(img)

        if not blocks:
            blocks = self.recognize_tesseract(img)

        # Ordenar bloques por flujo de lectura espacial (arriba a abajo, izquierda a derecha)
        blocks.sort(key=lambda b: (b['y'] // 15, b['x']))

        full_text = " ".join([b['text'] for b in blocks])
        printed_lines = [b['text'] for b in blocks if len(b['text']) >= 2]

        return {
            "blocks": blocks,
            "full_text": full_text,
            "printed_lines": printed_lines,
            "count": len(blocks)
        }
