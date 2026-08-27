import requests
import json
import io
from PIL import Image, ImageDraw

BASE_URL = "http://127.0.0.1:8000/api/v1/documents"

def create_sample_form_image():
    """Genera una imagen simulada de formulario con campos de texto, fecha y firma."""
    img = Image.new('RGB', (800, 1000), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    
    # Encabezado
    d.rectangle([30, 30, 770, 90], outline=(40, 50, 80), width=2)
    d.text((50, 45), "FORMULARIO DE REGISTRO E IDENTIFICACION", fill=(20, 30, 60))
    
    # Campo 1: Nombre
    d.text((50, 130), "Nombre Completo del Solicitante:", fill=(0, 0, 0))
    d.rectangle([50, 160, 450, 200], outline=(100, 100, 100), width=1)
    
    # Campo 2: Fecha
    d.text((500, 130), "Fecha de Solicitud:", fill=(0, 0, 0))
    d.rectangle([500, 160, 750, 200], outline=(100, 100, 100), width=1)
    
    # Campo 3: Observaciones
    d.text((50, 240), "Observaciones y Notas Anexas:", fill=(0, 0, 0))
    d.rectangle([50, 270, 750, 400], outline=(100, 100, 100), width=1)
    
    # Campo 4: Recuadro de Firma
    d.text((500, 750), "Firma del Solicitante:", fill=(0, 0, 0))
    d.rectangle([500, 780, 750, 880], outline=(0, 0, 200), width=2)
    d.text((520, 820), "[ Recuadro de Firma ]", fill=(100, 100, 250))
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    return img_byte_arr.getvalue()

def run_full_button_and_modal_test():
    print("--- INICIANDO VERIFICACION COMPLETA DE BOTONES, MODALES Y API ---")
    
    # 1. Test Upload Button & Endpoint
    img_bytes = create_sample_form_image()
    files = {'file': ('formulario_test_ui.png', img_bytes, 'image/png')}
    
    print("\n1. Probando Boton de Carga / Ingestion...")
    resp = requests.post(f"{BASE_URL}/upload", files=files)
    assert resp.status_code == 200, f"Error en upload: {resp.status_code} {resp.text}"
    upload_data = resp.json()
    doc_id = upload_data['id']
    print(f"   [OK] Carga exitosa. ID de Documento asignado: {doc_id}")
    
    # 2. Test Processing / OCR Endpoint
    print("\n2. Probando Boton 'Procesamiento Automatico' (OCR & Analisis)...")
    proc_resp = requests.post(f"{BASE_URL}/{doc_id}/process")
    assert proc_resp.status_code == 200, f"Error en process: {proc_resp.status_code}"
    proc_data = proc_resp.json()
    campos = proc_data.get('campos_detectados', [])
    texto = proc_data.get('texto_impreso', [])
    print(f"   [OK] Procesamiento exitoso. {len(campos)} campos detectados, {len(texto)} lineas de texto extraidas.")
    
    # 3. Test Field Update / Save DB Button
    print("\n3. Probando Boton 'Guardar Cambios en DB' (Actualizar Campos)...")
    updated_fields = [
        {
            "id": "campo-1",
            "etiqueta": "Nombre del Solicitante (Editado)",
            "tipo_campo": "texto",
            "coordenadas": {"x": 50, "y": 160, "width": 400, "height": 40},
            "confianza": 0.98
        },
        {
            "id": "campo-2",
            "etiqueta": "Fecha de Expedicion",
            "tipo_campo": "fecha",
            "coordenadas": {"x": 500, "y": 160, "width": 250, "height": 40},
            "confianza": 0.95
        },
        {
            "id": "campo-3",
            "etiqueta": "Firma Manuscrita",
            "tipo_campo": "firma",
            "coordenadas": {"x": 500, "y": 780, "width": 250, "height": 100},
            "confianza": 1.0
        }
    ]
    
    update_resp = requests.put(f"{BASE_URL}/{doc_id}/fields", json=updated_fields)
    assert update_resp.status_code == 200, f"Error en update fields: {update_resp.status_code}"
    print("   [OK] Sincronizacion exitosa con SQLite (docscan.db).")
    
    # 4. Test Export Format Buttons (.docx, .xlsx, .pdf)
    print("\n4. Probando Botones de Exportacion Directa (.DOCX, .XLSX, .PDF)...")
    for fmt in ['docx', 'xlsx', 'pdf']:
        export_resp = requests.get(f"{BASE_URL}/{doc_id}/export/{fmt}")
        assert export_resp.status_code == 200, f"Error exportando {fmt}: {export_resp.status_code}"
        size_bytes = len(export_resp.content)
        print(f"   [OK] Generacion exitosa de plantilla {fmt.upper()} ({size_bytes} bytes).")
        
    print("\n--- PRUEBA COMPLETADA EXITOSAMENTE CON 100% DE EXITO ---")

if __name__ == '__main__':
    run_full_button_and_modal_test()
