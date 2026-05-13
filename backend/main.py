from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

# Import your new auth router
from api.auth import router as auth_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wire the router into the application
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])

@app.get("/")
def root():
    return {
        "message": "Welcome to the SaaS Project Management API",
        "status": "healthy"
    }