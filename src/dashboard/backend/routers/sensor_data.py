from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json
from typing import List, Literal
import os

router = APIRouter()

class SituationUpdate(BaseModel):
    index: int
    estimate: Literal['normal', 'anomalous']

def get_memory_file_path():
    # Get the project root directory (4 levels up from this file)
    # src/dashboard/backend/routers -> src/
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))
    
    # Create data directory if it doesn't exist
    data_dir = os.path.join(project_root, 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    memory_path = os.path.join(data_dir, 'memory.json')
    
    # Create empty memory.json if it doesn't exist
    if not os.path.exists(memory_path):
        with open(memory_path, 'w') as f:
            json.dump([], f)
    
    return memory_path

@router.get("/api/sensor-data")
async def get_sensor_data():
    try:
        with open(get_memory_file_path(), 'r') as f:
            data = json.load(f)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/sensor-data/{index}")
async def update_situation(index: int, update: SituationUpdate):
    try:
        # Read current data
        with open(get_memory_file_path(), 'r') as f:
            data = json.load(f)
        
        # Validate index
        if index >= len(data):
            raise HTTPException(status_code=404, detail="Situation not found")
        
        # Update the estimate
        data[index]['estimate'] = update.estimate
        
        # Write back to file
        with open(get_memory_file_path(), 'w') as f:
            json.dump(data, f, indent=2)
        
        return {"message": "Successfully updated", "data": data[index]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

