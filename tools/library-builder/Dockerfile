FROM python:3.11-slim

# System deps for trimesh/matplotlib rendering and OrcaSlicer AppImage extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    wget \
    fuse \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install OrcaSlicer (extracted AppImage — no FUSE needed at runtime)
# Update the version tag and filename to match the latest release:
# https://github.com/SoftFever/OrcaSlicer/releases
ARG ORCA_VERSION=2.3.0
RUN wget -q \
    "https://github.com/SoftFever/OrcaSlicer/releases/download/v${ORCA_VERSION}/OrcaSlicer_Linux_V${ORCA_VERSION}.AppImage" \
    -O /opt/OrcaSlicer.AppImage \
    && chmod +x /opt/OrcaSlicer.AppImage \
    && cd /opt && /opt/OrcaSlicer.AppImage --appimage-extract \
    && rm /opt/OrcaSlicer.AppImage

# Locate and symlink the OrcaSlicer binary.
# If the symlink fails, run: docker build --progress=plain . 2>&1 | grep "squashfs-root"
# and update the path below to match the actual binary location.
RUN find /opt/squashfs-root -maxdepth 4 \( -name "OrcaSlicer" -o -name "orca_slicer" \) -type f | head -1 \
    | xargs -I{} ln -s {} /usr/local/bin/orca-slicer \
    && orca-slicer --version || echo "WARNING: orca-slicer binary not found — check AppImage extraction"

# Copy library builder source
COPY *.py ./

ENTRYPOINT ["python", "build_library.py"]
CMD ["--help"]
