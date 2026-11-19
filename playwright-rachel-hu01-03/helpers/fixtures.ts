import fs from "node:fs";
import path from "node:path";
import { test as base, expect, APIRequestContext, APIResponse } from "@playwright/test";

type Call = {
  method: string;
  path: string;
  status: number;
  authenticated: boolean;
  request?: unknown;
  response?: unknown;
  location?: string;
};

export type ApiResult = { status: number; body: any; headers: Record<string, string>; raw: APIResponse };

export class Api {
  readonly calls: Call[] = [];
  constructor(private request: APIRequestContext) {}

  private record(call: Call) {
    this.calls.push(call);
  }

  private async finish(method: string, path: string, key: string | null, data: unknown, res: APIResponse): Promise<ApiResult> {
    const text = await res.text();
    let body: any = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* la respuesta no es JSON (por ejemplo, una imagen) */
    }
    this.record({
      method,
      path,
      status: res.status(),
      authenticated: key !== null,
      request: data,
      ...(res.headers()["location"] ? { location: res.headers()["location"] } : {}),
      response: typeof body === "string" ? `(${res.headers()["content-type"] ?? "sin tipo"}, ${text.length} bytes)` : body,
    });
    return { status: res.status(), body, headers: res.headers(), raw: res };
  }

  /** POST /api/<ruta> con o sin llave de API. */
  async post(route: string, key: string | null, data: Record<string, unknown> = {}) {
    const res = await this.request.post(`/api/${route}`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      data,
    });
    return this.finish("POST", `/api/${route}`, key, data, res);
  }

  /** GET /api/<ruta> sin seguir redirecciones, para poder verificar el 302 y su destino. */
  async get(route: string, query: Record<string, string>, key: string | null = null) {
    const qs = new URLSearchParams(query).toString();
    const res = await this.request.get(`/api/${route}?${qs}`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      maxRedirects: 0,
    });
    return this.finish("GET", `/api/${route}?${qs}`, key, undefined, res);
  }
}

/** Recorta respuestas largas para que la evidencia sea legible y liviana. */
function shrink(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.length > 160 ? `${value.slice(0, 160)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 3).map((v) => shrink(v, depth + 1));
  if (value && typeof value === "object") {
    if (depth >= 4) return "{…}";
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, shrink(v, depth + 1)])
    );
  }
  return value;
}

/** Oculta llaves, tokens y firmas antes de guardar la evidencia. */
function redact(value: unknown): unknown {
  const text = JSON.stringify(value ?? null, (k, v) =>
    /token|secret|apikey|authorization|jwt/i.test(k) && typeof v === "string" ? "***" : v
  );
  return shrink(
    JSON.parse(
      text
        .replace(/ol_api_[a-f0-9]+/g, "ol_api_***")
        .replace(/([?&]token=)[a-f0-9]{16,}/g, "$1***")
    )
  );
}

export const test = base.extend<{ api: Api }>({
  api: async ({ request }, use, testInfo) => {
    const api = new Api(request);
    await use(api);

    // Evidencia: registro JSON de las llamadas HTTP de la prueba (sin credenciales).
    const code =
      testInfo.annotations.find((a) => a.type === "qatlas")?.description ?? testInfo.title;
    const estadoQatlas = testInfo.annotations.find((a) => a.type === "qatlas-estado")?.description;
    const motivo = testInfo.annotations.find((a) => a.type === "qatlas-motivo")?.description;
    const evidence = {
      caso: code,
      prueba: testInfo.title,
      estado: testInfo.status,
      ...(estadoQatlas ? { estadoQatlas, motivo } : {}),
      llamadas: redact(api.calls),
    };
    const dir = path.join(process.cwd(), "test-results", "evidencia");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${code}.json`);
    fs.writeFileSync(file, JSON.stringify(evidence, null, 2));
    await testInfo.attach(`evidencia-${code}`, { path: file, contentType: "application/json" });
  },
});

/**
 * Opciones de cada prueba: la anotación "qatlas" vincula la prueba con el caso
 * de QAtlas (el reporter oficial la lee) y la etiqueta facilita filtrar con --grep.
 */
export const caso = (code: string) => ({
  annotation: { type: "qatlas", description: code },
  tag: `@${code}`,
});

export { expect };
