from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from .config import settings

bearer = HTTPBearer(auto_error=False)


def verify_token(credentials: HTTPAuthorizationCredentials = Security(bearer)) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_user_id(payload: dict) -> str:
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    return uid
