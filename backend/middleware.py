"""
middleware.py
-------------
Configures FastAPI middleware for the KisanScore backend.

HACKATHON MVP: CORS is wide-open (allow_origins=["*"]).
To tighten for production, replace ["*"] with an explicit list of
allowed origins, e.g. ["https://kisanscore.ippb.gov.in"].
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def add_middleware(app: FastAPI) -> None:
    """Register all middleware on the given FastAPI app instance."""

    app.add_middleware(
        CORSMiddleware,
        # TODO (production): replace "*" with explicit frontend origins
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
