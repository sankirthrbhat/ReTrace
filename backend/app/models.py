from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class Incident(StrictModel):
    title: str = Field(min_length=5, max_length=200)
    service: str = Field(min_length=2, max_length=100, pattern=r'^[\w.\- /]+$')
    environment: Literal['production', 'staging', 'development'] = 'production'
    severity: Literal['SEV1', 'SEV2', 'SEV3'] = 'SEV2'
    symptoms: str = Field(min_length=10, max_length=8000)
    logs: str = Field(default='', max_length=16000)
    context: str = Field(default='', max_length=4000)

    @field_validator('title','symptoms','logs','context')
    @classmethod
    def no_null(cls, v):
        if '\x00' in v:
            raise ValueError('Null characters are not allowed')
        return v

class AnalyzeRequest(StrictModel):
    incident: Incident
    use_memory: bool = True
    reflect: bool = False

class Attempt(StrictModel):
    action: str = Field(min_length=3, max_length=500)
    outcome: Literal['failed','succeeded','inconclusive']
    explanation: str = Field(min_length=5, max_length=1500)
    verified: bool = False

class Resolution(StrictModel):
    incident_id: str = Field(pattern=r'^[a-zA-Z0-9_-]{3,80}$')
    incident: Incident
    root_cause: str = Field(min_length=10, max_length=3000)
    attempts: list[Attempt] = Field(min_length=1, max_length=15)
    lessons: str = Field(min_length=10, max_length=3000)
    confirmed: bool
    synthetic: bool = True

class StoredDocument(Resolution):
    schema_version: Literal['retrace-v1'] = 'retrace-v1'
    recorded_at: str
    source: Literal['engineer-confirmed'] = 'engineer-confirmed'

class Evidence(StrictModel):
    memory_id: str
    document_id: str | None = None
    text: str
    record: StoredDocument | None = None
    compatible: bool = False
    limitation: str | None = None

class Recommendation(StrictModel):
    title: str
    detail: str
    evidence_ids: list[str] = Field(default_factory=list)
    kind: Literal['investigation','historical-success','historical-failure'] = 'investigation'

class Assessment(StrictModel):
    causes: list[str]
    steps: list[Recommendation]

class Analysis(StrictModel):
    investigation_id: str
    baseline: Assessment
    with_memory: Assessment
    evidence: list[Evidence]
    changes: list[Recommendation]
    memory_status: Literal['recalled','empty','disabled','unavailable']
    message: str
    reflection: str | None = None
    reflection_status: str = 'not_requested'
    limitations: list[str]
    elapsed_ms: int

class ResolutionResult(StrictModel):
    incident_id: str
    status: str
    document_id: str
    message: str

class TimelineEntry(StrictModel):
    incident_id: str
    title: str
    service: str
    status: str
    recorded_at: str
    synthetic: bool
    failed_count: int
    succeeded_count: int
    root_cause: str
