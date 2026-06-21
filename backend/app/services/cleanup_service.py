"""
Scheduled cleanup: delete expired mosaic files from Supabase Storage.
Called every minute by a background task started in main.py.
"""
import asyncio
from datetime import datetime
from ..core.database import get_supabase


async def cleanup_expired_jobs():
    """Delete storage files for jobs whose expiry has passed."""
    while True:
        try:
            sb = get_supabase()
            now = datetime.utcnow().isoformat()
            expired = (
                sb.table("mosaic_jobs")
                .select("id, output_path")
                .eq("status", "completed")
                .lt("expires_at", now)
                .not_.is_("output_path", "null")
                .execute()
            )
            for job in expired.data or []:
                try:
                    sb.storage.from_("mosaicforge").remove([job["output_path"]])
                except Exception:
                    pass
                sb.table("mosaic_jobs").update({
                    "output_path": None,
                    "status": "expired",
                }).eq("id", job["id"]).execute()
        except Exception:
            pass
        await asyncio.sleep(60)
