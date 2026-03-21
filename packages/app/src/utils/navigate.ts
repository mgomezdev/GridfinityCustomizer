/**
 * Client-side navigation using the History API.
 * Avoids full page reloads so the auth context (in-memory access token) stays intact.
 */
export function navigate(to: string): void {
  history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
