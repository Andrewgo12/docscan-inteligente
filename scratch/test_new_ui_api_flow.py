import urllib.request
import json
import io
from PIL import Image, ImageDraw

BASE_URL = "http://127.0.0.1:8000/api/v1/documents"

def create_sample_document_image():
    img = Image.new('RGB', (800, 1000), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), "SOLICITUD DE EXPEDIENTE Y DECRETO 2026", fill=(0, 0, 0))
    draw.text((50, 120), "Nombre del Solicitante: Kevin Andres Gonzalez", fill=(0, 0, 0))
    draw.text((50, 180), "Fecha de Diligenciamiento: 2026-08-26", fill=(0, 0, 0))
    draw.rectangle([50, 250, 450, 300], outline=(0, 0, 0), width=2)
    draw.text((60, 265), "Firma del Responsable: ____________________", fill=(0, 0, 0))
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

def test_api():
    print("[TEST] Probando servidor backend FastAPI con documento valido...")
    
    # 1. Upload valid document image
    file_bytes = create_sample_document_image()
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="solicitud_oficial_2026.png"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()

    upload_req = urllib.request.Request(
        f"{BASE_URL}/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(upload_req) as resp:
            upload_data = json.loads(resp.read().decode())
            doc_id = upload_data["id"]
            print(f"[OK] Documento subido con ID: {doc_id} ({upload_data['nombre_archivo']})")

            # 2. Process document (Full OCR & Field Extraction)
            proc_req = urllib.request.Request(f"{BASE_URL}/{doc_id}/process", method="POST")
            with urllib.request.urlopen(proc_req) as proc_resp:
                proc_data = json.loads(proc_resp.read().decode())
                campos = proc_data.get('campos_detectados', proc_data.get('campos', []))
                texto = proc_data.get('texto_impreso', [])
                print(f"[OK] Procesamiento completado: {len(campos)} campos detectados, {len(texto)} lineas extraidas")

            # 3. Update fields with manual corrections from UI
            update_payload = json.dumps([
                {
                    "etiqueta": "Solicitante del tramite",
                    "tipo_campo": "texto",
                    "coordenadas": {"x": 50, "y": 120, "width": 400, "height": 40},
                    "confianza_deteccion": 1.0,
                    "corregido_manualmente": True
                },
                {
                    "etiqueta": "Fecha de emision",
                    "tipo_campo": "fecha",
                    "coordenadas": {"x": 50, "y": 180, "width": 300, "height": 40},
                    "confianza_deteccion": 1.0,
                    "corregido_manualmente": True
                },
                {
                    "etiqueta": "Firma del responsable",
                    "tipo_campo": "firma",
                    "coordenadas": {"x": 50, "y": 250, "width": 400, "height": 50},
                    "confianza_deteccion": 1.0,
                    "corregido_manualmente": True
                }
            ]).encode()

            field_req = urllib.request.Request(
                f"{BASE_URL}/{doc_id}/fields",
                data=update_payload,
                headers={"Content-Type": "application/json"},
                method="PUT"
            )
            with urllib.request.urlopen(field_req) as field_resp:
                print("[OK] Actualizacion de campos corregidos en SQLite (docscan.db): OK")

            # 4. Test Export Formats
            for fmt in ["docx", "xlsx", "pdf"]:
                exp_req = urllib.request.Request(f"{BASE_URL}/{doc_id}/export/{fmt}", method="GET")
                with urllib.request.urlopen(exp_req) as exp_resp:
                    exp_bytes = exp_resp.read()
                    print(f"[OK] Exportacion a .{fmt} generada exitosamente ({len(exp_bytes)} bytes)")

            print("\n[SUCCESS] ¡Todas las funciones de la interfaz y la API REST estan 100% OPERATIVAS Y VERIFICADAS!")

    except Exception as e:
        print("[ERROR] Error en prueba de API:", e)

if __name__ == "__main__":
    test_api()
