import sys
import os

sys.path.append('.')

from backend.app.processing.master_orchestrator import MasterPipelineOrchestrator

def run_master_orchestrator_tests():
    print("==========================================================================")
    print("  PRUEBA DEL ORQUESTADOR MAESTRO Y EXTRACTORES/CREADORES DE PLANTILLAS   ")
    print("==========================================================================")

    orchestrator = MasterPipelineOrchestrator()

    real_word_path = r"c:\Users\kevin\Desktop\proyecto tesis 2\documento inicial\Anteproyecto_DocScan_Inteligente.docx"

    # 1. Probar orquestador en generación Word (.docx)
    res_docx = orchestrator.process_file_full(real_word_path, export_format="docx")
    assert os.path.exists(res_docx["exported_template_path"])
    print(f"  [OK] Orquestación Completa Word (.docx): Plantilla generada en {res_docx['exported_template_path']}")

    # 2. Probar orquestador en generación Excel (.xlsx)
    res_xlsx = orchestrator.process_file_full(real_word_path, export_format="xlsx")
    assert os.path.exists(res_xlsx["exported_template_path"])
    print(f"  [OK] Orquestación Completa Excel (.xlsx): Plantilla generada en {res_xlsx['exported_template_path']}")

    # 3. Probar orquestador en generación PDF AcroForm
    res_pdf = orchestrator.process_file_full(real_word_path, export_format="pdf")
    assert os.path.exists(res_pdf["exported_template_path"])
    print(f"  [OK] Orquestación Completa PDF AcroForm: Plantilla generada en {res_pdf['exported_template_path']}")

    print("\n==========================================================================")
    print("  ORQUESTACIÓN Y MODULARIZACIÓN COMPLETA FINALIZADA CON ÉXITO [0 ERRORES] ")
    print("==========================================================================")

if __name__ == '__main__':
    run_master_orchestrator_tests()
