"""Offline compatibility and grounding evaluation. Does NOT measure Hindsight retrieval."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from app.demo import SCENARIOS,seed_resolutions
from app.models import Evidence,Incident,StoredDocument
from app.reasoning import baseline,enrich

records=[StoredDocument(**r.model_dump(),recorded_at='2026-11-07T00:00:00Z') for r in seed_resolutions()]
cases=[(s['name'],Incident.model_validate(s['incident']),1 if n<3 else 0) for n,s in enumerate(SCENARIOS)]
cases.extend([('Different environment',cases[0][1].model_copy(update={'environment':'staging'}),0),('Different service',cases[0][1].model_copy(update={'service':'other-api'}),0)])
results=[]
for name,incident,expected in cases:
    # Deliberately provide all three sources to stress downstream context filtering.
    evidence=[Evidence(memory_id='offline-'+r.incident_id,text=r.root_cause,document_id='retrace-'+r.incident_id,record=r) for r in records]
    assessment,changes=enrich(incident,baseline(incident),evidence)
    failed=[c for c in changes if c.kind=='historical-failure']
    grounded=all(c.evidence_ids and all(any(e.memory_id==id for e in evidence) for id in c.evidence_ids) for c in changes)
    results.append({'case':name,'expected_failed_warnings':expected,'actual_failed_warnings':len(failed),'all_changes_grounded':grounded,'passed':len(failed)==expected and grounded})
report={'kind':'offline synthetic source-compatibility evaluation','not_measured':['Hindsight retrieval relevance','LLM reasoning accuracy','production downtime reduction'],'sample_size':len(results),'passed':sum(r['passed'] for r in results),'cases':results}
print(json.dumps(report,indent=2))
if not all(r['passed'] for r in results):sys.exit(1)
