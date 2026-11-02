#!/usr/bin/env python3
"""
Parali orchestrator — FastAPI backend.
Handles on-demand burn analysis: fetches Sentinel-2 imagery from SimSat,
runs LFM2.5-VL inference via llama-server, returns images + prediction.
"""

import base64
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

SIMSAT_URL = os.environ.get("SIMSAT_URL", "https://simsat-sim-943572188770.us-central1.run.app")
LLAMA_URL  = "http://localhost:8080"
SIMSAT_TIMEOUT = 20
WINDOW_SECONDS = 86400 * 5   # look back 5 days for most recent image
SIZE_KM = 5.0

SYSTEM_PROMPT = (
    "You are an expert in analyzing Sentinel-2 satellite imagery for crop residue "
    "burning detection in northern India. You analyze pairs of RGB and SWIR composites "
    "of 5km tiles and produce structured JSON assessments."
)

USER_PROMPT = """The following two images show the same 5km × 5km tile of agricultural land.

Image 1 is the RGB composite (B4-B3-B2, natural color).
Image 2 is the SWIR composite (B12-B8-B4 false color), which highlights vegetation moisture, burn scars, and active fires.

In the SWIR composite:
  - Bright green = healthy standing crop (high NIR)
  - Brownish / pinkish-brown = harvested stubble or bare soil
  - Charcoal black or dark brownish-red with rectangular edges = burn scars
  - White or bright cyan = cloud cover
  - Solid black = water or missing data

Analyze both images and output exactly this JSON with no additional text:

{
  "burn_detected": <true|false>,
  "burn_severity": <"none"|"low"|"moderate"|"high">,
  "burn_fraction_estimate": <float 0.0-1.0, rounded to nearest 0.05>,
  "burn_freshness": <"none"|"fresh"|"recent"|"old">,
  "active_smoke_visible": <true|false>,
  "vegetation_phase": <"pre_harvest"|"harvest_in_progress"|"post_harvest"|"fallow">,
  "image_quality_limited": <true|false>,
  "notes": "<one sentence describing the scene>"
}"""

app = FastAPI(title="Parali Orchestrator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyseRequest(BaseModel):
    lat: float
    lon: float
    district: Optional[str] = None


class AnalyseResponse(BaseModel):
    district: Optional[str]
    lat: float
    lon: float
    satellite_ts: Optional[str]
    image_available: bool
    rgb_b64: Optional[str] = None
    swir_b64: Optional[str] = None
    prediction: Optional[dict] = None
    latency_s: Optional[float] = None
    error: Optional[str] = None


def _fetch_image(lon: float, lat: float, timestamp: str, bands: list[str]) -> Optional[bytes]:
    try:
        r = requests.get(
            f"{SIMSAT_URL}/data/image/sentinel",
            params={
                "lon": lon, "lat": lat,
                "timestamp": timestamp,
                "spectral_bands": bands,
                "size_km": SIZE_KM,
                "return_type": "png",
                "window_seconds": WINDOW_SECONDS,
            },
            timeout=SIMSAT_TIMEOUT,
        )
        r.raise_for_status()
        meta = json.loads(r.headers.get("sentinel_metadata", "{}"))
        if not meta.get("image_available"):
            return None
        return r.content
    except Exception:
        return None


def _get_satellite_ts() -> Optional[str]:
    try:
        r = requests.get(f"{SIMSAT_URL}/data/current/position", timeout=10)
        r.raise_for_status()
        return r.json().get("timestamp", datetime.now(timezone.utc).isoformat())
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def _run_inference(rgb_b64: str, swir_b64: str) -> tuple[Optional[dict], float]:
    try:
        import openai
        client = openai.OpenAI(base_url=f"{LLAMA_URL}/v1", api_key="no-key")
        t0 = time.perf_counter()
        resp = client.chat.completions.create(
            model="local",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{rgb_b64}"}},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{swir_b64}"}},
                        {"type": "text", "text": USER_PROMPT},
                    ],
                },
            ],
            max_tokens=512,
            temperature=0.0,
        )
        latency = time.perf_counter() - t0
        text = resp.choices[0].message.content.strip()
        # Parse JSON from response
        start = text.find("{")
        end   = text.rfind("}") + 1
        if start == -1 or end == 0:
            return None, latency
        return json.loads(text[start:end]), latency
    except Exception as e:
        return None, 0.0


@app.get("/")
def health():
    return {"service": "parali-orchestrator", "version": "0.1.0"}


@app.post("/analyse", response_model=AnalyseResponse)
def analyse(req: AnalyseRequest):
    ts = _get_satellite_ts()

    # Fetch RGB
    rgb_bytes = _fetch_image(req.lon, req.lat, ts, ["red", "green", "blue"])
    if rgb_bytes is None:
        return AnalyseResponse(
            district=req.district, lat=req.lat, lon=req.lon,
            satellite_ts=ts, image_available=False,
            error="No Sentinel-2 imagery available for this location and time window. SimSat may not be running or no data exists for these coordinates.",
        )

    # Fetch SWIR
    swir_bytes = _fetch_image(req.lon, req.lat, ts, ["swir22", "nir", "red"])
    if swir_bytes is None:
        return AnalyseResponse(
            district=req.district, lat=req.lat, lon=req.lon,
            satellite_ts=ts, image_available=False,
            error="RGB fetched but SWIR unavailable.",
        )

    rgb_b64  = base64.b64encode(rgb_bytes).decode()
    swir_b64 = base64.b64encode(swir_bytes).decode()

    # Run inference
    prediction, latency = _run_inference(rgb_b64, swir_b64)

    return AnalyseResponse(
        district=req.district,
        lat=req.lat, lon=req.lon,
        satellite_ts=ts,
        image_available=True,
        rgb_b64=rgb_b64,
        swir_b64=swir_b64,
        prediction=prediction,
        latency_s=round(latency, 2),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
