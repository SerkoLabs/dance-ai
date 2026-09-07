import pytest

from dance_ai_worker.config import WorkerConfigError, load_worker_config


def test_worker_requires_server_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    with pytest.raises(WorkerConfigError):
        load_worker_config()


def test_worker_accepts_trusted_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co/")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-example-value-12345")
    monkeypatch.setenv("DANCE_AI_WORKER_ID", "worker-test")

    config = load_worker_config()

    assert config.supabase_url == "https://example.supabase.co"
    assert config.worker_id == "worker-test"
