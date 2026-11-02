---
base_model: LiquidAI/LFM2.5-VL-450M
datasets:
  - munish0838/crop-burn-detection-labeled
tags:
  - satellite
  - remote-sensing
  - sentinel-2
  - stubble-burning
  - crop-fire
  - fine-tuned
  - vision-language-model
  - india
  - agriculture
license: cc-by-4.0
---

# crop-burn-detector-v2

Fine-tuned **LFM2.5-VL-450M** (Liquid AI) for detecting crop residue burning in Sentinel-2 satellite imagery over northern India.

Given a pair of Sentinel-2 tiles — RGB (B4-B3-B2) and SWIR (B12-B8-B4) — covering a 5km × 5km agricultural area, the model outputs a structured JSON burn assessment. It was trained on 1,098 labelled image pairs and evaluated against the base model on 178 held-out test tiles.

---

## Benchmark — Base vs Fine-tuned

Evaluated on 178 clear-sky test tiles (held-out split of [crop-burn-detection-labeled](https://huggingface.co/datasets/munish0838/crop-burn-detection-labeled)).

| Model | burn_detected | burn_severity | smoke_visible | veg_phase | **Overall** |
|---|---|---|---|---|---|
| Base LFM2.5-VL-450M (no fine-tune) | 73.6% | 11.8% | 0.0% | 24.2% | **21.9%** |
| **crop-burn-detector-v2 (ours)** | **73.6%** | **53.9%** | **100.0%** | **46.6%** | **74.8%** |
| **Δ** | — | **+42.1pp** | **+100pp** | **+22.4pp** | **+52.9pp** |

> Primary metric (mean of burn_detected + burn_severity): **42.7% → 63.8%** (+21.1pp)

The base model produces syntactically valid JSON on every sample but collapses severity predictions to a single dominant class and outputs 0% accuracy on smoke visibility and image quality fields. Fine-tuning on domain-specific Sentinel-2 pairs corrects the severity distribution and fully unlocks the smoke and quality heads.

---

## Model details

| | |
|---|---|
| **Base model** | [LiquidAI/LFM2.5-VL-450M](https://huggingface.co/LiquidAI/LFM2.5-VL-450M) |
| **Method** | LoRA (rank 32, alpha 32, dropout 0.05) |
| **Trainable params** | 16.3M / 465M (3.5%) |
| **Target modules** | q/k/v/out_proj, fc1/fc2, w1/w2/w3, linear_1/2 (multimodal projector) |
| **Training samples** | 1,098 |
| **Epochs** | 5 |
| **Learning rate** | 2e-5 (cosine + 5% warmup) |
| **Effective batch** | 16 (batch=1, grad_accum=16) |
| **Precision** | BF16 |
| **Loss** | Class-balanced cross-entropy (no-burn class weight ×1.86) |
| **GPU** | NVIDIA RTX A4000 (16 GB VRAM) |
| **Training time** | ~16 minutes |
| **ONNX export** | [munish0838/parali-v1-onnx](https://huggingface.co/munish0838/parali-v1-onnx) |

---

## Output schema

```json
{
  "burn_detected": true,
  "burn_severity": "moderate",
  "active_smoke_visible": false,
  "vegetation_phase": "post_harvest",
  "image_quality_limited": false
}
```

| Field | Type | Values |
|---|---|---|
| `burn_detected` | bool | true / false |
| `burn_severity` | string | none / low / moderate / high |
| `active_smoke_visible` | bool | true / false |
| `vegetation_phase` | string | pre_harvest / harvest_in_progress / post_harvest / fallow |
| `image_quality_limited` | bool | true / false (cloud cover, missing data) |

---

## Inference

```python
from transformers import AutoProcessor, AutoModelForImageTextToText
from PIL import Image
import torch, json

model = AutoModelForImageTextToText.from_pretrained(
    "munish0838/crop-burn-detector-v2",
    torch_dtype=torch.bfloat16,
    device_map="auto",
    trust_remote_code=True,
)
processor = AutoProcessor.from_pretrained(
    "munish0838/crop-burn-detector-v2",
    trust_remote_code=True,
)

rgb_image  = Image.open("tile_rgb.png")   # Sentinel-2 B4-B3-B2 composite
swir_image = Image.open("tile_swir.png")  # Sentinel-2 B12-B8-B4 composite

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

Analyze both images and output exactly this JSON with no additional text:

{
  "burn_detected": <true|false>,
  "burn_severity": <"none"|"low"|"moderate"|"high">,
  "active_smoke_visible": <true|false>,
  "vegetation_phase": <"pre_harvest"|"harvest_in_progress"|"post_harvest"|"fallow">,
  "image_quality_limited": <true|false>
}"""

messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": [
        {"type": "image", "image": rgb_image},
        {"type": "image", "image": swir_image},
        {"type": "text",  "text": USER_PROMPT},
    ]},
]

inputs = processor.apply_chat_template(
    messages,
    add_generation_prompt=True,
    return_tensors="pt",
    return_dict=True,
    tokenize=True,
).to(model.device)

with torch.no_grad():
    out = model.generate(**inputs, max_new_tokens=256, do_sample=False)

input_len  = inputs["input_ids"].shape[1]
new_tokens = out[:, input_len:]
raw = processor.batch_decode(new_tokens, skip_special_tokens=True)[0].strip()

result = json.loads(raw)
print(result)
# {'burn_detected': True, 'burn_severity': 'moderate', 'active_smoke_visible': False,
#  'vegetation_phase': 'post_harvest', 'image_quality_limited': False}
```

---

## Dataset

| | |
|---|---|
| **Raw imagery** | [munish0838/crop-burn-detection-raw](https://huggingface.co/datasets/munish0838/crop-burn-detection-raw) |
| **Labelled (used for training)** | [munish0838/crop-burn-detection-labeled](https://huggingface.co/datasets/munish0838/crop-burn-detection-labeled) |
| **Total samples** | 1,370 (1,103 train / 267 test) |
| **Coverage** | 55 districts · 5 Indian states · 22–31.7°N, 73.6–83.7°E |
| **Date range** | March – November 2025 |
| **Tile size** | 5km × 5km Sentinel-2 tiles |
| **Imagery source** | DPhi SimSat API → ESA Copernicus |

---

## Why this model exists

Official Indian government fire monitoring relies on VIIRS and MODIS satellites that pass at fixed times (10:30 AM, 1:30 PM). By 2025, over 90% of large crop fires in Punjab were being lit after 3 PM — after every government satellite had passed. A 2025 CEEW field study found 169 burnt fields in a single district over two days; the government's system detected 7.

Sentinel-2 burn scars persist for days after a fire. This model reads those scars — alongside live NASA FIRMS hotspots — to give enforcement teams a complete picture regardless of when the fire happened.

This is part of **[Parali](https://github.com/munish0838/parali)**, a real-time crop burn detection platform for northern India.

---

## Citation

If you use this model or dataset, please cite:

```
@misc{parali2026,
  title  = {Parali: VLM-based Crop Burn Detection from Sentinel-2 Imagery},
  author = {Aashish Kumar},
  year   = {2026},
  url    = {https://huggingface.co/munish0838/crop-burn-detector-v2}
}
```
