const endpoint = "https://api.encycolorpedia.com/v1";
export type PaintOperation = "brands" | "profile" | "match" | "brand-search" | "search" | "convert";
export interface ApiInput {
  operation: PaintOperation;
  token: string;
  color: string;
  brand: string;
  query: string;
  delta: number;
  offset: number;
}
export interface Brand {
  id: string;
  name: string;
  count: number;
}
export function parseBrands(value: unknown): Brand[] {
  if (!Array.isArray(value) || value.length > 10000) throw new Error("Lista de marcas no válida.");
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Marca no válida.");
    const b = entry as Record<string, unknown>;
    if (
      typeof b.id !== "string" ||
      !b.id ||
      b.id.length > 200 ||
      typeof b.name !== "string" ||
      !b.name ||
      b.name.length > 200 ||
      typeof b.count !== "number" ||
      !Number.isSafeInteger(b.count) ||
      b.count < 0
    )
      throw new Error("Marca no válida.");
    return { id: b.id, name: b.name, count: b.count };
  });
}
export function apiRequest(input: ApiInput): { url: string; init: RequestInit } {
  if (!input.token.trim() || input.token.length > 8192 || /[\r\n]/.test(input.token))
    throw new Error("Introduce un token de API válido.");
  if (
    !/^#[0-9a-f]{6}$/i.test(input.color) ||
    !Number.isFinite(input.delta) ||
    input.delta <= 0 ||
    input.delta > 200 ||
    !Number.isSafeInteger(input.offset) ||
    input.offset < 0
  )
    throw new Error("Parámetros de búsqueda no válidos.");
  if (input.brand.length > 200 || input.query.length > 1000)
    throw new Error("La búsqueda es demasiado larga.");
  const parameters = new URLSearchParams();
  let path = "/paints";
  const init: RequestInit = {
    method: "GET",
    credentials: "omit",
    redirect: "error",
    headers: { Authorization: `Bearer ${input.token.trim()}`, Accept: "application/json" },
  };
  if (input.operation === "profile" || input.operation === "brand-search") {
    if (!input.brand) throw new Error("Selecciona una marca.");
    path += `/${encodeURIComponent(input.brand)}/${input.operation === "profile" ? "profile" : "search"}`;
  }
  if (input.operation === "search") path = "/search";
  if (input.operation === "brand-search" || input.operation === "search") {
    if (!input.query.trim()) throw new Error("Escribe una búsqueda.");
    parameters.set("q", input.query.trim());
    parameters.set("limit", "20");
    if (input.operation === "search") {
      parameters.set("offset", String(input.offset));
      parameters.set("lang", "es");
      if (input.brand) parameters.set("brand", input.brand);
    }
  }
  if (input.operation === "match" || input.operation === "convert") {
    init.method = "POST";
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    init.headers = headers;
    init.body = JSON.stringify(
      input.operation === "convert" ? { hex: input.color.slice(1) } : [input.color.slice(1)],
    );
    if (input.operation === "convert") path = "/colors";
    else {
      parameters.set("limit", "100");
      parameters.set("max_delta_e", String(input.delta));
      if (input.brand) parameters.set("brand", input.brand);
    }
  }
  return { url: `${endpoint}${path}${parameters.size ? `?${parameters}` : ""}`, init };
}
export async function callPaintApi(input: ApiInput, signal: AbortSignal): Promise<unknown> {
  const { url, init } = apiRequest(input);
  const response = await fetch(url, { ...init, signal });
  if (!response.ok) {
    const message =
      response.status === 401
        ? "El token no es válido o ha caducado."
        : response.status === 403
          ? "Tu cuenta no tiene acceso a esta operación."
          : response.status === 429
            ? "La API ha limitado las consultas. Inténtalo más tarde."
            : `La API no pudo completar la consulta (HTTP ${response.status}).`;
    throw new Error(message);
  }
  if (!response.body) throw new Error("La API devolvió una respuesta vacía.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2_000_000) throw new Error("La respuesta supera 2 MB. Reduce la búsqueda.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(data)) as unknown;
  } catch {
    throw new Error("La API no devolvió JSON válido.");
  }
}
