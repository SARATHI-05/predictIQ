from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "Staff"

class UserCreate(UserBase):
    password: str
    code: Optional[str] = None  # 6-digit email verification code

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    firebase_uid: Optional[str] = None
    is_active: Optional[bool] = True
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    success: bool = True
    message: Optional[str] = "Operation successful"

class LoginRequest(BaseModel):
    token: Optional[str] = None  # Firebase ID token
    credential: Optional[str] = None  # Alias for token
    email: Optional[EmailStr] = None  # Email/password login
    password: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    credential: str

class SendSignupCodeRequest(BaseModel):
    email: EmailStr

class SendSignupCodeResponse(BaseModel):
    success: bool = True
    message: str
    code_preview: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str
    success: bool = True
    email_sent: Optional[bool] = True
    code_preview: Optional[str] = None

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordRequest(BaseModel):
    email: Optional[EmailStr] = None
    code: Optional[str] = None
    token: Optional[str] = None
    new_password: str

class SimpleMessageResponse(BaseModel):
    message: str
    success: bool = True
