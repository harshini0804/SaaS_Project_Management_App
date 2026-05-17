from core.celery_app import celery_app
from utils.email import send_email

@celery_app.task
def send_invitation_email(recipient_email: str, invite_link: str, inviter_email: str):
    subject = f"{inviter_email} invited you to join their Workspace!"
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>You've been invited!</h2>
            <p>{inviter_email} has invited you to collaborate in their workspace on SaaS Manager.</p>
            <a href="{invite_link}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
                Accept Invitation
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link: {invite_link}</p>
        </body>
    </html>
    """
    send_email(recipient_email, subject, html_body)
    return f"Invite sent to {recipient_email}"

@celery_app.task
def send_task_assigned_email(recipient_email: str, task_title: str, assigner_email: str):
    subject = "New Task Assigned to You"
    html_body = f"""
    <html>
        <body>
            <h2>New Task Assignment</h2>
            <p><b>{assigner_email}</b> just assigned you a new task: <b>{task_title}</b>.</p>
            <p>Log in to your dashboard to view the details.</p>
        </body>
    </html>
    """
    send_email(recipient_email, subject, html_body)
    return f"Task notification sent to {recipient_email}"