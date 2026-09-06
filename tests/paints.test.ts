import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { parseCatalog, matchCatalog, distribution } from "../src/colors/paintCatalog";
import { apiRequest, callPaintApi, parseBrands, type ApiInput } from "../src/colors/paintApi";

const catalog = [
  { brand: "A", name: "Blanco", hex: "#ffffff" },
  { brand: "B", name: "Rojo", hex: "#ff0000" },
  { brand: "A", name: "Negro", hex: "#000000" },
];
const request: ApiInput = {
  operation: "match",
  token: "test-token",
  color: "#635dd7",
  brand: "",
  query: "",
  delta: 5,
  offset: 0,
};
afterEach(() => vi.unstubAllGlobals());
describe("local paint catalogs", () => {
  it("validates complete catalogs atomically, normalizes and rejects oversized/duplicate/invalid data", () => {
    expect(parseCatalog('[{"brand":" A ","name":" Red ","hex":"#F00"}]')).toEqual([
      { brand: "A", name: "Red", hex: "#ff0000" },
    ]);
    for (const input of [
      "{}",
      "[]",
      "null",
      JSON.stringify([{ brand: "A", name: "Bad", hex: "red" }]),
      JSON.stringify([...catalog, catalog[0]]),
      JSON.stringify(Array(10001).fill(catalog[0])),
      " ".repeat(2_000_001),
    ])
      expect(() => parseCatalog(input)).toThrow();
  });
  it("matches exact colors first, limits DeltaE2000, searches accents, and honors brand", () => {
    expect(matchCatalog(catalog, "#ff0000", "", "rójo", 200)[0]?.name).toBe("Rojo");
    expect(matchCatalog(catalog, "#ff0000", "", "", 0)).toHaveLength(1);
    expect(matchCatalog(catalog, "#ff0000", "A", "", 200)).toHaveLength(2);
    expect(matchCatalog(catalog, "#ffffff", "", "", 200).map((p) => p.name)).toEqual([
      "Blanco",
      "Rojo",
      "Negro",
    ]);
  });
  it("places boundary colors in valid histogram bins and excludes achromatic hue", () => {
    const profile = distribution(catalog);
    expect(profile.hue.reduce((a, b) => a + b, 0)).toBe(1);
    expect(profile.saturation[0]).toBe(2);
    expect(profile.saturation[9]).toBe(1);
    expect(profile.lightness[0]).toBe(1);
    expect(profile.lightness[9]).toBe(1);
  });
});
describe("Encycolorpedia connector", () => {
  it("uses only official endpoints, escaped parameters, session bearer, and documented payloads", () => {
    const r = apiRequest(request);
    expect(r.url).toBe("https://api.encycolorpedia.com/v1/paints?limit=100&max_delta_e=5");
    expect(new Headers(r.init.headers).get("authorization")).toBe("Bearer test-token");
    expect(r.init.body).toBe('["635dd7"]');
    expect(r.init.redirect).toBe("error");
    expect(r.init.credentials).toBe("omit");
    const query = apiRequest({
      ...request,
      operation: "search",
      query: "red(200,255) & blue",
      brand: "RAL",
      offset: 20,
    });
    expect(new URL(query.url).searchParams.get("q")).toBe("red(200,255) & blue");
    expect(new URL(query.url).searchParams.get("offset")).toBe("20");
    expect(apiRequest({ ...request, operation: "convert" }).init.body).toBe('{"hex":"635dd7"}');
    for (const bad of [
      { token: "" },
      { token: "abc\nBearer x" },
      { delta: NaN },
      { delta: 0 },
      { offset: -1 },
      { color: "url(x)" },
    ])
      expect(() => apiRequest({ ...request, ...bad })).toThrow();
  });
  it("validates brands instead of trusting remote JSON", () => {
    expect(parseBrands([{ id: "1829", name: "1829", count: 113 }])).toHaveLength(1);
    for (const data of [{}, [{ id: "x", name: "x", count: -1 }], [null]])
      expect(() => parseBrands(data)).toThrow();
  });
  it("handles permission, quota, malformed and oversized replies without returning credentials", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    for (const status of [401, 403, 429, 500]) {
      fetcher.mockResolvedValueOnce(new Response("secret server detail", { status }));
      await expect(callPaintApi(request, new AbortController().signal)).rejects.toThrow(
        status === 401
          ? "token"
          : status === 403
            ? "acceso"
            : status === 429
              ? "limitado"
              : "HTTP 500",
      );
    }
    fetcher.mockResolvedValueOnce(new Response("not json"));
    await expect(callPaintApi(request, new AbortController().signal)).rejects.toThrow("JSON");
    fetcher.mockResolvedValueOnce(new Response("x".repeat(2_000_001)));
    await expect(callPaintApi(request, new AbortController().signal)).rejects.toThrow("2 MB");
    fetcher.mockResolvedValueOnce(new Response('{"635dd7":[]}'));
    await expect(callPaintApi(request, new AbortController().signal)).resolves.toEqual({
      "635dd7": [],
    });
  });
});
