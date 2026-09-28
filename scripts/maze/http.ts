export async function getText(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.text();
}

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  return JSON.parse(await getText(url, init));
}

export function postJson<T>(url: string, body: unknown, headers: Record<string, string> = {}) {
  return getJson<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
