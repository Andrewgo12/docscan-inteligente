import re
import math
from typing import List, Dict, Any, Tuple, Optional

class SemanticClassifier:
    """
    Módulo de Asociación Semántica-Espacial y Clasificación de Campos (Fase 4).
    Asocia etiquetas de texto reconocidas por el OCR con los campos vacíos
    detectados geométricamente y clasifica la categoría de campo (texto, fecha, firma, casilla).
    """

    KEYWORD_MAP = {
        "fecha": ["fecha", "dia", "mes", "ano", "año", "dd/mm", "dd-mm", "nacimiento", "expedicion"],
        "firma": ["firma", "firmado", "rubrica", "sello", "firmante", "responsable", "solicitante"],
        "casilla": ["marque", "seleccione", "opcion", "opción", "x", "[ ]", "( )", "si", "no", "aceptar", "autorizo"],
        "texto": ["nombre", "apellidos", "cedula", "cédula", "documento", "id", "nit", "rut", "direccion", "dirección", "telefono", "teléfono", "correo", "email", "ciudad"]
    }

    def __init__(self):
        pass

    def clean_text(self, text: str) -> str:
        """Limpia y normaliza texto eliminando puntuación innecesaria."""
        if not text:
            return ""
        cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
        return ' '.join(cleaned.split())

    def match_keyword_score(self, text: str, category: str) -> float:
        """Calcula el puntaje de coincidencia de palabras clave para una categoría dada."""
        cleaned = self.clean_text(text)
        keywords = self.KEYWORD_MAP.get(category, [])
        score = 0.0
        for kw in keywords:
            if kw in cleaned:
                score += 1.0
        return score

    def find_nearest_label(
        self,
        field_bbox: Dict[str, float],
        ocr_blocks: List[Dict[str, Any]],
        max_distance: float = 300.0
    ) -> Tuple[Optional[str], float]:
        """
        Heurística espacial: Encuentra el bloque de texto OCR más cercano a la izquierda o arriba del campo.
        """
        fx, fy = field_bbox["x"], field_bbox["y"]
        best_label = None
        min_dist = float("inf")

        for block in ocr_blocks:
            tx = block.get("x", 0)
            ty = block.get("y", 0)
            text = block.get("text", "").strip()

            if not text:
                continue

            # Priorizar textos situados a la izquierda (tx <= fx) o arriba (ty <= fy)
            dx = fx - tx
            dy = fy - ty

            # Descartar textos que estén muy a la derecha o muy abajo del campo
            if dx < -20 or dy < -20:
                continue

            # Distancia euclidiana ponderada (damos preferencia a alineación horizontal a la izquierda)
            dist = math.sqrt((dx * 0.8) ** 2 + (dy * 1.2) ** 2)

            if dist < min_dist and dist <= max_distance:
                min_dist = dist
                best_label = text

        confidence = max(0.5, 1.0 - (min_dist / max_distance)) if best_label else 0.5
        return best_label, confidence

    def predict_field_category(
        self,
        geometry_type: str,
        coordinates: Dict[str, float],
        associated_label: Optional[str]
    ) -> Tuple[str, float]:
        """
        Clasifica la categoría del campo (texto, fecha, firma, casilla) utilizando
        características geométricas y el texto de la etiqueta asociada.
        """
        w, h = coordinates.get("width", 0), coordinates.get("height", 0)
        aspect_ratio = (w / float(h)) if h > 0 else 1.0
        label = associated_label or ""

        # 1. Puntajes por palabras clave en la etiqueta
        score_fecha = self.match_keyword_score(label, "fecha")
        score_firma = self.match_keyword_score(label, "firma")
        score_casilla = self.match_keyword_score(label, "casilla")
        score_texto = self.match_keyword_score(label, "texto")

        # 2. Reglas de clasificación con características geométricas y léxicas
        if geometry_type == "square" or (10 <= w <= 50 and 10 <= h <= 50 and 0.8 <= aspect_ratio <= 1.25):
            return "casilla", 0.95 if score_casilla > 0 else 0.88

        if score_fecha > 0 or "fecha" in label.lower() or "dd" in label.lower():
            return "fecha", 0.94

        if score_firma > 0 or "firma" in label.lower() or (w >= 140 and h >= 40 and aspect_ratio >= 2.5):
            return "firma", 0.92

        if score_texto > 0:
            return "texto", 0.90

        # Clasificación por defecto según forma geométrica
        if aspect_ratio >= 3.0:
            return "texto", 0.80

        return "texto", 0.75

    def classify_and_associate_all(
        self,
        fields: List[Dict[str, Any]],
        ocr_blocks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Ejecuta el flujo completo de la Fase 4 sobre todos los campos detectados.
        """
        processed_fields = []
        for field in fields:
            coords = field["coordinates"]
            geom = field.get("geometry", "rectangle")

            # Buscar etiqueta más cercana
            label, spatial_conf = self.find_nearest_label(coords, ocr_blocks)
            
            # Clasificar tipo de campo
            predicted_type, type_conf = self.predict_field_category(geom, coords, label)

            overall_confidence = round(spatial_conf * type_conf, 2)
            needs_human_review = overall_confidence < 0.70

            processed_fields.append({
                "id": field.get("id"),
                "etiqueta": label or "Campo Sin Etiqueta",
                "tipo_campo": predicted_type,
                "coordenadas": coords,
                "confianza_deteccion": overall_confidence,
                "corregido_manualmente": False,
                "requiere_revision_humana": needs_human_review
            })

        return processed_fields
