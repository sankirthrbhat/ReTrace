import re
from .models import Incident, Assessment, Recommendation, Evidence

RULES=[
    (('pool','too many clients','database connection','active_connections'), 'Database connection pressure is a hypothesis.', ['Inspect active database sessions and pool utilization.', 'Compare pool limits, replica counts, and recent deployment configuration.']),
    (('redis','oom','maxmemory'), 'Cache capacity or eviction configuration may be involved.', ['Inspect memory usage, eviction policy, and key growth.', 'Compare cache configuration with the last known healthy deployment.']),
    (('502','gateway','upstream'), 'Upstream reachability or health checks may be involved.', ['Inspect upstream health and gateway error rates.', 'Compare ports, routes, and readiness checks with the last healthy deployment.']),
    (('timeout','latency','deadline'), 'A dependency or resource bottleneck may be involved.', ['Compare dependency latency and saturation with request volume.', 'Trace slow requests and inspect recent configuration changes.']),
]

def baseline(incident: Incident) -> Assessment:
    text=f'{incident.symptoms} {incident.logs}'.lower()
    causes=[]
    steps=[]
    for terms,cause,checks in RULES:
        if any(t in text for t in terms):
            causes.append(cause)
            steps.extend(Recommendation(title=c,detail='Read-only investigation based on current symptoms; no historical incident evidence.') for c in checks)
    if not steps:
        causes=['Insufficient evidence to identify a likely cause.']
        steps=[Recommendation(title='Establish a timeline and inspect dependencies.',detail='Compare current symptoms, deployment changes, and resource metrics before attempting a fix.')]
    return Assessment(causes=causes,steps=steps[:6])

def compatible(current: Incident, past: Incident):
    if current.service.casefold()!=past.service.casefold() or current.environment!=past.environment:
        return False
    stop={'the','and','for','with','from','after','error','errors','requests','request','have','this','that'}
    def words(i): return {t for t in re.findall(r'[a-z0-9_]{3,}',f'{i.symptoms} {i.logs}'.lower()) if t not in stop}
    return len(words(current)&words(past))>=2

def enrich(incident: Incident, base: Assessment, evidence: list[Evidence]):
    changes=[]
    causes=list(base.causes)
    seen=set()
    for e in evidence:
        if not e.record:
            continue
        e.compatible=compatible(incident,e.record.incident)
        if not e.compatible:
            e.limitation='Service, environment, or symptom overlap differs. Historical interventions are not promoted for this incident.'
            continue
        if e.record.incident_id in seen:
            continue
        seen.add(e.record.incident_id)
        causes.append(f'Historical hypothesis [{e.record.incident_id}]: {e.record.root_cause} Verify against current metrics.')
        for attempt in e.record.attempts:
            if not attempt.verified or attempt.outcome=='inconclusive':
                continue
            failed=attempt.outcome=='failed'
            changes.append(Recommendation(title=f'{"Reconsider" if failed else "Investigate prior fix"}: {attempt.action}',detail=f'{attempt.explanation} Recorded for {e.record.incident_id}. {"This failed in that context; it is not a universal prohibition." if failed else "Past success is not proof of the current cause; validate before changing production."}',evidence_ids=[e.memory_id],kind='historical-failure' if failed else 'historical-success'))
    return Assessment(causes=causes,steps=changes+base.steps),changes
