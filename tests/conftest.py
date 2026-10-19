import sys
import asyncio
import pytest

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop on Windows compatible with psycopg async"""
    if sys.platform == "win32":
        policy = asyncio.WindowsSelectorEventLoopPolicy()
        asyncio.set_event_loop_policy(policy)
        loop = policy.new_event_loop()
    else:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()
