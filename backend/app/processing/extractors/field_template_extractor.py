from typing import List, Dict, Any
from backend.app.processing.field_detector import FieldDetector
from backend.app.processing.semantic_classifier import SemanticClassifier

class FieldTemplateExtractor:
    """Extractor especializado de estructuras de plantillas (campos de texto, fecha, firma, casilla, números)."""

    def __init__(self, detector: FieldDetector = None, classifier: SemanticClassifier = None):
        self.detector = detector or FieldDetector()
        self.classifier = classifier or SemanticClassifier()

    def extract_template_fields(self, binary_img, gray_img, ocr_blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        fields = self.detector.detect_all_fields(binary_img, gray_img)
        classified = self.classifier.classify_and_associate_all(fields, ocr_blocks)
        return classified
