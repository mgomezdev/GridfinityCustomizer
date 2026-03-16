import type { ApiShadowbox } from '@gridfinity/shared';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
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
): Promise<ProcessImageResult> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('thicknessMm', String(thicknessMm));
  formData.append('name', name);

  const res = await fetch(`${API_BASE_URL}/api/v1/shadowboxes/process-image`, {
    method: 'POST',
    credentials: 'include',
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

export async function generateShadowbox(params: GenerateParams): Promise<ApiShadowbox> {
  const res = await apiFetch('/api/v1/shadowboxes', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function fetchShadowboxes(): Promise<ApiShadowbox[]> {
  const res = await apiFetch('/api/v1/shadowboxes');
  return res.json();
}

export async function deleteShadowbox(id: string): Promise<void> {
  await apiFetch(`/api/v1/shadowboxes/${id}`, { method: 'DELETE' });
}

export async function fetchAdminShadowboxes(): Promise<ApiShadowbox[]> {
  const res = await apiFetch('/api/v1/admin/shadowboxes');
  return res.json();
}
