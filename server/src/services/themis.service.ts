// JSON calls should be quick; uploads carry file bytes and get more headroom.
const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

/** Thrown when a Themis request exceeds its timeout — distinct from a Themis-side rejection or network error. */
export class ThemisTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThemisTimeoutError';
  }
}

async function themisFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new ThemisTimeoutError(`Themis did not respond within ${timeoutMs}ms: ${url}`);
    }
    throw err;
  }
}

async function themisPost(url: string, body: unknown): Promise<unknown> {
  const resp = await themisFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, REQUEST_TIMEOUT_MS);
  if (!resp.ok) throw new Error(`Themis ${resp.status}: POST ${url}`);
  return resp.json();
}

/** Upload an STL buffer to the Themis library. Returns the file id (new or existing via dedup). */
export async function uploadStlToThemis(
  themisUrl: string,
  bytes: Buffer,
  filename: string,
  folder: string,
): Promise<number> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' }), filename);
  form.append('folder', folder);
  const resp = await themisFetch(`${themisUrl}/api/v1/files/upload`, { method: 'POST', body: form }, UPLOAD_TIMEOUT_MS);
  if (!resp.ok) throw new Error(`Themis ${resp.status}: upload ${filename}`);
  const data = await resp.json() as { id: number };
  return data.id;
}

/** Create a Themis project. Returns the project id. */
export async function createThemisProject(
  themisUrl: string,
  name: string,
  notes: string,
  sourceUser?: string,
  sourceLayoutId?: number,
  customer?: string,
): Promise<number> {
  const data = await themisPost(`${themisUrl}/api/v1/projects`, {
    name,
    notes,
    order_type: 'customer',
    ...(customer ? { customer } : {}),
    source_app: 'ordinus',
    ...(sourceUser !== undefined && { source_user: sourceUser }),
    ...(sourceLayoutId !== undefined && { source_layout_id: sourceLayoutId }),
  }) as { id: number };
  return data.id;
}

/** Add a link to a Themis project. */
export async function addThemisProjectLink(
  themisUrl: string,
  projectId: number,
  url: string,
  label?: string,
): Promise<void> {
  await themisPost(`${themisUrl}/api/v1/projects/${projectId}/links`, {
    url,
    ...(label ? { label } : {}),
  });
}

/** Add an item to a Themis project. */
export async function addThemisProjectItem(
  themisUrl: string,
  projectId: number,
  fileId: number,
  quantity: number,
): Promise<void> {
  await themisPost(`${themisUrl}/api/v1/projects/${projectId}/items`, {
    file_id: fileId,
    quantity,
    filament_profile_uuid: '',
    color_hex: '#FFFFFF',
  });
}

export interface ThemisProject {
  id: number;
  items: Array<{ file_id: number }>;
  links: Array<{ url: string }>;
}

/** Fetch a Themis project's current items and links, used to resume a partially-sent project. */
export async function getThemisProject(themisUrl: string, projectId: number): Promise<ThemisProject> {
  const resp = await themisFetch(`${themisUrl}/api/v1/projects/${projectId}`, {}, REQUEST_TIMEOUT_MS);
  if (!resp.ok) throw new Error(`Themis ${resp.status}: GET project ${projectId}`);
  return resp.json() as Promise<ThemisProject>;
}
