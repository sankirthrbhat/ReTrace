import hashlib
import json
import sqlite3
from pathlib import Path
from .models import StoredDocument, TimelineEntry

class Conflict(Exception):
    pass

class Store:
    def __init__(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS resolutions (id TEXT PRIMARY KEY, digest TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, recorded_at TEXT NOT NULL)')

    def connect(self):
        c = sqlite3.connect(self.path, timeout=10)
        c.row_factory = sqlite3.Row
        return c

    def reserve(self, record: StoredDocument):
        # Ignore timestamp for stable retry identity. Each ID represents an immutable resolution.
        body = record.model_dump(mode='json')
        body.pop('recorded_at')
        digest = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT * FROM resolutions WHERE id=?', (record.incident_id,)).fetchone()
            if row:
                if row['digest'] != digest:
                    raise Conflict('Incident ID already belongs to a different resolution. Use a new ID.')
                return row['status']
            db.execute('INSERT INTO resolutions VALUES (?,?,?,?,?)', (record.incident_id,digest,record.model_dump_json(),'pending',record.recorded_at))
        return 'new'

    def status(self, incident_id, status):
        with self.connect() as db:
            db.execute('UPDATE resolutions SET status=? WHERE id=?', (status, incident_id))

    def get(self, incident_id):
        with self.connect() as db:
            row = db.execute('SELECT body FROM resolutions WHERE id=?', (incident_id,)).fetchone()
        return StoredDocument.model_validate_json(row['body']) if row else None

    def timeline(self):
        with self.connect() as db:
            rows = db.execute('SELECT * FROM resolutions ORDER BY recorded_at DESC LIMIT 100').fetchall()
        entries = []
        for row in rows:
            doc = StoredDocument.model_validate_json(row['body'])
            entries.append(TimelineEntry(incident_id=doc.incident_id,title=doc.incident.title,service=doc.incident.service,status=row['status'],recorded_at=doc.recorded_at,synthetic=doc.synthetic,failed_count=sum(a.outcome=='failed' and a.verified for a in doc.attempts),succeeded_count=sum(a.outcome=='succeeded' and a.verified for a in doc.attempts),root_cause=doc.root_cause))
        return entries
