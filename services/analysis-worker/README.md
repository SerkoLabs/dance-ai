# Dance AI Analysis Worker

Trusted Python process for CPU-heavy Dance AI background jobs.

Phase 0 intentionally contains only configuration, logging, health and test/container boundaries. FFmpeg, MediaPipe, segmentation, temporal alignment, scoring and deterministic feedback arrive in the Phase 3 vertical slice after database/RLS foundations are implemented.

## Local checks

```bash
python -m pip install -e '.[dev]'
python -m pytest
python -m dance_ai_worker.health
```

Real job execution requires server-only environment variables and must never receive credentials from the mobile bundle.
