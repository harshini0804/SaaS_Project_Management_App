from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt
from core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt requires bytes, so we encode the strings
    password_bytes = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_password_bytes)

def get_password_hash(password: str) -> str:
    # Generate a salt and hash the password
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password_bytes, salt)
    
    # Decode back to a standard string so it can be saved in the PostgreSQL database
    return hashed_password.decode('utf-8')

def create_access_token(subject: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # We embed the user's ID as the 'sub' (subject) in the JWT payload
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt