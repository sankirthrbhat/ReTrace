from pathlib import Path
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[1]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / '.env', extra='ignore')
    hindsight_base_url: str = 'https://api.hindsight.vectorize.io'
    hindsight_bank_id: str = 'ReTrace Incident Memory'
    hindsight_api_key: SecretStr = SecretStr('')
    retrace_api_token: SecretStr = SecretStr('')
    retrace_database: str = str(ROOT / 'data' / 'retrace.db')
    retrace_allowed_origins: str = 'http://localhost:5173,http://127.0.0.1:5173'
    hindsight_timeout: float = 45.0

    @property
    def configured(self):
        return bool(self.hindsight_api_key.get_secret_value() and self.hindsight_bank_id)
