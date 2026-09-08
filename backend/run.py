"""
Zero Trust AI Framework - Backend Runner
Configures WindowsSelectorEventLoopPolicy for async PostgreSQL/Neon sockets and launches Uvicorn
"""
import sys
import os
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set Windows Selector event loop policy for async PostgreSQL/Neon sockets
if sys.platform == "win32":
    import asyncio
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"[*] Starting Zero Trust AI Framework Backend on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=False)
