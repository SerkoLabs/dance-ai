FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN useradd --create-home --uid 10001 worker

COPY pyproject.toml ./
COPY dance_ai_worker ./dance_ai_worker

RUN pip install --no-cache-dir .

USER worker

CMD ["python", "-m", "dance_ai_worker.health"]
