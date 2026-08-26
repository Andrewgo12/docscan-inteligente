import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Documento(Base):
    __tablename__ = "documentos"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    nombre_archivo = Column(String(255), nullable=False)
    tipo_documento = Column(String(50), default="formulario") # formulario, acta, tabla, etc.
    formato_salida = Column(String(10), default="docx") # docx, xlsx, pdf
    fecha_procesamiento = Column(DateTime, default=datetime.utcnow, index=True)
    tiempo_procesamiento_ms = Column(Integer, nullable=True)
    ruta_original = Column(String(500), nullable=True)
    ruta_exportado = Column(String(500), nullable=True)

    # Relación con campos detectados
    campos = relationship("Campo", back_populates="documento", cascade="all, delete-orphan")

class Campo(Base):
    __tablename__ = "campos"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    documento_id = Column(String(36), ForeignKey("documentos.id"), nullable=False, index=True)
    etiqueta = Column(String(255), nullable=True) # Ej: "Nombre:", "Firma:", "Fecha:"
    tipo_campo = Column(String(50), nullable=False) # texto, fecha, firma, casilla
    coordenadas = Column(JSON, nullable=False) # {"x": 10, "y": 20, "width": 100, "height": 30}
    confianza_deteccion = Column(Float, default=1.0)
    corregido_manualmente = Column(Boolean, default=False)
    descripcion_usuario = Column(String(500), nullable=True)

    documento = relationship("Documento", back_populates="campos")

class MetricaUso(Base):
    __tablename__ = "metricas_uso"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    documentos_procesados = Column(Integer, default=0)
    hojas_estimadas_ahorradas = Column(Integer, default=0)
