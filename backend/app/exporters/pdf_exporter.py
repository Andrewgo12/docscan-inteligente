import os
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

class PdfExporter:
    """
    Exportador de PDF Interactivo de Nivel Industrial (Fase 5.3).
    Genera documentos PDF/A con formularios acroform navegables e interactivos:
    - Campos de texto editables (TextField)
    - Casillas de verificación interactivas (CheckBox)
    - Inserción de imágenes incrustadas (firmas, logos, diagramas)
    """

    def __init__(self):
        pass

    def export_to_file(
        self,
        doc_title: str,
        fields: List[Dict[str, Any]],
        output_path: str,
        images_to_embed: Optional[List[str]] = None
    ) -> str:
        """
        Genera un archivo PDF interactivo con AcroForms navegables en output_path e inserta imágenes.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        c = canvas.Canvas(output_path, pagesize=letter)
        page_w, page_h = letter # 612 x 792 pt

        # Título
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(colors.HexColor("#1e1b4b"))
        c.drawString(54, page_h - 54, f"DocScan Inteligente - {doc_title}")

        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(54, page_h - 72, "Formulario Digitalizado Interactivo (AcroForm navegable)")
        c.setStrokeColor(colors.HexColor("#cbd5e1"))
        c.setLineWidth(1)
        c.line(54, page_h - 80, page_w - 54, page_h - 80)

        current_y = page_h - 120
        form_builder = c.acroForm

        for idx, field in enumerate(fields):
            label = field.get("etiqueta", f"Campo {idx+1}")
            tipo = field.get("tipo_campo", "texto")

            if current_y < 120:
                c.showPage()
                current_y = page_h - 80

            # Etiqueta
            c.setFont("Helvetica-Bold", 10)
            c.setFillColor(colors.HexColor("#0f172a"))
            c.drawString(54, current_y, f"{label}:")

            # Campo interactivo AcroForm
            if tipo == "casilla":
                form_builder.checkbox(
                    name=f"cb_{idx}",
                    tooltip=label,
                    x=200,
                    y=current_y - 4,
                    buttonStyle='check',
                    size=16,
                    borderWidth=1,
                    borderColor=colors.HexColor("#8b5cf6"),
                    fillColor=colors.white
                )
            else: # texto, fecha, firma
                form_builder.textfield(
                    name=f"field_{idx}",
                    tooltip=label,
                    x=200,
                    y=current_y - 6,
                    width=320,
                    height=20,
                    fontSize=10,
                    borderWidth=1,
                    borderColor=colors.HexColor("#cbd5e1"),
                    fillColor=colors.HexColor("#f8fafc")
                )

            current_y -= 36

        # Inserción de Imágenes Anexas (Logos / Firmas)
        if images_to_embed:
            if current_y < 160:
                c.showPage()
                current_y = page_h - 80

            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(colors.HexColor("#1e1b4b"))
            c.drawString(54, current_y - 10, "Imágenes y Anexos Extraídos:")
            current_y -= 30

            for img_path in images_to_embed:
                if os.path.exists(img_path):
                    try:
                        c.drawImage(img_path, 54, current_y - 100, width=180, height=100, preserveAspectRatio=True)
                        current_y -= 115
                    except Exception as e:
                        pass

        c.save()
        return output_path
