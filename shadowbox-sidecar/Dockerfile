FROM python:3.12-slim

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    libgl1 \
    libglib2.0-0 \
    git \
    fuse \
    && rm -rf /var/lib/apt/lists/*

# Install OpenSCAD AppImage
RUN wget -q https://files.openscad.org/OpenSCAD-2021.01-x86_64.AppImage -O /tmp/openscad.AppImage \
    && chmod +x /tmp/openscad.AppImage \
    && cd /tmp && ./openscad.AppImage --appimage-extract \
    && mv /tmp/squashfs-root /opt/openscad-appimage \
    && ln -s /opt/openscad-appimage/AppRun /usr/local/bin/openscad \
    && rm /tmp/openscad.AppImage

# Pin gridfinity-rebuilt-openscad library
RUN git clone https://github.com/kennetek/gridfinity-rebuilt-openscad.git /opt/gridfinity-rebuilt-openscad \
    && cd /opt/gridfinity-rebuilt-openscad \
    && git checkout 910e22d8607fd7f5f51ad5e5cbc5287a76810bfd

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV OPENSCAD_PATH=/usr/local/bin/openscad
ENV GRIDFINITY_LIB_PATH=/opt/gridfinity-rebuilt-openscad

EXPOSE 5001
CMD ["python", "app.py"]
