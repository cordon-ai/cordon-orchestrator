# cordon-orchestrator

Install all requirements: 
``` pip install -e . ```

Running the frontend: 

start the python backend 
```
cd frontend
python start_integrated.py 

```

start react server 
```
cd frontend/cordon-react
npm start
```

Download local model (ollama)
``
ollama serve
ollama pull llama3.1:8b
```