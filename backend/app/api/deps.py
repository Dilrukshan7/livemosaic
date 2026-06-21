from fastapi import Depends, Security
from ..core.auth import verify_token, get_user_id


def current_user_id(payload: dict = Security(verify_token)) -> str:
    return get_user_id(payload)
