r"""Run from project root: backend/.venv/bin/python scripts/memory_check.py verify|seed.
Windows: backend\.venv\Scripts\python scripts\memory_check.py verify
"""
import argparse
import asyncio
import sys
from datetime import datetime,timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from app.config import Settings
from app.demo import seed_resolutions
from app.memory import Memory,MemoryError
from app.models import StoredDocument
from app.store import Store

async def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['verify','seed'])
    parser.add_argument('--confirm-synthetic',action='store_true')
    args=parser.parse_args()
    settings=Settings();memory=Memory(settings)
    await memory.verify()
    print('Existing Hindsight bank verified. No bank was created.')
    if args.action=='seed':
        if not args.confirm_synthetic:parser.error('Seeding writes three synthetic resolutions; include --confirm-synthetic to continue.')
        store=Store(settings.retrace_database)
        for r in seed_resolutions():
            record=StoredDocument(**r.model_dump(),recorded_at=datetime.now(timezone.utc).isoformat())
            state=store.reserve(record)
            if state=='retained':print(f'{r.incident_id}: already retained; skipped.');continue
            await memory.retain(store.get(r.incident_id));store.status(r.incident_id,'retained')
            print(f'{r.incident_id}: synchronous retain confirmed.')

if __name__=='__main__':
    try:asyncio.run(main())
    except MemoryError as exc:print(f'{exc.code}: {exc.message}',file=sys.stderr);sys.exit(1)
