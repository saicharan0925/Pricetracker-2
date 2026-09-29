"""Centralised logging configuration."""

import logging
import sys

_configured = False


def _configure_root() -> None:
    global _configured
    if _configured:
        return
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
        force=False,
    )
    # Quieten noisy third-party loggers.
    for noisy in ("uvicorn.access", "apscheduler.scheduler", "apscheduler.executors.default"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    _configured = True


def get_logger(name: str) -> logging.Logger:
    """Return a logger with the shared base configuration applied."""
    _configure_root()
    return logging.getLogger(name)
