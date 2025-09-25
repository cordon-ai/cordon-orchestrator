"""
Advanced orchestrator for managing agents, tasks, and parallel execution.
"""
import subprocess
import asyncio
import shlex
import json
import uuid
from typing import List, Optional, Any, Dict, Set, Union
from dataclasses import dataclass, field
from enum import Enum
from .agents import Agent
from .types import ConversationMessage, AgentTeamConfig


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING = "waiting"


@dataclass
class Task:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: str = ""
    assigned_agent: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    created_at: float = field(default_factory=lambda: asyncio.get_event_loop().time())
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    priority: int = 0  # Higher number = higher priority


@dataclass
class TaskResult:
    task_id: str
    success: bool
    output: Any
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class AgentTeam:
    """Advanced orchestrator that manages agents, tasks, and parallel execution."""
    
    def __init__(self, options: Optional[AgentTeamConfig] = None):
        self.agents: List[Agent] = []
        self.supervisor: Optional[Agent] = None
        self.options = options or AgentTeamConfig()
        self.command_execution_enabled = True  # Enable command execution by default
        
        # Task management
        self.tasks: Dict[str, Task] = {}
        self.completed_tasks: Dict[str, TaskResult] = {}
        
        # Agent availability tracking
        self.agent_availability: Dict[str, bool] = {}
        self.agent_task_assignments: Dict[str, Set[str]] = {}
    
    def add_agent(self, agent: Agent) -> None:
        """Add an agent to the orchestrator."""
        self.agents.append(agent)
        self.agent_availability[agent.name] = True
        self.agent_task_assignments[agent.name] = set()
    
    def add_supervisor(self, supervisor: Agent) -> None:
        """Add a supervisor agent for classification."""
        self.supervisor = supervisor
        self.agent_availability[supervisor.name] = True
        self.agent_task_assignments[supervisor.name] = set()
    
    async def split_input_into_tasks(self, user_input: str, progress_callback=None) -> List[Task]:
        """Split user input into individual tasks using supervisor agent with NLP."""
        if progress_callback:
            progress_callback({"type": "task_splitting", "message": "🧠 Supervisor analyzing request and breaking into tasks..."})

        if not self.supervisor:
            # Fallback to simple splitting if no supervisor
            return self._simple_task_splitting(user_input)

        try:
            # Create the NLP prompt for task splitting
            agent_descriptions = self._get_agent_descriptions()
            nlp_prompt = self._create_task_splitting_prompt(agent_descriptions, user_input)

            # Get response from supervisor agent
            chat_history = []
            response = await self.supervisor.process_request(
                nlp_prompt,
                "task_splitter",
                "task_splitting_session",
                chat_history
            )

            # Debug: Print what the supervisor returned
            response_text = str(response)
            if hasattr(response, 'content') and response.content and len(response.content) > 0:
                response_text = str(response.content[0].get('text', ''))
            elif isinstance(response, dict) and 'text' in response:
                response_text = str(response['text'])
            print(f"🔍 Supervisor response: {response_text[:200]}...")

            # Parse the JSON response
            tasks = self._parse_supervisor_response(response, user_input)

            if progress_callback:
                progress_callback({"type": "tasks_created", "tasks": [{"id": t.id, "description": t.description, "assigned_agent": t.assigned_agent, "status": t.status.value} for t in tasks]})

            return tasks

        except Exception as e:
            print(f"⚠️ NLP task splitting failed: {str(e)}, falling back to simple splitting")
            if progress_callback:
                progress_callback({"type": "task_splitting_error", "message": f"⚠️ Using fallback task splitting: {str(e)}"})
            return self._simple_task_splitting(user_input)
    
    def _get_agent_descriptions(self) -> str:
        """Get descriptions of all available agents."""
        descriptions = []
        for agent in self.agents:
            descriptions.append(f"- {agent.name}: {agent.description}")
        return "\n".join(descriptions)
    
    def _create_task_splitting_prompt(self, agent_descriptions: str, user_input: str) -> str:
        """Create the NLP prompt for task splitting."""
        return f"""Given the agents in this team and their descriptions:
{agent_descriptions}

Split this user prompt into the fewest amount of tasks and assign each task an agent. Return the task and agents as a json array of tasks with their respective agents.

User prompt: {user_input}

Return your response as a JSON array in this exact format:
[
  {{
    "description": "Task description here",
    "assigned_agent": "AgentName",
    "priority": 0
  }}
]

Only return the JSON array, no other text."""
    
    def _parse_supervisor_response(self, response: Any, user_input: str) -> List[Task]:
        """Parse the supervisor's JSON response into Task objects."""
        import json
        import re
        
        # Extract JSON from response
        response_text = str(response)
        if hasattr(response, 'content') and response.content and len(response.content) > 0:
            response_text = str(response.content[0].get('text', ''))
        elif isinstance(response, dict) and 'text' in response:
            response_text = str(response['text'])
        
        # Clean up the response text
        response_text = response_text.strip()
        
        # Try to find JSON in the response
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if not json_match:
            # Try to find any JSON-like structure
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                # Wrap single object in array
                json_text = f"[{json_match.group(0)}]"
            else:
                raise ValueError("No JSON array found in supervisor response")
        else:
            json_text = json_match.group(0)
        
        try:
            tasks_data = json.loads(json_text)
        except json.JSONDecodeError as e:
            # Try to fix common JSON issues
            try:
                # Remove any markdown formatting
                json_text = re.sub(r'```json\s*', '', json_text)
                json_text = re.sub(r'```\s*', '', json_text)
                tasks_data = json.loads(json_text)
            except json.JSONDecodeError:
                raise ValueError(f"Invalid JSON in supervisor response: {str(e)}")
        
        # Ensure it's a list
        if not isinstance(tasks_data, list):
            tasks_data = [tasks_data]
        
        # Convert to Task objects
        tasks = []
        for i, task_data in enumerate(tasks_data):
            if not isinstance(task_data, dict):
                continue
                
            task = Task(
                description=task_data.get('description', ''),
                assigned_agent=task_data.get('assigned_agent', ''),
                priority=task_data.get('priority', i)
            )
            tasks.append(task)
        
        return tasks
    
    def _simple_task_splitting(self, user_input: str) -> List[Task]:
        """Fallback simple task splitting logic."""
        tasks = []
        
        # Simple task splitting logic - can be enhanced with NLP
        sentences = user_input.split('.')
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if not sentence:
                continue
                
            task = Task(
                description=sentence,
                priority=i  # Earlier tasks have higher priority
            )
            tasks.append(task)
        
        return tasks
    
    
    
    async def assign_tasks_to_agents(self, tasks: List[Task], progress_callback=None) -> None:
        """Assign tasks to appropriate agents (now handled by supervisor in task splitting)."""
        for task in tasks:
            if task.assigned_agent:
                # Agent already assigned by supervisor
                agent_name = task.assigned_agent
                if agent_name in self.agent_task_assignments:
                    self.agent_task_assignments[agent_name].add(task.id)
                    print(f"📋 Task assigned by supervisor: '{task.description[:50]}...' → {agent_name}")
                    if progress_callback:
                        progress_callback({"type": "task_assigned", "task_id": task.id, "agent": agent_name, "message": f"📋 {agent_name} assigned: {task.description[:50]}..."})
                else:
                    print(f"⚠️ Supervisor assigned unknown agent '{agent_name}' for task: {task.description}")
                    # Fallback to finding best agent
                    best_agent = self._find_best_agent_for_task(task)
                    if best_agent:
                        task.assigned_agent = best_agent.name
                        self.agent_task_assignments[best_agent.name].add(task.id)
                        print(f"📋 Fallback assignment: '{task.description[:50]}...' → {best_agent.name}")
                        if progress_callback:
                            progress_callback({"type": "task_reassigned", "task_id": task.id, "original_agent": agent_name, "new_agent": best_agent.name, "message": f"📋 Reassigned to {best_agent.name}: {task.description[:50]}..."})
            else:
                # No agent assigned, find the best one
                best_agent = self._find_best_agent_for_task(task)
                if best_agent:
                    task.assigned_agent = best_agent.name
                    self.agent_task_assignments[best_agent.name].add(task.id)
                    print(f"📋 Auto-assigned task: '{task.description[:50]}...' → {best_agent.name}")
                    if progress_callback:
                        progress_callback({"type": "task_assigned", "task_id": task.id, "agent": best_agent.name, "message": f"📋 {best_agent.name} assigned: {task.description[:50]}..."})
                else:
                    print(f"⚠️ No suitable agent found for task: {task.description}")
                    if progress_callback:
                        progress_callback({"type": "task_assignment_failed", "task_id": task.id, "message": f"⚠️ No suitable agent found for: {task.description[:50]}..."})
    
    def _find_best_agent_for_task(self, task: Task) -> Optional[Agent]:
        """Find the best agent for a given task."""
        # Simple agent matching based on task description and agent name
        task_desc_lower = task.description.lower()
        
        for agent in self.agents:
            if not self.agent_availability.get(agent.name, True):
                continue
                
            agent_name_lower = agent.name.lower()
            
            # Match based on keywords in task description
            if 'research' in task_desc_lower and 'research' in agent_name_lower:
                return agent
            elif any(keyword in task_desc_lower for keyword in ['code', 'program', 'develop', 'write']) and 'coder' in agent_name_lower:
                return agent
            elif any(keyword in task_desc_lower for keyword in ['run', 'execute', 'command']) and 'command' in agent_name_lower:
                return agent
            elif 'analyze' in task_desc_lower and 'research' in agent_name_lower:
                return agent
        
        # Fallback to first available agent
        for agent in self.agents:
            if self.agent_availability.get(agent.name, True):
                return agent
        
        return None
    
    async def execute_tasks_sequential(self, tasks: List[Task], progress_callback=None) -> List[TaskResult]:
        """Execute tasks sequentially in order."""
        results = []

        # Add tasks to the task dictionary
        for task in tasks:
            self.tasks[task.id] = task

        # Execute tasks one by one in order
        for i, task in enumerate(tasks):
            print(f"🔄 Executing task: {task.description[:50]}...")
            if progress_callback:
                progress_callback({"type": "task_started", "task_id": task.id, "progress": f"{i+1}/{len(tasks)}", "message": f"🔄 Starting: {task.description[:50]}..."})

            result = await self._execute_single_task(task, progress_callback)
            results.append(result)

            if progress_callback:
                if result.success:
                    progress_callback({"type": "task_completed", "task_id": task.id, "progress": f"{i+1}/{len(tasks)}", "message": f"✅ Completed: {task.description[:50]}...", "output": result.output})
                else:
                    progress_callback({"type": "task_failed", "task_id": task.id, "progress": f"{i+1}/{len(tasks)}", "message": f"❌ Failed: {task.description[:50]}...", "error": result.error})

            # If task failed, we can choose to continue or stop
            if not result.success:
                print(f"⚠️ Task failed, continuing with next task...")

        return results
    
    
    async def _execute_single_task(self, task: Task, progress_callback=None) -> TaskResult:
        """Execute a single task and return the result."""
        task.status = TaskStatus.RUNNING
        task.started_at = asyncio.get_event_loop().time()
        
        try:
            # Find the assigned agent
            agent = None
            for a in self.agents:
                if a.name == task.assigned_agent:
                    agent = a
                    break
            
            if not agent:
                raise ValueError(f"No agent found for task: {task.assigned_agent}")
            
            # Mark agent as busy
            self.agent_availability[agent.name] = False
            
            # Execute the task
            task_desc_lower = task.description.lower()
            if any(keyword in task_desc_lower for keyword in ['run:', 'execute:', 'command']):
                # Handle command execution
                command = self._extract_command_from_task(task)
                if command:
                    if progress_callback:
                        progress_callback({"type": "command_execution", "task_id": task.id, "command": command, "message": f"💻 Executing command: {command}"})
                    result = await self.execute_command(command, progress_callback=progress_callback)
                    output = result
                else:
                    output = "No command found in task"
                    if progress_callback:
                        progress_callback({"type": "command_error", "task_id": task.id, "message": "❌ No command found in task"})
            else:
                # Handle regular agent tasks
                if progress_callback:
                    progress_callback({"type": "agent_processing", "task_id": task.id, "agent": agent.name, "message": f"🤖 {agent.name} processing task..."})
                chat_history = []
                response = await agent.process_request(
                    task.description,
                    "task_user",
                    f"task_{task.id}",
                    chat_history
                )
                
                # Extract text content from ConversationMessage
                if hasattr(response, 'content') and response.content and len(response.content) > 0:
                    output = str(response.content[0].get('text', ''))
                else:
                    output = str(response)
            
            # Mark task as completed
            task.status = TaskStatus.COMPLETED
            task.completed_at = asyncio.get_event_loop().time()
            task.output_data = {"result": output}
            
            # Create task result
            task_result = TaskResult(
                task_id=task.id,
                success=True,
                output=output,
                metadata={"agent": agent.name, "task_description": task.description}
            )
            
            self.completed_tasks[task.id] = task_result
            print(f"✅ Task completed: {task.description[:50]}...")
            
            return task_result
            
        except Exception as e:
            # Mark task as failed
            task.status = TaskStatus.FAILED
            task.error_message = str(e)
            task.completed_at = asyncio.get_event_loop().time()
            
            task_result = TaskResult(
                task_id=task.id,
                success=False,
                output=None,
                error=str(e),
                metadata={"agent": task.assigned_agent, "task_description": task.description}
            )
            
            self.completed_tasks[task.id] = task_result
            print(f"❌ Task failed: {task.description[:50]}... - {str(e)}")
            
            return task_result
            
        finally:
            # Mark agent as available
            if task.assigned_agent:
                self.agent_availability[task.assigned_agent] = True
                self.agent_task_assignments[task.assigned_agent].discard(task.id)
    
    def _extract_command_from_task(self, task: Task) -> Optional[str]:
        """Extract command from task description."""
        # Simple command extraction - can be enhanced
        text = task.description.lower()
        if 'run:' in text or 'execute:' in text:
            parts = task.description.split(':', 1)
            if len(parts) > 1:
                return parts[1].strip()
        return None
    
    async def coordinate_responses(self, task_results: List[TaskResult]) -> str:
        """Coordinate responses from multiple tasks and return final result."""
        if not task_results:
            return "No tasks were executed."
        
        # Group results by success/failure
        successful_results = [r for r in task_results if r.success]
        failed_results = [r for r in task_results if not r.success]
        
        response_parts = []
        
        if successful_results:
            response_parts.append("## ✅ Successful Tasks")
            for result in successful_results:
                task = self.tasks.get(result.task_id)
                if task:
                    response_parts.append(f"**{task.description}**")
                    response_parts.append(f"Agent: {result.metadata.get('agent', 'Unknown')}")
                    response_parts.append(f"Result: {str(result.output)[:200]}...")
                    response_parts.append("")
        
        if failed_results:
            response_parts.append("## ❌ Failed Tasks")
            for result in failed_results:
                task = self.tasks.get(result.task_id)
                if task:
                    response_parts.append(f"**{task.description}**")
                    response_parts.append(f"Error: {result.error}")
                    response_parts.append("")
        
        return "\n".join(response_parts)
    
    async def execute_command(self, command: str, timeout: int = 30, progress_callback=None) -> dict:
        """Execute a terminal command and return the output."""
        if not self.command_execution_enabled:
            return {
                "success": False,
                "error": "Command execution is disabled",
                "stdout": "",
                "stderr": "",
                "return_code": -1
            }
        
        try:
            # Parse the command safely
            if isinstance(command, str):
                # Split the command into parts for safer execution
                cmd_parts = shlex.split(command)
            else:
                cmd_parts = command

            print(f"🖥️  Executing terminal command: {command}")
            if progress_callback:
                progress_callback({"type": "terminal_output", "message": f"🖥️  $ {command}", "level": "command"})

            # Execute the command with timeout
            process = await asyncio.create_subprocess_exec(
                *cmd_parts,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )

                stdout_text = stdout.decode('utf-8', errors='replace')
                stderr_text = stderr.decode('utf-8', errors='replace')

                # Log output to console for debugging
                if stdout_text:
                    print(f"📤 STDOUT: {stdout_text[:500]}{'...' if len(stdout_text) > 500 else ''}")
                if stderr_text:
                    print(f"📤 STDERR: {stderr_text[:500]}{'...' if len(stderr_text) > 500 else ''}")
                print(f"📊 Exit code: {process.returncode}")

                # Send progress updates with terminal output
                if progress_callback:
                    if stdout_text:
                        progress_callback({"type": "terminal_output", "message": f"📤 {stdout_text[:200]}{'...' if len(stdout_text) > 200 else ''}", "level": "stdout"})
                    if stderr_text:
                        progress_callback({"type": "terminal_output", "message": f"📤 {stderr_text[:200]}{'...' if len(stderr_text) > 200 else ''}", "level": "stderr"})
                    progress_callback({"type": "terminal_output", "message": f"📊 Command finished with exit code: {process.returncode}", "level": "result"})

                return {
                    "success": process.returncode == 0,
                    "stdout": stdout_text,
                    "stderr": stderr_text,
                    "return_code": process.returncode,
                    "command": command
                }

            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                error_msg = f"Command timed out after {timeout} seconds"
                print(f"⏰ {error_msg}")
                if progress_callback:
                    progress_callback({"type": "terminal_output", "message": f"⏰ {error_msg}", "level": "error"})
                return {
                    "success": False,
                    "error": error_msg,
                    "stdout": "",
                    "stderr": "",
                    "return_code": -1,
                    "command": command
                }

        except Exception as e:
            error_msg = f"Failed to execute command: {str(e)}"
            print(f"❌ {error_msg}")
            if progress_callback:
                progress_callback({"type": "terminal_output", "message": f"❌ {error_msg}", "level": "error"})
            return {
                "success": False,
                "error": error_msg,
                "stdout": "",
                "stderr": "",
                "return_code": -1,
                "command": command
            }
    
    def enable_command_execution(self, enabled: bool = True) -> None:
        """Enable or disable command execution."""
        self.command_execution_enabled = enabled
    
    # def is_command_request(self, user_msg: str) -> bool:
    #     """Check if the user message is requesting command execution."""
    #     command_indicators = [
    #         "run command", "execute command", "run terminal", "execute terminal",
    #         "run shell", "execute shell", "run cmd", "execute cmd",
    #         "terminal command", "shell command", "run:", "execute:",
    #         "sudo", "git", "npm", "pip", "python", "node", "ls", "cd", "mkdir",
    #         "rm", "cp", "mv", "chmod", "chown", "ps", "kill", "top", "htop"
    #     ]
        
    #     user_msg_lower = user_msg.lower()
    #     return any(indicator in user_msg_lower for indicator in command_indicators)
    
    async def _classify_request(self, user_msg: str) -> Agent:
        """Use supervisor agent to classify requests and route to appropriate agents."""
        if self.supervisor is None:
            print("⚠️ No supervisor agent available, using first agent")
            return self.agents[0] if self.agents else None
        
        try:
            # Use supervisor to classify the request
            chat_history = []
            classification_response = await self.supervisor.process_request(user_msg, "classification", "session", chat_history)
            
            # Extract the agent name from the supervisor's response
            if hasattr(classification_response, 'content'):
                agent_name = classification_response.content[0]['text'].strip()
            else:
                agent_name = str(classification_response).strip()
            
            print(f"🔍 Supervisor classified request as: {agent_name}")
            
            # Find the agent with the matching name
            for agent in self.agents:
                if agent_name.lower() in agent.name.lower() or agent.name.lower() in agent_name.lower():
                    print(f"✅ Routing to agent: {agent.name}")
                    return agent
            
            # If no exact match, try partial matching
            if "coder" in agent_name.lower() or "code" in agent_name.lower():
                for agent in self.agents:
                    if 'coder' in agent.name.lower() or 'code' in agent.name.lower():
                        print(f"✅ Routing to Coder agent: {agent.name}")
                        return agent
            elif "research" in agent_name.lower():
                for agent in self.agents:
                    if 'researcher' in agent.name.lower() or 'research' in agent.name.lower():
                        print(f"✅ Routing to Researcher agent: {agent.name}")
                        return agent

            
            print(f"❓ Could not find agent '{agent_name}', using first agent: {self.agents[0].name}")
            return self.agents[0] if self.agents else None
            
        except Exception as e:
            print(f"❌ Error in classification: {str(e)}")
            print(f"🔄 Falling back to first agent: {self.agents[0].name}")
            return self.agents[0] if self.agents else None

    async def route_request(self, user_msg: str, user_id: str, session_id: str, progress_callback=None) -> Any:
        """Route a request using the new task-based system."""
        if not self.agents:
            return type('Response', (), {
                'streaming': False,
                'metadata': type('Metadata', (), {'agent_name': 'no-agent'})(),
                'output': "No agents available"
            })()
        
        try:
            print(f"🔄 Processing request: {user_msg[:100]}...")

            # Step 1: Split input into tasks
            tasks = await self.split_input_into_tasks(user_msg, progress_callback)
            print(f"📋 Split into {len(tasks)} tasks")

            if not tasks:
                # Fallback to single task
                task = Task(
                    description=user_msg
                )
                tasks = [task]

            # Step 2: Assign tasks to agents
            await self.assign_tasks_to_agents(tasks, progress_callback)

            # Step 3: Execute tasks sequentially
            print(f"⚡ Executing {len(tasks)} tasks sequentially...")
            task_results = await self.execute_tasks_sequential(tasks, progress_callback)
            
            # Step 4: Coordinate responses and return final result
            final_response = await self.coordinate_responses(task_results)
            
            # Determine the primary agent for metadata
            primary_agent = "TaskOrchestrator"
            if task_results:
                primary_agent = task_results[0].metadata.get('agent', 'TaskOrchestrator')
            
            return type('Response', (), {
                'streaming': False,
                'metadata': type('Metadata', (), {'agent_name': primary_agent})(),
                'output': final_response
            })()
            
        except Exception as e:
            print(f"❌ Error in task orchestration: {str(e)}")
            # Fallback to simple agent routing
            return await self._fallback_route_request(user_msg, user_id, session_id)
    
    async def _fallback_route_request(self, user_msg: str, user_id: str, session_id: str) -> Any:
        """Fallback to simple agent routing if task system fails."""
        agent = await self._classify_request(user_msg)
        
        if agent is None:
            agent = self.agents[0]  # Fallback to first agent
        
        try:
            chat_history = []
            response = await agent.process_request(user_msg, user_id, session_id, chat_history)
            
            # Extract text content from ConversationMessage
            if hasattr(response, 'content') and response.content and len(response.content) > 0:
                output = str(response.content[0].get('text', ''))
            else:
                output = str(response)
            
            return type('Response', (), {
                'streaming': False,
                'metadata': type('Metadata', (), {'agent_name': agent.name})(),
                'output': output
            })()
        except Exception as e:
            return type('Response', (), {
                'streaming': False,
                'metadata': type('Metadata', (), {'agent_name': agent.name})(),
                'output': f"Error processing request: {str(e)}"
            })()
    
