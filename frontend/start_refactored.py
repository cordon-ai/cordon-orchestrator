#!/usr/bin/env python3
"""
Refactored Cordon AI Frontend Startup Script
This script uses the modular backend structure for better maintainability
"""

import uvicorn
from backend.app import app, initialize_services


if __name__ == "__main__":
    print("Starting Cordon AI Frontend (Refactored Version)...")
    print("This version uses modular backend architecture for better maintainability")

    # Initialize all services
    initialize_services()

    print("🌐 Frontend available at: http://localhost:8000")
    print("📁 Modular backend structure:")
    print("  ├── backend/")
    print("  │   ├── api/          # API route handlers")
    print("  │   ├── services/     # Business logic")
    print("  │   ├── models/       # Data models")
    print("  │   └── utils/        # Utility functions")
    print("  └── start_refactored.py")

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)