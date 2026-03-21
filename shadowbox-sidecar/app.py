import base64
import os
import subprocess
import sys
import tempfile

from flask import Flask, jsonify, request

# Allow importing from sibling lib/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))

from image_processor import ImageProcessor  # noqa: E402
from scad_generator import SCADGenerator   # noqa: E402

app = Flask(__name__)

OPENSCAD = os.environ.get('OPENSCAD_PATH', '/usr/bin/openscad')
GRIDFINITY_LIB = os.environ.get(
    'GRIDFINITY_LIB_PATH',
    '/opt/gridfinity-rebuilt-openscad'
)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@app.route('/process-image', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({'error': 'image field required'}), 400

    image_file = request.files['image']
    thickness_mm = request.form.get('thickness_mm')
    if thickness_mm is None:
        return jsonify({'error': 'thickness_mm field required'}), 400
    try:
        thickness_mm = float(thickness_mm)
    except ValueError:
        return jsonify({'error': 'thickness_mm must be a number'}), 400

    image_bytes = image_file.read(MAX_UPLOAD_BYTES + 1)
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        return jsonify({'error': 'image too large'}), 400

    try:
        processor = ImageProcessor(image_bytes, thickness_mm)
        result = processor.process()
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception:
        app.logger.exception('process-image failed')
        return jsonify({'error': 'internal error'}), 500

    return jsonify({
        'svg_path': result['svg_path'],
        'width_mm': result['width_mm'],
        'height_mm': result['height_mm'],
        'scale_mm_per_px': result['scale_mm_per_px'],
    })


@app.route('/generate', methods=['POST'])
def generate():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    required = ['svg_path', 'thickness_mm', 'stackable']
    for field in required:
        if field not in body:
            return jsonify({'error': f'{field} required'}), 400

    try:
        thickness_mm = float(body['thickness_mm'])
        if thickness_mm < 4:
            return jsonify({'error': 'thickness_mm must be >= 4'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'thickness_mm must be a number'}), 400

    try:
        generator = SCADGenerator(
            svg_path=body['svg_path'],
            thickness_mm=thickness_mm,
            rotation_deg=float(body.get('rotation_deg', 0)),
            tolerance_mm=float(body.get('tolerance_mm', 0.4)),
            stackable=bool(body.get('stackable', False)),
            gridfinity_lib=GRIDFINITY_LIB,
        )
        scad_content, grid_x, grid_y = generator.generate()
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception:
        app.logger.exception('SCAD generation failed')
        return jsonify({'error': 'internal error'}), 500

    with tempfile.TemporaryDirectory() as tmpdir:
        scad_path = os.path.join(tmpdir, 'model.scad')
        stl_path = os.path.join(tmpdir, 'model.stl')

        with open(scad_path, 'w') as f:
            f.write(scad_content)

        result = subprocess.run(
            [OPENSCAD, '-o', stl_path, scad_path],
            capture_output=True,
            timeout=55,
        )

        if result.returncode != 0 or not os.path.exists(stl_path):
            app.logger.error('OpenSCAD stderr: %s', result.stderr.decode())
            return jsonify({'error': 'OpenSCAD render failed'}), 500

        with open(stl_path, 'rb') as f:
            stl_bytes = f.read()

    return jsonify({
        'stl_base64': base64.b64encode(stl_bytes).decode(),
        'grid_x': grid_x,
        'grid_y': grid_y,
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
