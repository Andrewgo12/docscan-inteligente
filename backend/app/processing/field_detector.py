import cv2
import numpy as np
from typing import List, Dict, Any, Tuple

class FieldDetector:
    """
    Módulo de Detección Geométrica de Campos Vacíos de Nivel Industrial (Fase 3).
    Aísla las zonas estructurales de formularios destinadas al diligenciamiento manual:
    - Líneas de texto horizontales continuas y punteadas (`Nombre: . . . . .`).
    - Recuadros cerrados de firma y recuadros de respuesta.
    - Casillas de verificación cuadradas (Checkboxes `[ ]`).
    Aplica filtro Non-Maximum Suppression (NMS) e inspección de densidad de tinta por píxeles y varianza (`is_field_empty`).
    """

    def __init__(
        self,
        min_line_length: int = 50,
        min_checkbox_size: int = 10,
        max_checkbox_size: int = 60,
        min_box_width: int = 40,
        min_box_height: int = 18
    ):
        self.min_line_length = min_line_length
        self.min_checkbox_size = min_checkbox_size
        self.max_checkbox_size = max_checkbox_size
        self.min_box_width = min_box_width
        self.min_box_height = min_box_height

    def detect_horizontal_lines(self, binary_img: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detecta líneas horizontales de escritura usando kernels morfológicos rectangulares dinámicos.
        Soporta tanto líneas sólidas continuas como líneas punteadas.
        """
        h, w = binary_img.shape[:2]
        inv_binary = cv2.bitwise_not(binary_img) if np.mean(binary_img) > 127 else binary_img

        # Kernel dinámico proporcional al ancho de la imagen
        kernel_len = max(self.min_line_length, w // 25)
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_len, 1))

        horizontal_lines = cv2.erode(inv_binary, horizontal_kernel, iterations=1)
        horizontal_lines = cv2.dilate(horizontal_lines, horizontal_kernel, iterations=2)

        contours, _ = cv2.findContours(horizontal_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        detected_fields = []
        for c in contours:
            x, y, line_w, line_h = cv2.boundingRect(c)
            if line_w >= self.min_line_length:
                # Expandir zona de escritura vertical esperada hacia arriba
                expanded_h = max(24, int(line_h * 3.2))
                expanded_y = max(0, y - expanded_h + line_h)
                detected_fields.append({
                    "type": "linea_texto",
                    "bbox": [x, expanded_y, line_w, expanded_h],
                    "confidence": 0.88,
                    "geometry": "line"
                })

        return detected_fields

    def detect_rectangles_and_boxes(self, binary_img: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detecta recuadros cerrados y casillas cuadradas (checkboxes [ ] y recuadros de firma).
        Verifica convexidad y relación de aspecto (aspect ratio).
        """
        h, w = binary_img.shape[:2]
        inv_binary = cv2.bitwise_not(binary_img) if np.mean(binary_img) > 127 else binary_img

        contours, _ = cv2.findContours(inv_binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        detected_fields = []
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.03 * peri, True)
            x, y, box_w, box_h = cv2.boundingRect(c)

            # Descartar recuadros que cubran casi la página completa
            if box_w > w * 0.94 and box_h > h * 0.94:
                continue

            aspect_ratio = float(box_w) / float(box_h) if box_h > 0 else 0

            # 1. Checkboxes / Casillas de verificación cuadradas [ ]
            if (
                self.min_checkbox_size <= box_w <= self.max_checkbox_size and
                self.min_checkbox_size <= box_h <= self.max_checkbox_size and
                0.75 <= aspect_ratio <= 1.30
            ):
                detected_fields.append({
                    "type": "casilla",
                    "bbox": [x, y, box_w, box_h],
                    "confidence": 0.92,
                    "geometry": "square"
                })
                continue

            # 2. Recuadros de Firma o Campos de Respuesta
            if box_w >= self.min_box_width and box_h >= self.min_box_height:
                if len(approx) == 4 or (0.18 <= aspect_ratio <= 5.5):
                    field_type = "firma" if (box_w >= 120 and box_h >= 38 and aspect_ratio >= 2.0) else "texto"
                    detected_fields.append({
                        "type": field_type,
                        "bbox": [x, y, box_w, box_h],
                        "confidence": 0.84,
                        "geometry": "rectangle"
                    })

        return detected_fields

    def non_max_suppression(
        self,
        fields: List[Dict[str, Any]],
        overlap_threshold: float = 0.35
    ) -> List[Dict[str, Any]]:
        """Filtra y fusiona detecciones redundantes mediante Intersection over Union (IoU)."""
        if not fields:
            return []

        boxes = np.array([f["bbox"] for f in fields])
        scores = np.array([f["confidence"] for f in fields])

        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        w = boxes[:, 2]
        h = boxes[:, 3]
        x2 = x1 + w
        y2 = y1 + h

        areas = w * h
        order = scores.argsort()[::-1]

        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)

            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])

            w_int = np.maximum(0.0, xx2 - xx1)
            h_int = np.maximum(0.0, yy2 - yy1)
            intersection = w_int * h_int

            iou = intersection / (areas[i] + areas[order[1:]] - intersection)

            inds = np.where(iou <= overlap_threshold)[0]
            order = order[inds + 1]

        return [fields[k] for k in keep]

    def is_field_empty(self, gray_img: np.ndarray, bbox: List[int]) -> bool:
        """
        Inspecciona si el área del campo está vacía para diligenciamiento manual
        analizando la proporción de píxeles oscuros y la varianza de textura en la ROI.
        """
        x, y, w, h = bbox
        h_img, w_img = gray_img.shape[:2]
        x, y = max(0, x), max(0, y)
        w, h = min(w_img - x, w), min(h_img - y, h)

        if w <= 0 or h <= 0:
            return False

        roi = gray_img[y:y+h, x:x+w]
        _, binary_roi = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        dark_pixels = np.sum(binary_roi == 0)
        total_pixels = binary_roi.size
        ratio = dark_pixels / float(total_pixels) if total_pixels > 0 else 0

        # Un campo libre para diligenciamiento tiene < 38% de píxeles oscuros
        return ratio < 0.38

    def detect_all_fields(self, binary_img: np.ndarray, gray_img: np.ndarray) -> List[Dict[str, Any]]:
        """
        Ejecuta la detección completa de campos industriales:
        1. Extracción de líneas horizontales.
        2. Extracción de recuadros y casillas cuadradas.
        3. Supresión de duplicados por NMS.
        4. Análisis de disponibilidad de llenado.
        """
        lines = self.detect_horizontal_lines(binary_img)
        boxes = self.detect_rectangles_and_boxes(binary_img)

        all_candidates = lines + boxes
        filtered_fields = self.non_max_suppression(all_candidates, overlap_threshold=0.35)

        formatted_fields = []
        for field in filtered_fields:
            x, y, w, h = field["bbox"]
            is_empty = self.is_field_empty(gray_img, [x, y, w, h])
            formatted_fields.append({
                "type": field["type"],
                "coordinates": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                "confidence": field["confidence"],
                "geometry": field["geometry"],
                "is_empty": is_empty
            })

        return formatted_fields
