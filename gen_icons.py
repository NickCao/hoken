#!/usr/bin/env python3
"""Generate simple hoken extension icons as PNG files (no dependencies)."""

import struct
import zlib
import os

def create_png(width, height, pixels):
    """Create a minimal PNG file from RGBA pixel data."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    header = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))

    raw = b""
    for y in range(height):
        raw += b"\x00"  # filter: none
        for x in range(width):
            idx = (y * width + x) * 4
            raw += bytes(pixels[idx:idx+4])

    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")

    return header + ihdr + idat + iend


def draw_icon(size):
    """Draw a simple icon: indigo rounded square with 'H' letterform."""
    pixels = [0] * (size * size * 4)

    # Colors
    bg = (79, 70, 229, 255)      # indigo-600 (#4F46E5)
    fg = (255, 255, 255, 255)    # white
    transparent = (0, 0, 0, 0)

    radius = max(2, size // 6)

    def in_rounded_rect(x, y):
        # Check if point is inside a rounded rectangle
        if x < radius:
            if y < radius:
                return (x - radius)**2 + (y - radius)**2 <= radius**2
            elif y >= size - radius:
                return (x - radius)**2 + (y - (size - radius - 1))**2 <= radius**2
        elif x >= size - radius:
            if y < radius:
                return (x - (size - radius - 1))**2 + (y - radius)**2 <= radius**2
            elif y >= size - radius:
                return (x - (size - radius - 1))**2 + (y - (size - radius - 1))**2 <= radius**2
        return 0 <= x < size and 0 <= y < size

    # Draw background rounded rect
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            if in_rounded_rect(x, y):
                pixels[idx:idx+4] = bg
            else:
                pixels[idx:idx+4] = transparent

    # Draw "H" letter
    margin = max(2, size // 4)
    stroke = max(1, size // 8)

    # Left vertical bar
    for y in range(margin, size - margin):
        for x in range(margin, margin + stroke):
            if in_rounded_rect(x, y):
                idx = (y * size + x) * 4
                pixels[idx:idx+4] = fg

    # Right vertical bar
    for y in range(margin, size - margin):
        for x in range(size - margin - stroke, size - margin):
            if in_rounded_rect(x, y):
                idx = (y * size + x) * 4
                pixels[idx:idx+4] = fg

    # Horizontal bar (middle)
    mid_y = size // 2
    bar_half = max(1, stroke // 2)
    for y in range(mid_y - bar_half, mid_y + bar_half + (1 if stroke % 2 else 0)):
        for x in range(margin, size - margin):
            if in_rounded_rect(x, y):
                idx = (y * size + x) * 4
                pixels[idx:idx+4] = fg

    return pixels


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, "icons")
    os.makedirs(icons_dir, exist_ok=True)

    for size in (16, 48, 128):
        pixels = draw_icon(size)
        png_data = create_png(size, size, pixels)
        path = os.path.join(icons_dir, f"icon{size}.png")
        with open(path, "wb") as f:
            f.write(png_data)
        print(f"wrote {path} ({len(png_data)} bytes)")


if __name__ == "__main__":
    main()
