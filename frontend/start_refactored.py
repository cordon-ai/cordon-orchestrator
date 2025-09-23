#!/usr/bin/env python3
"""
Refactored Cordon AI Frontend Startup Script
This script uses the modular backend structure for better maintainability
"""

import uvicorn
from backend.app import app, initialize_services


if __name__ == "__main__":
    print("Starting Cordon AI Frontend...")

    # Initialize all services
    initialize_services()

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)