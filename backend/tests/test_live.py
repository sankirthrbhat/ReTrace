"""Opt-in real integration: RETRACE_LIVE_TESTS=1 python -m pytest -m live -s.
Writes one stable synthetic document. Never runs automatically or creates a bank.
"""
import asyncio
import os
from datetime import datetime,timezone
import pytest
from app.config import Settings
from app.demo import seed_resolutions
from app.memory import Memory
from app.models import StoredDocument

@pytest.mark.live
@pytest.mark.skipif(os.getenv('RETRACE_LIVE_TESTS')!='1',reason='Live calls require explicit opt-in and configured credentials.')
def test_live_retain_recall_persistence():
    settings=Settings()
    assert settings.configured,'Configure backend/.env locally. Do not paste credentials into chat.'
    resolution=seed_resolutions()[0].model_copy(update={'incident_id':'SMOKE-RETRACE-V1'})
    record=StoredDocument(**resolution.model_dump(),recorded_at='2026-11-07T00:00:00+00:00')
    async def run():
        await Memory(settings).verify()
        await Memory(settings).retain(record)
        # Separate SDK clients for each call. No in-process evidence cache.
        for attempt in range(6):
            evidence=await Memory(settings).recall('payments-api production connection pool exhaustion SMOKE-RETRACE-V1 restarting failed replica budget')
            if any(e.record and e.record.incident_id==record.incident_id for e in evidence):return
            await asyncio.sleep(2)
        pytest.fail('Retention completed but the source document was not retrieved within the smoke-test window.')
    asyncio.run(run())
