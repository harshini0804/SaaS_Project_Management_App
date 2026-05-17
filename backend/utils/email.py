import boto3
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

SENDER = os.getenv("AWS_SES_SENDER_EMAIL")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

ses_client = boto3.client(
    'ses',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=AWS_REGION
)

def send_email(to_address: str, subject: str, html_body: str):
    try:
        response = ses_client.send_email(
            Destination={'ToAddresses': [to_address]},
            Message={
                'Body': {'Html': {'Charset': "UTF-8", 'Data': html_body}},
                'Subject': {'Charset': "UTF-8", 'Data': subject},
            },
            Source=SENDER,
        )
        return response['MessageId']
    except ClientError as e:
        print(f"Failed to send email to {to_address}: {e.response['Error']['Message']}")
        return None