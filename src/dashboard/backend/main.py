from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import sensor_data

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include your routers
app.include_router(sensor_data.router)
