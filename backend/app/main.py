import asyncio
import hmac
import json
import time
import uuid
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from collections import defaultdict, deque
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import Settings
from .demo import SCENARIOS
from .memory import Memory, MemoryError
from .models import AnalyzeRequest, Analysis, Resolution, ResolutionResult, StoredDocument, TimelineEntry
from .reasoning import baseline, enrich
from .security import redact
from .store import Store, Conflict

LIMITATIONS = [
 'All causes are hypotheses until an engineer verifies them. ReTrace never executes infrastructure actions.',
 'The baseline is deterministic symptom-based triage, not an independent LLM benchmark.',
 'Historical outcomes apply to their recorded context; similar symptoms can have different causes.',
]

def create_app(settings=None, memory=None, store=None):
    settings=settings or Settings()
    memory=memory or Memory(settings)
    store=store or Store(settings.retrace_database)
    app=FastAPI(title='ReTrace',version='1.0.0')
    app.add_middleware(CORSMiddleware,allow_origins=[v.strip() for v in settings.retrace_allowed_origins.split(',') if v.strip()],allow_methods=['GET','POST'],allow_headers=['Authorization','Content-Type'])
    windows=defaultdict(deque)
    write_lock=asyncio.Lock()

    async def authorized(request: Request):
        token=settings.retrace_api_token.get_secret_value()
        if token and not hmac.compare_digest(request.headers.get('Authorization',''),f'Bearer {token}'):
            raise HTTPException(401,'A valid ReTrace access token is required.')

    async def metered(request: Request):
        # Single-process MVP limiter. Deploy one worker; distributed limiting is future work.
        key=request.client.host if request.client else 'unknown'
        now=time.monotonic()
        q=windows[key]
        while q and q[0]<now-60: q.popleft()
        if len(q)>=12:
            raise HTTPException(429,'At most 12 memory operations per minute. Try again shortly.')
        q.append(now)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request,exc):
        # FastAPI default errors echo input. Return locations and types only to avoid reflecting secrets.
        return JSONResponse(status_code=422,content={'detail':[{'loc':list(e['loc']),'type':e['type'],'msg':e['msg']} for e in exc.errors()]})

    @app.exception_handler(MemoryError)
    async def memory_error(request,exc):
        return JSONResponse(status_code=503,content={'detail':exc.message,'code':exc.code})

    @app.get('/health')
    async def health():
        return {'status':'ok','memory_configured':settings.configured,'memory_verified':False,'version':'1.0.0'}

    @app.get('/api/memory/status',dependencies=[Depends(authorized),Depends(metered)])
    async def status():
        return await memory.verify()

    @app.get('/api/demo/scenarios')
    async def scenarios():
        return {'synthetic':True,'scenarios':SCENARIOS}

    @app.get('/api/memory/timeline',response_model=list[TimelineEntry],dependencies=[Depends(authorized)])
    async def timeline():
        return store.timeline()

    @app.post('/api/incidents/analyze',response_model=Analysis,dependencies=[Depends(authorized),Depends(metered)])
    async def analyze(req: AnalyzeRequest):
        start=time.monotonic()
        incident=req.incident.model_copy(update={k:redact(getattr(req.incident,k)) for k in ('title','symptoms','logs','context')})
        base=baseline(incident) # This function never receives a store or memory client.
        evidence=[]
        memory_status='disabled'
        message='Memory disabled. Only current-input triage was used.'
        if req.use_memory:
            try:
                evidence=await memory.recall(f'Service: {incident.service}; Environment: {incident.environment}; Symptoms: {incident.symptoms}; Logs: {incident.logs[:2000]}')
                memory_status='recalled' if evidence else 'empty'
                message=f'Recalled {len(evidence)} evidence snippets from Hindsight.' if evidence else 'No relevant Hindsight memories were returned. No historical recommendation was invented.'
            except MemoryError as exc:
                memory_status='unavailable'
                message=exc.message
        enriched,changes=enrich(incident,base,evidence)
        reflection=None
        reflection_status='not_requested'
        if req.reflect and memory_status=='recalled':
            try:
                reflection=await memory.reflect(f'{incident.model_dump_json()}\nGive cautious incident hypotheses and read-only checks. Never assert a verified root cause for the current incident.')
                reflection_status='generated_hypothesis'
            except MemoryError:
                reflection_status='unavailable'
        elif req.reflect:
            reflection_status='skipped_without_evidence'
        return Analysis(investigation_id=str(uuid.uuid4()),baseline=base,with_memory=enriched,evidence=evidence,changes=changes,memory_status=memory_status,message=message,reflection=reflection,reflection_status=reflection_status,limitations=LIMITATIONS,elapsed_ms=int((time.monotonic()-start)*1000))

    @app.post('/api/incidents/resolve',response_model=ResolutionResult,dependencies=[Depends(authorized),Depends(metered)])
    async def resolve(resolution: Resolution):
        if not resolution.confirmed:
            raise HTTPException(422,'Explicit engineer confirmation is required before retention.')
        safe=Resolution.model_validate(json.loads(redact(resolution.model_dump_json())))
        record=StoredDocument(**safe.model_dump(),recorded_at=datetime.now(timezone.utc).isoformat())
        # Serialize writes so retries do not race. Document IDs stay stable across interrupted attempts.
        async with write_lock:
            try:
                state=store.reserve(record)
            except Conflict as exc:
                raise HTTPException(409,str(exc)) from None
            if state=='retained':
                return ResolutionResult(incident_id=record.incident_id,status='retained',document_id=f'retrace-{record.incident_id}',message='Already retained. No additional Hindsight write was made.')
            record=store.get(record.incident_id)
            try:
                document_id=await memory.retain(record)
            except MemoryError:
                store.status(record.incident_id,'unconfirmed')
                raise
            store.status(record.incident_id,'retained')
        return ResolutionResult(incident_id=record.incident_id,status='retained',document_id=document_id,message='Hindsight confirmed retention. Analyze again to verify recall; retention alone does not prove retrieval.')

    frontend=Path(__file__).resolve().parents[2]/'dist'
    if frontend.is_dir():
        app.mount('/',StaticFiles(directory=frontend,html=True),name='frontend')
    return app

app=create_app()
