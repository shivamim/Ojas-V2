import asyncio
from app.core.database import engine, Base
import app.models

async def create_and_seed():
    """Create database tables and seed initial data."""
    # Create tables using async
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('✅ Tables created successfully')
    
    # Now run seed
    from seed_data import seed
    await seed()
    
if __name__ == "__main__":
    asyncio.run(create_and_seed())
