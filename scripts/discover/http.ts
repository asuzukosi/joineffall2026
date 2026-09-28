export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export function postJson<T>(url: string, body: unknown, headers: Record<string, string> = {}) {
  return getJson<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
