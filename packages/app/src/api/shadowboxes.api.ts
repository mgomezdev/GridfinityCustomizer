import type { ApiShadowbox } from '@gridfinity/shared';

const API_BASE_URL = '';

async function apiFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error ?? `Request failed: ${res.status}`);
  }
  return res;
}

export interface ProcessImageResult {
  shadowboxId: string;
  svgPath: string;
  widthMm: number;
  heightMm: number;
  scaleMmPerPx: number;
}

export async function processImage(
  file: File,
  thicknessMm: number,
  name: string,
  accessToken: string,
): Promise<ProcessImageResult> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('thicknessMm', String(thicknessMm));
  formData.append('name', name);

  const res = await fetch(`${API_BASE_URL}/api/v1/shadowboxes/process-image`, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error ?? 'Upload failed');
  }
  return res.json();
}

export interface GenerateParams {
  shadowboxId: string;
  svgPath: string;
  rotationDeg: number;
  toleranceMm: number;
  stackable: boolean;
}

export async function generateShadowbox(params: GenerateParams, accessToken: string): Promise<ApiShadowbox> {
  const res = await apiFetch('/api/v1/shadowboxes', accessToken, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function fetchShadowboxes(accessToken: string): Promise<ApiShadowbox[]> {
  const res = await apiFetch('/api/v1/shadowboxes', accessToken);
  return res.json();
}

export async function deleteShadowbox(id: string, accessToken: string): Promise<void> {
  await apiFetch(`/api/v1/shadowboxes/${id}`, accessToken, { method: 'DELETE' });
}

export async function fetchAdminShadowboxes(accessToken: string): Promise<ApiShadowbox[]> {
  const res = await apiFetch('/api/v1/admin/shadowboxes', accessToken);
  return res.json();
}
