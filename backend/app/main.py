from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.v1.endpoints.documents import router as documents_router

app = FastAPI(
    title="DocScan Inteligente API",
    description="API REST para digitalización y edibilidad de documentos físicos mediante visión por computador y OCR.",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers de la API v1
app.include_router(documents_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Bienvenido a la API REST de DocScan Inteligente",
        "version": "1.0.0"
    }

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "service": "DocScan Inteligente Backend"
    }
