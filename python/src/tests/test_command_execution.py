#!/usr/bin/env python3
"""
Test script for command execution functionality in the orchestrator.
"""

import sys
import os
import asyncio

# Add the Python src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python', 'src'))

from cordon.orchestrator import AgentTeam
from cordon.types import AgentTeamConfig

async def test_command_execution():
    """Test the command execution functionality."""
    print("🧪 Testing Command Execution Functionality")
    print("=" * 50)
    
    # Create orchestrator instance
    orchestrator = AgentTeam(options=AgentTeamConfig())
    
    # Test 1: Check if command execution is enabled
    print(f"✅ Command execution enabled: {orchestrator.command_execution_enabled}")
    
    # Test 2: Test command detection
    test_messages = [
        "run: ls -la",
        "execute: git status", 
        "run command pwd",
        "ls -la",
        "git status",
        "Hello, how are you?",  # Should not be detected as command
        "Can you help me with Python?"  # Should not be detected as command
    ]
    
    print("\n🔍 Testing Command Detection:")
    for msg in test_messages:
        is_command = orchestrator.is_command_request(msg)
        print(f"  '{msg}' -> {'✅ Command' if is_command else '❌ Not Command'}")
    
    # Test 3: Test command extraction
    print("\n🔧 Testing Command Extraction:")
    for msg in test_messages:
        if orchestrator.is_command_request(msg):
            command = orchestrator._extract_command(msg)
            print(f"  '{msg}' -> '{command}'")
    
    # Test 4: Test actual command execution (safe commands only)
    print("\n⚡ Testing Command Execution:")
    safe_commands = [
        "echo 'Hello from orchestrator!'",
        "pwd",
        "whoami",
        "date"
    ]
    
    for cmd in safe_commands:
        print(f"\n  Executing: {cmd}")
        result = await orchestrator.execute_command(cmd)
        
        if result["success"]:
            print(f"    ✅ Success (exit code: {result['return_code']})")
            print(f"    📤 Output: {result['stdout'].strip()}")
            if result['stderr']:
                print(f"    ⚠️  Stderr: {result['stderr'].strip()}")
        else:
            print(f"    ❌ Failed: {result.get('error', 'Unknown error')}")
            if result['stderr']:
                print(f"    📤 Stderr: {result['stderr'].strip()}")
    
    # Test 5: Test command execution with timeout
    print("\n⏱️  Testing Command Timeout:")
    result = await orchestrator.execute_command("sleep 2", timeout=1)
    if not result["success"] and "timeout" in result.get("error", "").lower():
        print("    ✅ Timeout handling works correctly")
    else:
        print("    ❌ Timeout handling failed")
    
    # Test 6: Test disabling command execution
    print("\n🔒 Testing Command Execution Disable:")
    orchestrator.enable_command_execution(False)
    result = await orchestrator.execute_command("echo 'test'")
    if not result["success"] and "disabled" in result.get("error", "").lower():
        print("    ✅ Command execution can be disabled")
    else:
        print("    ❌ Command execution disable failed")
    
    # Re-enable for other tests
    orchestrator.enable_command_execution(True)
    
    print("\n🎉 Command execution testing completed!")

if __name__ == "__main__":
    asyncio.run(test_command_execution())
