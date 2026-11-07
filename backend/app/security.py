import re

PATTERNS = [
    (r'(?i)(bearer\s+)[A-Za-z0-9._~+/=-]{8,}', r'\1[REDACTED]'),
    (r'(?i)((?:api[_-]?key|password|secret|token)\s*[=:]\s*)[\w./+\-]{6,}', r'\1[REDACTED]'),
    (r'(?i)(postgres(?:ql)?://[^:\s]+:)[^@\s]+', r'\1[REDACTED]'),
    (r'\b(?:sk|hk)-[A-Za-z0-9_-]{12,}', '[REDACTED]'),
]

def redact(text: str) -> str:
    for pattern, replacement in PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text
