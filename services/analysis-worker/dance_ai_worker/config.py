from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class WorkerConfig:
    supabase_url: str
    service_role_key: str
    worker_id: str


class WorkerConfigError(RuntimeError):
    """Raised when trusted worker configuration is missing or invalid."""


def load_worker_config() -> WorkerConfig:
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    worker_id = os.getenv("DANCE_AI_WORKER_ID", "local-worker").strip()

    if not supabase_url.startswith("https://"):
        raise WorkerConfigError("SUPABASE_URL must be an HTTPS URL.")
    if len(service_role_key) < 20:
        raise WorkerConfigError("SUPABASE_SERVICE_ROLE_KEY is missing or invalid.")
    if not worker_id:
        raise WorkerConfigError("DANCE_AI_WORKER_ID must not be empty.")

    return WorkerConfig(
        supabase_url=supabase_url.rstrip("/"),
        service_role_key=service_role_key,
        worker_id=worker_id,
    )
