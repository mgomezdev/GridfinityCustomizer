import { config } from '../config.js';

export class SidecarError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'SidecarError';
  }
}

async function sidecarFetch(
  path: string,
  init: RequestInit
): Promise<unknown> {
  const url = `${config.SHADOWBOX_SIDECAR_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (body as any)?.error ?? `Sidecar error ${res.status}`;
    throw new SidecarError(msg, res.status);
  }

  return body;
}

export interface ProcessImageResult {
  svgPath: string;
  widthMm: number;
  heightMm: number;
  scaleMmPerPx: number;
}

export async function processImage(
  formData: FormData
): Promise<ProcessImageResult> {
  const raw = (await sidecarFetch('/process-image', {
    method: 'POST',
    body: formData,
  })) as any;

  return {
    svgPath: raw.svg_path,
    widthMm: raw.width_mm,
    heightMm: raw.height_mm,
    scaleMmPerPx: raw.scale_mm_per_px,
  };
}

export interface GenerateParams {
  svgPath: string;
  thicknessMm: number;
  rotationDeg: number;
  toleranceMm: number;
  stackable: boolean;
}

export interface GenerateResult {
  stlBase64: string;
  gridX: number;
  gridY: number;
}

export async function generateShadowbox(
  params: GenerateParams
): Promise<GenerateResult> {
  const raw = (await sidecarFetch('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      svg_path: params.svgPath,
      thickness_mm: params.thicknessMm,
      rotation_deg: params.rotationDeg,
      tolerance_mm: params.toleranceMm,
      stackable: params.stackable,
    }),
  })) as any;

  return {
    stlBase64: raw.stl_base64,
    gridX: raw.grid_x,
    gridY: raw.grid_y,
  };
}
