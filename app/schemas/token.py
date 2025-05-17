from pydantic import BaseModel
from typing import Optional

class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    type: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserInfo] = None

class TokenData(BaseModel):
    user_id: Optional[str] = None