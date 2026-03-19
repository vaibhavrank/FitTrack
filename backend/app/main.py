from fastapi import FastAPI
from sqlalchemy import text

from app.config.database import engine
from app.routes.auth_routes import router as auth_router
from app.routes.activity_routes import router as activity_router
from app.routes.territory_routes import router as territory_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(activity_router)
app.include_router(territory_router)

# add localhost :5173 to allowed origins for CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

 

@app.get("/")
def read_root():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 'Hello, World!'"))
        greeting = result.fetchone()[0]
    return {"message": greeting}
