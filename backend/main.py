import uvicorn  # 1. Add this import at the top
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api.auth import router as auth_router
from api.auth import router as auth_router
from api.workspaces import router as workspaces_router # 1. Add this import

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"  # <-- Add this line
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(workspaces_router, prefix=f"{settings.API_V1_STR}/workspaces", tags=["Workspaces"])
@app.get("/")
def root():
    return {
        "message": "Welcome to the SaaS Project Management API",
        "status": "healthy"
    }

# 2. Add this block at the very bottom
if __name__ == "__main__":
    # "main:app" points to the app instance in this file. 
    # reload=True automatically restarts the server when you save code changes.
    uvicorn.run("main:app", host="127.0.0.1", port=8081, reload=True)