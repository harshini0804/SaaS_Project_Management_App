from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

celery_app = Celery(
    "saas_worker",
    broker=os.getenv("REDIS_URL", "redis://localhost:6380/0"),
    include=["worker.tasks"]
)

# celery_app.conf.task_routes = {"worker.tasks.*": "main-queue"}