#!/bin/bash
# Run script for Cordon AI Frontend

echo "🚀 Starting Cordon AI Frontend..."
echo "📁 Working directory: $(pwd)"
echo "🐍 Python version: $(python3 --version)"

# Check if we're in the right directory
if [ ! -f "start_integrated.py" ]; then
    echo "❌ Error: start_integrated.py not found. Please run this from the frontend directory."
    exit 1
fi

# Install requirements if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "🔧 Activating virtual environment..."
source venv/bin/activate

echo "📦 Installing requirements..."
pip install -r requirements.txt

echo "🌐 Starting the frontend server..."
python3 start_integrated.py
