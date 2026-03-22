from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    pass # Add fields if needed on creation

class SessionResponse(BaseModel):
    id: int
    session_id: str
    created_at: datetime
    status: str
    title: Optional[str]
    rounds: int
    inputs_path: str
    outputs_path: str

    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    text: str
    is_user: bool

class ChatMessageResponse(ChatMessageBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class SimulationEventResponse(BaseModel):
    id: int
    type: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True
