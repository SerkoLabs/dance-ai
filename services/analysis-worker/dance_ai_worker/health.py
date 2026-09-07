from __future__ import annotations

import json

from . import __version__


def main() -> int:
    print(json.dumps({"status": "ok", "service": "dance-ai-worker", "version": __version__}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
