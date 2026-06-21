import uuid
from pathlib import Path
from .database import get_supabase

BUCKET = "mosaicforge"


def upload_file(local_path: str, storage_path: str, content_type: str = "application/octet-stream") -> str:
    sb = get_supabase()
    with open(local_path, "rb") as f:
        sb.storage.from_(BUCKET).upload(storage_path, f, {"content-type": content_type})
    return storage_path


def get_signed_url(storage_path: str, expires_in: int = 600) -> str:
    sb = get_supabase()
    result = sb.storage.from_(BUCKET).create_signed_url(storage_path, expires_in)
    return result["signedURL"]


def delete_file(storage_path: str) -> None:
    sb = get_supabase()
    sb.storage.from_(BUCKET).remove([storage_path])


def unique_path(prefix: str, filename: str) -> str:
    uid = uuid.uuid4().hex
    suffix = Path(filename).suffix
    return f"{prefix}/{uid}{suffix}"
