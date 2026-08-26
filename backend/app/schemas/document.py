from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CampoBase(BaseModel):
    etiqueta: Optional[str] = None
    tipo_campo: str = Field(..., description="texto, fecha, firma, casilla, radio, numero, tabla")
    coordenadas: Dict[str, Any] = Field(..., description="x, y, width, height en pixeles o porcentaje")
    confianza_deteccion: float = 1.0
    corregido_manualmente: bool = False
    descripcion_usuario: Optional[str] = None

class CampoCreate(CampoBase):
    pass

class CampoResponse(CampoBase):
    id: str
    documento_id: str

    class Config:
        from_attributes = True

class DocumentoBase(BaseModel):
    nombre_archivo: str
    tipo_documento: str = "formulario"
    formato_salida: str = "docx"

class DocumentoCreate(DocumentoBase):
    pass

class DocumentoResponse(DocumentoBase):
    id: str
    fecha_procesamiento: datetime
    tiempo_procesamiento_ms: Optional[int] = None
    campos: List[CampoResponse] = []

    class Config:
        from_attributes = True
