from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class UserProfile(BaseModel):
    id: UUID
    email: str
    plan_name: str = "free"
    plan_display_name: str = "Free"
    mosaics_used_this_month: int = 0
    monthly_limit: Optional[int] = 5


class UserPlanOverride(BaseModel):
    user_id: str
    plan_name: str
    reason: Optional[str] = None
