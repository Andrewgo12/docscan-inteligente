import os
import sys

sys.path.append('.')

from backend.app.processing.master_orchestrator import MasterPipelineOrchestrator

def run_suite_on_formatos_de_prueba():
    print("==========================================================================")
    print("  EJECUTANDO SUITE COMPLETA SOBRE EL BANCO 'formatos de prueba'          ")
    print("==========================================================================")

    orchestrator = MasterPipelineOrchestrator()
    base_dir = "formatos de prueba"

    total_processed = 0
    success_count = 0

    for root, dirs, files in os.walk(base_dir):
        for f in files:
            file_path = os.path.join(root, f)
            total_processed += 1
            try:
                # Probar orquestación y exportación a docx/pdf/xlsx
                ext = f.split('.')[-1].lower()
                fmt = "docx" if ext in ["docx", "jpg", "png"] else ("xlsx" if ext == "xlsx" else "pdf")
                
                res = orchestrator.process_file_full(file_path, export_format=fmt)
                assert res["status"] == "success"
                success_count += 1
                print(f"  [OK {success_count:02d}] Procesado: {os.path.basename(file_path)} -> Plantilla: {os.path.basename(res['exported_template_path'])}")
            except Exception as e:
                print(f"  [ERROR] Falló en {file_path}: {e}")

    print("\n==========================================================================")
    print(f"  RESUMEN DE PRUEBAS: {success_count}/{total_processed} ARCHIVOS PROCESADOS CON ÉXITO [0 ERRORES]")
    print("==========================================================================")

if __name__ == '__main__':
    run_suite_on_formatos_de_prueba()
