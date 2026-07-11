#!/usr/bin/env python3
"""
Standalone script to reset local development database.

WARNING: This script will DROP ALL TABLES in the configured database.
NEVER run this against a production DATABASE_URL.

Usage:
    cd backend
    python scripts/reset_local_db.py

The script will prompt for confirmation before proceeding.
"""
import asyncio
import sys
from sqlalchemy import text

# Add parent directory to path for imports
sys.path.insert(0, '.')

from app.core.database import engine, Base, AsyncSessionLocal
from app.core.config import settings


async def reset_database():
    """Drop all tables and recreate them with seed data."""
    
    # Safety check - never run against production
    if settings.ENVIRONMENT == "production":
        print("FATAL: Cannot run reset script against production database!")
        print(f"Current ENVIRONMENT: {settings.ENVIRONMENT}")
        sys.exit(1)
    
    print("=" * 60)
    print("DATABASE RESET SCRIPT")
    print("=" * 60)
    print(f"\nTarget database: {settings.DATABASE_URL[:50]}...")
    print("\nWARNING: This will DELETE ALL DATA including:")
    print("  - Users")
    print("  - Hospitals")
    print("  - Patients")
    print("  - Check-ins")
    print("  - Escalations")
    print("  - Audit logs")
    print("  - All other data")
    print()
    
    response = input("Are you sure you want to continue? Type 'yes' to confirm: ")
    if response.lower() != 'yes':
        print("Aborted.")
        sys.exit(0)
    
    print("\nDropping tables...")
    
    async with AsyncSessionLocal() as db:
        tables = [
            "refresh_tokens", "audit_logs", "timeline_events", 
            "escalations", "checkins", "patients", 
            "users", "hospital_invites", "hospitals", "whatsapp_message_logs"
        ]
        
        for table in tables:
            try:
                await db.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                print(f"  Dropped: {table}")
            except Exception as e:
                print(f"  Skipped (may not exist): {table} - {e}")
        
        await db.commit()
    
    print("\nRecreating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")
    
    print("\nSeeding initial data...")
    try:
        from seed_data import seed
        async with AsyncSessionLocal() as db:
            await seed(db)
        print("Seed data inserted successfully.")
    except Exception as e:
        print(f"Warning: Seed data error: {e}")
    
    print("\n" + "=" * 60)
    print("DATABASE RESET COMPLETE")
    print("=" * 60)
    print("\nDefault credentials:")
    print("  Email: admin@ojas.care")
    print("  Password: admin123")


if __name__ == "__main__":
    asyncio.run(reset_database())
