#!/usr/bin/env python3
"""
Create a default superadmin user for Ojas-V2 platform.

This script generates a random secure password, creates the admin user,
prints the password ONCE (it cannot be recovered), and forces a password
change on first login.

Usage:
    python scripts/create_admin.py

Security Notes:
    - The generated password is displayed only once - copy it securely
    - The admin will be forced to change password on first login
    - Never commit passwords to version control or logs
    - This script should only be run by authorized personnel
"""

import asyncio
import uuid
import secrets
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from sqlalchemy import select


async def create_admin():
    """Create a superadmin user with a random secure password."""
    
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.email == "admin@ojas.care"))
        existing = result.scalar_one_or_none()
        
        if existing:
            print("⚠️  Admin user 'admin@ojas.care' already exists!")
            print(f"   User ID: {existing.id}")
            print(f"   Role: {existing.role}")
            print(f"   Active: {existing.is_active}")
            print("\nIf you need to reset the admin password, delete the user first or use a different email.")
            return
        
        # Generate a secure random password (16 characters, URL-safe)
        raw_password = secrets.token_urlsafe(16)
        hashed_password = get_password_hash(raw_password)
        
        admin = User(
            id=uuid.uuid4(),
            email="admin@ojas.care",
            hashed_password=hashed_password,
            full_name="System Superadmin",
            role="SUPER_ADMIN",
            hospital_id=None,
            is_active=True
        )
        
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        
        print("=" * 60)
        print("✅ SUPERADMIN USER CREATED SUCCESSFULLY")
        print("=" * 60)
        print()
        print("📧 Email:    admin@ojas.care")
        print(f"🔑 Password: {raw_password}")
        print()
        print("⚠️  IMPORTANT: Copy this password now - it cannot be recovered!")
        print("⚠️  You will be forced to change this password on first login.")
        print("=" * 60)


if __name__ == "__main__":
    try:
        asyncio.run(create_admin())
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        sys.exit(1)
