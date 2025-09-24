#!/usr/bin/env python3
"""
Refactored Cordon AI Frontend Startup Script
This script uses the modular backend structure for better maintainability
"""

import argparse
import uvicorn
from backend.app import app, initialize_services


def main():
    parser = argparse.ArgumentParser(description='Start Cordon AI Frontend')
    parser.add_argument(
        '--health-checks', 
        action='store_true', 
        help='Enable health check logging (default: disabled)'
    )
    parser.add_argument(
        '--port', 
        type=int, 
        default=8000, 
        help='Port to run the server on (default: 8000)'
    )
    parser.add_argument(
        '--host', 
        default='0.0.0.0', 
        help='Host to bind the server to (default: 0.0.0.0)'
    )
    
    args = parser.parse_args()
    
    # Initialize all services
    initialize_services()
    
    # Configure uvicorn logging
    log_level = "info" if args.health_checks else "warning"
    
    uvicorn.run(
        app, 
        host=args.host, 
        port=args.port, 
        reload=False,
        log_level=log_level,
        access_log=args.health_checks
    )


if __name__ == "__main__":
    main()