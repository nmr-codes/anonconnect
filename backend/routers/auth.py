import uuid
from fastapi import APIRouter, HTTPException, status
from models.user import GoogleAuthRequest, EmailAuthRequest, AuthResponse, UserProfile
from services.auth_service import (
    verify_google_token, 
    create_access_token, 
    get_password_hash, 
    verify_password
)
from services.db_service import db_service

router = APIRouter()

@router.post("/google", response_model=AuthResponse)
async def google_auth(body: GoogleAuthRequest):
    """
    Verify a Google ID token.
    If mode=login: fails if user not in DB.
    If mode=signup: creates user, or auto-logs in if they already exist.
    """
    try:
        google_info = await verify_google_token(body.credential)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    uid = google_info["sub"]
    existing = await db_service.get_user(uid)

    if existing:
        user = UserProfile(**existing)
    else:
        user = UserProfile(
            uid=uid,
            email=google_info.get("email", ""),
            display_name=google_info.get("name", ""),
            photo_url=google_info.get("picture", ""),
        )
        await db_service.save_user(uid, user.model_dump())

    token = create_access_token(user.uid)
    return AuthResponse(access_token=token, user=user)


@router.post("/register", response_model=AuthResponse)
async def email_register(body: EmailAuthRequest):
    """Register a new user with email and password."""
    uid = await db_service.get_uid_by_email(body.email)
    if uid:
        existing = await db_service.get_user(uid)
        if existing:
            user = UserProfile(**existing)
            if user.hashed_password:
                if verify_password(body.password, user.hashed_password):
                    # Auto-login
                    token = create_access_token(user.uid)
                    return AuthResponse(access_token=token, user=user)
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already registered. Incorrect password for auto-login."
                    )
            else:
                # User exists but was registered via Google (no password). 
                # Since they are trying to sign up, link this password to their account and auto-login!
                user.hashed_password = get_password_hash(body.password)
                await db_service.save_user(uid, user.model_dump())
                token = create_access_token(user.uid)
                return AuthResponse(access_token=token, user=user)
    
    new_uid = str(uuid.uuid4())
    user = UserProfile(
        uid=new_uid,
        email=body.email,
        display_name=body.email.split("@")[0],
        hashed_password=get_password_hash(body.password)
    )
    await db_service.save_user(new_uid, user.model_dump())
    
    token = create_access_token(user.uid)
    return AuthResponse(access_token=token, user=user)


@router.post("/login", response_model=AuthResponse)
async def email_login(body: EmailAuthRequest):
    """Login with email and password."""
    uid = await db_service.get_uid_by_email(body.email)
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please sign up."
        )
    
    existing = await db_service.get_user(uid)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
        
    user = UserProfile(**existing)
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account was created with Google. Please continue with Google."
        )
        
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password."
        )
        
    token = create_access_token(user.uid)
    return AuthResponse(access_token=token, user=user)
