import requests
import os
import json

BASE_URL = "http://127.0.0.1:8000/api/v1/documents"

test_files = [
    r"c:\Users\kevin\Desktop\proyecto tesis 2\documento inicial\Anteproyecto_DocScan_Inteligente.docx",
    r"c:\Users\kevin\Desktop\proyecto tesis 2\formatos de prueba\Word\08_Contrato_Arrendamiento_Comercial.docx",
    r"c:\Users\kevin\Desktop\proyecto tesis 2\formatos de prueba\PDF\10_Tika_Test_Sample.pdf",
]

def test_real_files():
    print("--- PROBANDO ARCHIVOS REALES DEL EQUIPO CON EL BACKEND ---")
    for file_path in test_files:
        if not os.path.exists(file_path):
            print(f"[SKIP] No encontrado: {file_path}")
            continue
        
        file_name = os.path.basename(file_path)
        print(f"\nProcesando archivo real: {file_name}...")
        
        # 1. Universal Analyze
        with open(file_path, "rb") as f:
            resp_analyze = requests.post(f"{BASE_URL}/universal/analyze", files={"file": (file_name, f.read())})
            if resp_analyze.status_code == 200:
                data = resp_analyze.json()
                analysis = data.get("analysis", {})
                print(f"  [OK] Universal Analyze: Mime={data.get('mime_type')}, Total Paginas={analysis.get('total_pages', analysis.get('total_sheets', 1))}")
                snippet = data.get("raw_text_snippet", "")[:150].replace("\n", " ")
                print(f"       Texto real extraido: {snippet}...")
            else:
                print(f"  [ERR] Universal Analyze fallo: {resp_analyze.status_code}")
                
        # 2. Upload Document
        with open(file_path, "rb") as f:
            resp_up = requests.post(f"{BASE_URL}/upload", files={"file": (file_name, f.read())})
            if resp_up.status_code == 200:
                doc_id = resp_up.json()["id"]
                print(f"  [OK] Upload exitoso. ID: {doc_id}")
                
                # 3. Process Document
                resp_proc = requests.post(f"{BASE_URL}/{doc_id}/process")
                if resp_proc.status_code == 200:
                    proc_data = resp_proc.json()
                    campos = proc_data.get("campos_detectados", [])
                    lineas = proc_data.get("texto_impreso", [])
                    print(f"  [OK] OCR/Extraccion: {len(campos)} campos, {len(lineas)} lineas impresas extraidas.")
                    if len(lineas) > 0:
                        print(f"       Primera linea real: {lineas[0][:100]}")
                else:
                    print(f"  [ERR] Process fallo: {resp_proc.status_code} {resp_proc.text}")

if __name__ == '__main__':
    test_real_files()
