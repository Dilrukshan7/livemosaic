"""
MosaicForge engine — faithful port of mosaic.py v2.

Preserved exactly:
- 4-flip × 2-brightness augmentation (8 variants/source)
- MIN_TILES cycle-fill with shuffle
- Cell extraction via reshape/transpose (no pixel loops)
- Batched L2 colour matching, TOP_K candidates kept
- Anti-repeat placement within NEIGHBOR_RADIUS
- Blend: tile*(1-blend) + original_cell*blend

Additions vs. reference script:
- output_resolution: float multiplier applied to main image before processing
- Accepts in-memory bytes / PIL images instead of file paths
- Reports progress via an optional callback fn(step: str, pct: int)
- Supports PNG output in addition to JPEG
"""
import io
import random
import zipfile
from pathlib import Path
from typing import Callable, Optional

import numpy as np
from PIL import Image

MIN_TILES = 2000
NEIGHBOR_RADIUS = 4
TOP_K = 24
BATCH = 1024


def _augment_pool(base: list[np.ndarray]) -> list[np.ndarray]:
    pool: list[np.ndarray] = []
    for a in base:
        a_f = a.astype(np.float32)
        for flip in [a, a[:, ::-1, :], a[::-1, :, :], a[::-1, ::-1, :]]:
            flip_f = flip.astype(np.float32)
            pool.append(flip.copy())
            pool.append(np.clip(flip_f * 1.25, 0, 255).astype(np.uint8))
    return pool


def build_tile_pool(
    tile_images: list[bytes],
    cell_size: int,
    progress: Optional[Callable[[str, int], None]] = None,
) -> np.ndarray:
    """
    Load raw tile bytes, resize to cell_size×cell_size, augment, cycle-fill.
    Returns uint8 ndarray (N, cell_size, cell_size, 3).
    """
    base: list[np.ndarray] = []
    total = len(tile_images)
    for i, raw in enumerate(tile_images):
        try:
            img = Image.open(io.BytesIO(raw))
            img.draft("RGB", (cell_size * 4, cell_size * 4))
            arr = np.array(
                img.convert("RGB").resize((cell_size, cell_size), Image.LANCZOS),
                dtype=np.uint8,
            )
            base.append(arr)
        except Exception:
            pass
        if progress and i % max(1, total // 20) == 0:
            progress("Loading tiles", int(10 + 10 * i / total))

    if not base:
        raise ValueError("Could not load any tile images from the ZIP.")

    pool = _augment_pool(base)

    if len(pool) < MIN_TILES:
        orig = pool[:]
        while len(pool) < MIN_TILES:
            extra = orig[:]
            random.shuffle(extra)
            pool.extend(extra[: MIN_TILES - len(pool)])

    random.shuffle(pool)
    return np.array(pool, dtype=np.uint8)


def extract_tiles_from_zip(zip_bytes: bytes) -> tuple[list[bytes], int]:
    """Return (list_of_raw_image_bytes, source_count)."""
    exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
    images: list[bytes] = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for name in zf.namelist():
            if Path(name).suffix.lower() in exts and not name.startswith("__MACOSX"):
                images.append(zf.read(name))
    return images, len(images)


def make_mosaic(
    main_bytes: bytes,
    tile_images: list[bytes],
    cell_size: int = 20,
    blend: float = 0.40,
    output_resolution: float = 2.0,
    output_format: str = "JPEG",
    jpeg_quality: int = 92,
    progress: Optional[Callable[[str, int], None]] = None,
) -> bytes:
    """
    Generate a photomosaic and return the output image as bytes.

    Parameters mirror the UI controls:
        cell_size          — px per cell (default 20, spec default)
        blend              — fraction of original pixel blended in (0-1, default 0.40)
        output_resolution  — scale factor applied to main before processing (default 2.0)
        output_format      — "JPEG" or "PNG"
        jpeg_quality       — 1-100, used when output_format == "JPEG"
        progress           — optional fn(step_label: str, pct: int) called during processing
    """
    if progress:
        progress("Loading main image", 2)

    # ── 1. Main photo ──────────────────────────────────────────────────────
    main_img = Image.open(io.BytesIO(main_bytes)).convert("RGB")
    if output_resolution != 1.0:
        new_w = int(main_img.width * output_resolution)
        new_h = int(main_img.height * output_resolution)
        main_img = main_img.resize((new_w, new_h), Image.LANCZOS)

    W, H = main_img.size
    cols = W // cell_size
    rows = H // cell_size
    out_w = cols * cell_size
    out_h = rows * cell_size
    N_cells = rows * cols

    main_arr = np.array(main_img.crop((0, 0, out_w, out_h)), dtype=np.float32)

    if progress:
        progress("Building tile pool", 5)

    # ── 2. Tile pool ───────────────────────────────────────────────────────
    tile_stack = build_tile_pool(tile_images, cell_size, progress)
    N = len(tile_stack)
    tile_f = tile_stack.astype(np.float32)
    color_arr = tile_f.mean(axis=(1, 2))  # (N, 3)

    if progress:
        progress("Extracting cells", 25)

    # ── 3. Extract all cells via reshape (no pixel copying) ────────────────
    main_r = main_arr.reshape(rows, cell_size, cols, cell_size, 3)
    cells_5d = np.ascontiguousarray(main_r.transpose(0, 2, 1, 3, 4))
    cells_flat = cells_5d.reshape(N_cells, cell_size, cell_size, 3)
    cell_avgs = cells_flat.mean(axis=(1, 2))  # (N_cells, 3)

    if progress:
        progress("Colour matching", 30)

    # ── 4. Vectorised colour matching (batched) ───────────────────────────
    top_all = np.zeros((N_cells, TOP_K), dtype=np.int32)
    for i in range(0, N_cells, BATCH):
        j = min(i + BATCH, N_cells)
        diff = cell_avgs[i:j, np.newaxis, :] - color_arr[np.newaxis, :, :]
        dist = (diff * diff).sum(axis=2)
        top_all[i:j] = np.argsort(dist, axis=1)[:, :TOP_K]
        if progress and i % (BATCH * 10) == 0:
            pct = 30 + int(30 * i / N_cells)
            progress("Colour matching", pct)

    if progress:
        progress("Anti-repeat placement", 60)

    # ── 5. Anti-repeat placement ───────────────────────────────────────────
    top_2d = top_all.reshape(rows, cols, TOP_K)
    used_2d = np.full((rows, cols), -1, dtype=np.int32)

    for row in range(rows):
        r_lo = max(0, row - NEIGHBOR_RADIUS)
        for col in range(cols):
            c_lo = max(0, col - NEIGHBOR_RADIUS)
            c_hi = min(cols, col + NEIGHBOR_RADIUS + 1)
            used_nearby = {
                int(used_2d[pr, pc])
                for pr in range(r_lo, row)
                for pc in range(c_lo, c_hi)
                if used_2d[pr, pc] >= 0
            }
            used_nearby.update(
                int(used_2d[row, pc])
                for pc in range(c_lo, col)
                if used_2d[row, pc] >= 0
            )
            chosen = int(top_2d[row, col, 0])
            for k in range(TOP_K):
                cand = int(top_2d[row, col, k])
                if cand not in used_nearby:
                    chosen = cand
                    break
            used_2d[row, col] = chosen

        if progress and row % max(1, rows // 20) == 0:
            pct = 60 + int(30 * row / rows)
            progress("Placing tiles", pct)

    if progress:
        progress("Blending & assembling", 90)

    # ── 6. Gather tiles, blend, reassemble ───────────────────────────────
    best_flat = used_2d.ravel()
    best_tiles = tile_f[best_flat]  # (N_cells, cs, cs, 3)
    blended = (best_tiles * (1.0 - blend) + cells_flat * blend).clip(0, 255).astype(np.uint8)

    blended_5d = blended.reshape(rows, cols, cell_size, cell_size, 3)
    canvas = np.ascontiguousarray(blended_5d.transpose(0, 2, 1, 3, 4)).reshape(out_h, out_w, 3)

    # ── 7. Encode output ──────────────────────────────────────────────────
    out_img = Image.fromarray(canvas)
    buf = io.BytesIO()
    if output_format.upper() == "PNG":
        out_img.save(buf, "PNG", optimize=True)
    else:
        out_img.save(buf, "JPEG", quality=jpeg_quality, subsampling=0)

    if progress:
        progress("Done", 100)

    return buf.getvalue()
