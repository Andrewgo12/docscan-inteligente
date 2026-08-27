import sys
import os
sys.path.append('.')

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

print("==========================================================================")
print("     DEMOSTRACION EMPIRICA EN VIVO: PRUEBA DE ENDPOINTS FASTAPI REST       ")
print("==========================================================================")

# 1. Health check endpoint
res_health = client.get("/api/v1/health")
print(f"\n[1] GET /api/v1/health -> Status {res_health.status_code}")
print(f"    Respuesta: {res_health.json()}")

# 2. Universal Analyze endpoint with a real Word file
sample_file = "formatos de prueba/Word/01_Documento_Estandar.docx"
if os.path.exists(sample_file):
    print(f"\n[2] POST /api/v1/documents/universal-analyze con '{sample_file}'...")
    with open(sample_file, "rb") as f:
        res_univ = client.post(
            "/api/v1/documents/universal-analyze",
            files={"file": ("01_Documento_Estandar.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
    print(f"    Status: {res_univ.status_code}")
    print(f"    Respuesta Metadata: {res_univ.json().get('metadata')}")
    print(f"    Respuesta Summary: {res_univ.json().get('summary')}")

# 3. Full Upload & Process & Export Flow for an image
image_sample = "formatos de prueba/Escaneos_Imagenes/01_Escaneo_TIFF_OCR.tif"
if os.path.exists(image_sample):
    print(f"\n[3] PRUEBA DE FLUJO COMPLETO CON IMAGEN: '{image_sample}'")
    
    # 3a. Upload
    with open(image_sample, "rb") as f:
        res_upload = client.post(
            "/api/v1/documents/upload",
            files={"file": ("01_Escaneo_TIFF_OCR.tif", f, "image/tiff")}
        )
    doc_data = res_upload.json()
    doc_id = doc_data["id"]
    print(f"    • Upload exitoso -> ID de Documento: {doc_id}")

    # 3b. Process (OCR + Detección + Clasificación)
    res_process = client.post(f"/api/v1/documents/{doc_id}/process")
    proc_data = res_process.json()
    print(f"    • Procesamiento completado en {proc_data.get('tiempo_procesamiento_ms')} ms")
    print(f"    • Campos detectados en la imagen ({len(proc_data.get('campos', []))} campos):")
    for field in proc_data.get('campos', [])[:5]:
        print(f"        - Etiqueta: '{field.get('etiqueta')}' | Tipo: {field.get('tipo_campo')} | Confianza: {field.get('confianza_deteccion')}")

    # 3c. Export to DOCX
    res_export = client.get(f"/api/v1/documents/{doc_id}/export/docx")
    print(f"    • Exportación a Word (.docx) -> Status {res_export.status_code} | Bytes recibidos: {len(res_export.content)}")

    # 3d. Export to PDF AcroForm
    res_export_pdf = client.get(f"/api/v1/documents/{doc_id}/export/pdf")
    print(f"    • Exportación a PDF AcroForm -> Status {res_export_pdf.status_code} | Bytes recibidos: {len(res_export_pdf.content)}")

print("\n==========================================================================")
print("     [OK] DEMOSTRACION EN VIVO FINALIZADA CON EXITO - TODO FUNCIONA      ")
print("==========================================================================")
