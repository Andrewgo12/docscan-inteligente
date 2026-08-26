import os
import time

class StorageCleaner:
    """
    Módulo de Limpieza Automática y Cumplimiento de Políticas de Privacidad (Capítulo 12.4).
    Elimina archivos temporales de carga y exportación tras 24 horas para garantizar
    la minimización de datos y privacidad de los usuarios.
    """

    @staticmethod
    def cleanup_old_files(upload_dir: str = "backend/storage/uploads", export_dir: str = "backend/storage/exports", max_age_seconds: int = 86400):
        current_time = time.time()
        purged_files = 0

        for folder in [upload_dir, export_dir]:
            if os.path.exists(folder):
                for root, _, files in os.walk(folder):
                    for file_name in files:
                        file_path = os.path.join(root, file_name)
                        try:
                            if os.path.isfile(file_path):
                                file_age = current_time - os.path.getmtime(file_path)
                                if file_age > max_age_seconds:
                                    os.remove(file_path)
                                    purged_files += 1
                        except Exception:
                            pass
        return purged_files
