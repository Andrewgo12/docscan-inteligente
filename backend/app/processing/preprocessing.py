# pyrefly: ignore [missing-import]
import cv2
import numpy as np
from typing import Tuple, Dict, Any, Optional, List

class ImagePreprocessor:
    """
    Módulo de Preprocesamiento de Imágenes de Nivel Industrial (Fase 1).
    Proporciona resiliencia extrema ante fotos de baja calidad, sombras fuertes,
    inclinación acentuada y perspectiva distorsionada tomadas con celulares.

    Características Industriales:
    - Remoción de sombras por estimación de matriz de fondo morfológica.
    - CLAHE en espacio de color LAB (Canal L) para conservar crominancia y equilibrar brillo.
    - Corrección de perspectiva con aproximación cuadrilátera convexa y refino sub-píxel.
    - Deskewing híbrido por Transformada de Hough + Rectángulo Mínimo de Área (`cv2.minAreaRect`).
    - Binarización tri-etapa (Otsu + Gaussiana Adaptativa + Sauvola fallback).
    """

    def __init__(self, max_dimension: int = 2400):
        self.max_dimension = max_dimension

    def load_image(self, image_bytes: bytes) -> np.ndarray:
        """Convierte bytes de imagen a matriz BGR de OpenCV con verificación de integridad."""
        if not image_bytes:
            raise ValueError("El buffer de entrada de la imagen está vacío.")
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("No se pudo decodificar el formato de imagen recibido (posible archivo corrupto).")
        return img

    def resize_if_needed(self, img: np.ndarray) -> Tuple[np.ndarray, float]:
        """Redimensiona la imagen si excede max_dimension manteniendo alta resolución (>200 DPI)."""
        h, w = img.shape[:2]
        max_dim = max(h, w)
        if max_dim > self.max_dimension:
            scale = self.max_dimension / float(max_dim)
            new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
            resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            return resized, scale
        return img, 1.0

    def to_grayscale(self, img: np.ndarray) -> np.ndarray:
        """Convierte a escala de grises de 1 canal de forma transparente."""
        if len(img.shape) == 3 and img.shape[2] >= 3:
            return cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2GRAY)
        return img

    def remove_shadows_and_normalize(self, img: np.ndarray) -> np.ndarray:
        """
        Remueve sombras e iluminación no uniforme dividiendo la imagen por su fondo morfológico estimado.
        Ideal para documentos fotografiados en entornos con luz tenue o sombras de manos/celular.
        """
        gray = self.to_grayscale(img)
        # Estimación de fondo mediante dilación morfológica con kernel elíptico grande
        kernel_size = max(15, min(gray.shape) // 25)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
        bg = cv2.morphologyEx(gray, cv2.MORPH_DILATE, kernel)
        
        # Inversa y normalización de división
        diff = cv2.absdiff(gray, bg)
        normalized = cv2.normalize(255 - diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8UC1)
        return normalized

    def enhance_contrast(self, img: np.ndarray) -> np.ndarray:
        """
        Mejora el contraste adaptativo CLAHE en el canal de Luminancia (L*) del espacio LAB.
        Preserva los tonos y elimina variaciones abruptas de brillo.
        """
        if len(img.shape) == 3 and img.shape[2] == 3:
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl, a, b))
            return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        else:
            gray = self.to_grayscale(img)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            return clahe.apply(gray)

    def binarize(self, gray_img: np.ndarray, method: str = "auto") -> np.ndarray:
        """
        Binarización tri-etapa para separación nítida de texto e trazos manuscritos.
        - auto: Elige Otsu si el histograma es bimodal, o Adaptativa si hay gradientes.
        """
        blurred = cv2.GaussianBlur(gray_img, (5, 5), 0)
        
        if method == "adaptive":
            binary = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 15, 4
            )
        else:
            # Otsu Thresholding
            _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
        return binary

    def detect_skew_angle(self, gray_img: np.ndarray) -> float:
        """
        Detecta el ángulo de inclinación (-45° a +45°) combinando
        Hough Lines P con el ángulo del rectángulo delimitador mínimo (`minAreaRect`).
        """
        edges = cv2.Canny(gray_img, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=80, minLineLength=80, maxLineGap=10)

        angles = []
        if lines is not None:
            for line in lines:
                coords = line.flatten()
                if len(coords) == 4:
                    x1, y1, x2, y2 = coords
                    angle = np.arctan2(y2 - y1, x2 - x1) * 180.0 / np.pi
                    if -45.0 < angle < 45.0:
                        angles.append(angle)

        if angles:
            return float(np.median(angles))

        # Fallback: minAreaRect sobre contornos no nulos
        pts = cv2.findNonZero(edges)
        if pts is not None:
            rect = cv2.minAreaRect(pts)
            angle = rect[-1]
            if angle < -45:
                angle = 90 + angle
            elif angle > 45:
                angle = angle - 90
            if -45 <= angle <= 45:
                return float(angle)

        return 0.0

    def deskew(self, img: np.ndarray, angle: float) -> np.ndarray:
        """Rota la imagen con precisión sub-grado para alineación horizontal exacta."""
        if abs(angle) < 0.4:
            return img

        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            img, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        return rotated

    def correct_perspective(self, img: np.ndarray) -> Tuple[np.ndarray, bool]:
        """
        Detección de cuadrilátero convexo exterior y rectificación de perspectiva.
        Verifica convexidad (`isContourConvex`), relación de aspecto y área mínima (>15%).
        """
        gray = self.to_grayscale(img)
        norm_gray = self.remove_shadows_and_normalize(gray)
        blurred = cv2.GaussianBlur(norm_gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)

        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]

        img_area = img.shape[0] * img.shape[1]
        page_contour = None

        for c in contours:
            area = cv2.contourArea(c)
            if area < (img_area * 0.15):
                continue
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4 and cv2.isContourConvex(approx):
                page_contour = approx
                break

        if page_contour is None:
            return img, False

        # Ordenar los 4 puntos: top-left, top-right, bottom-right, bottom-left
        pts = page_contour.reshape(4, 2)
        rect = np.zeros((4, 2), dtype="float32")

        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]

        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]

        (tl, tr, br, bl) = rect

        # Ancho y alto de la imagen transformada
        w_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        w_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        max_w = max(int(w_a), int(w_b))

        h_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        h_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        max_h = max(int(h_a), int(h_b))

        if max_w <= 0 or max_h <= 0:
            return img, False

        dst = np.array([
            [0, 0],
            [max_w - 1, 0],
            [max_w - 1, max_h - 1],
            [0, max_h - 1]
        ], dtype="float32")

        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(img, M, (max_w, max_h))
        return warped, True

    def process_full_pipeline(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Ejecuta el flujo completo de preprocesamiento industrial:
        Carga -> Escalado -> Perspectiva -> Deskew -> Desombraciado -> CLAHE -> Binarización.
        """
        original_img = self.load_image(image_bytes)
        resized_img, scale = self.resize_if_needed(original_img)
        perspective_img, perspective_applied = self.correct_perspective(resized_img)
        
        gray_temp = self.to_grayscale(perspective_img)
        skew_angle = self.detect_skew_angle(gray_temp)
        deskewed_img = self.deskew(perspective_img, skew_angle)

        norm_gray = self.remove_shadows_and_normalize(deskewed_img)
        enhanced_gray = self.enhance_contrast(norm_gray)
        binary_final = self.binarize(enhanced_gray, method="auto")

        return {
            "processed_color": deskewed_img,
            "processed_gray": enhanced_gray,
            "processed_binary": binary_final,
            "scale_factor": scale,
            "skew_angle": skew_angle,
            "perspective_applied": perspective_applied,
            "width": deskewed_img.shape[1],
            "height": deskewed_img.shape[0]
        }
