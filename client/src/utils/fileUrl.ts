// Resolve a stored file path (e.g. "/uploads/x.png") to a full URL that works
// in both production (app served by the same server) and dev (Vite + API split).
export function resolveFileUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const apiBase = (import.meta.env.VITE_API_URL as string) || '';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '');
  return `${origin}${url}`;
}
