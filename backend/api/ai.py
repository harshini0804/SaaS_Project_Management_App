from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import boto3
import json
from models.core_models import User
from api.deps import get_current_user
from core.config import settings

router = APIRouter()

# Initialize the Lambda client instead of Bedrock
lambda_client = boto3.client(
    'lambda',
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

class AITaskRequest(BaseModel):
    vague_task: str

@router.post("/enhance-task")
def enhance_task(
    request: AITaskRequest, 
    current_user: User = Depends(get_current_user)
):
    try:
        # Trigger your Serverless Microservice safely
        response = lambda_client.invoke(
            FunctionName='saas-ai-task-enhancer2',
            InvocationType='RequestResponse', 
            Payload=json.dumps({"vague_task": request.vague_task}).encode('utf-8')
        )
        
        # Read the payload from Lambda
        response_payload = json.loads(response['Payload'].read().decode('utf-8'))
        
        # Look at the terminal to see exactly what arrived from AWS
        print("🚨 RAW LAMBDA PAYLOAD:", response_payload)
        
        # FORWARD THE RESULT DIRECTLY TO REACT (Even if it's an error string!)
        return {"suggestions": response_payload.get("suggestions", ["Could not read suggestions from AWS"])}
        
    except Exception as e:
        print(f"Boto3 Invocation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to AWS.")