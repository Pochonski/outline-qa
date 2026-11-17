import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test as base, expect } from "@playwright/test";
import type {
  APIRequestContext,
  APIResponse,
  Browser,
  BrowserContext,
  Page,
  TestInfo,
} from "@playwright/test";
import { z } from "zod";
import pg from "pg";

export interface QaDocument {
  id: string;
  title: string;
  text?: string;
  url: string;
}

export interface QaComment {
  id: string;
  data: { content?: Array<{ content?: Array<{ text?: string }> }> };
  updatedAt: string;
  resolvedAt: string | null;
}

export interface QaResponse {
  method: string;
  path: string;
  status: number;
  request: string;
  response: string;
}

const actorSchema = z.object({ id: z.string(), token: z.string() });
const actorsSchema = z.object({
  teamId: z.string(),
  collectionId: z.string(),
  actors: z.object({
    admin: actorSchema,
    editor: actorSchema,
    editorB: actorSchema,
    viewer: actorSchema,
    guest: actorSchema,
  }),
});
type Actors = z.infer<typeof actorsSchema>;
type Actor = keyof Actors["actors"];
const documentSchema = z.object({
  data: z.object({
    id: z.string(),
    title: z.string(),
    text: z.string().optional(),
    url: z.string(),
  }),
});
const commentSchema = z.object({
  data: z.object({
    id: z.string(),
    data: z.object({
      content: z
        .array(
          z.object({
            content: z
              .array(z.object({ text: z.string().optional() }))
              .optional(),
          })
        )
        .optional(),
    }),
    updatedAt: z.string(),
    resolvedAt: z.string().nullable(),
  }),
});

/** Parses a document returned by Outline's API.
 * @param response the API response.
 *
 * @returns the validated document.
 */
export async function readDocument(response: APIResponse): Promise<QaDocument> {
  return documentSchema.parse(await response.json()).data;
}

/** Parses a comment returned by Outline's API.
 * @param response the API response.
 *
 * @returns the validated comment.
 */
export async function readComment(response: APIResponse): Promise<QaComment> {
  return commentSchema.parse(await response.json()).data;
}

/** Collects isolated actors, API calls and browser evidence for one QA case. */
export class QaContext {
  public readonly calls: QaResponse[] = [];
  public readonly contexts: BrowserContext[] = [];
  public readonly documents: string[] = [];

  public constructor(
    public readonly actors: Actors,
    private readonly request: APIRequestContext,
    private readonly browser: Browser,
    private readonly info: TestInfo
  ) {}

  /** Sends a real RPC request with a chosen QA role and records redacted evidence.
   * @param route the Outline RPC route.
   *
   * @param body the request body.
   * @param actor the authenticated role, or null for an anonymous request.
   *
   * @returns the API response.
   */
  public async post(
    route: string,
    body: object = {},
    actor: Actor | null = "editor"
  ): Promise<APIResponse> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-api-version": "4",
    };
    if (actor) {
      headers.Authorization = `Bearer ${this.actors.actors[actor].token}`;
    }
    const response = await this.request.post(`/api/${route}`, {
      data: body,
      headers,
    });
    this.calls.push({
      method: "POST",
      path: `/api/${route}`,
      status: response.status(),
      request: JSON.stringify(body),
      response: (await response.text()).slice(0, 12000),
    });
    return response;
  }

  /** Creates an independent published document for a test.
   * @param text the initial document content.
   *
   * @returns the persisted document.
   */
  public async createDocument(
    text = "Párrafo inicial de QA."
  ): Promise<QaDocument> {
    const response = await this.post("documents.create", {
      collectionId: this.actors.collectionId,
      title: `QA ${randomUUID()}`,
      text,
      publish: true,
    });
    expect(response.status(), await response.text()).toBe(200);
    const document = await readDocument(response);
    this.documents.push(document.id);
    return document;
  }

  /** Opens a real authenticated browser session for an editor.
   * @param document the document to open.
   *
   * @param actor the session role.
   * @param configure optional network instrumentation before navigation.
   *
   * @returns the page with its editable ProseMirror document ready.
   */
  public async openDocument(
    document: QaDocument,
    actor: Actor = "editor",
    configure?: (context: BrowserContext) => Promise<void>
  ): Promise<Page> {
    const context = await this.browser.newContext({
      baseURL: "http://localhost:3100",
      locale: "es-ES",
      viewport: { width: 1440, height: 1000 },
      recordVideo: {
        dir: this.info.outputPath(`video-${actor}`),
        size: { width: 1280, height: 720 },
      },
    });
    this.contexts.push(context);
    await context.addCookies([
      {
        name: "accessToken",
        value: this.actors.actors[actor].token,
        url: "http://localhost:3100",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
    await configure?.(context);
    const page = await context.newPage();
    page.on("request", (request) => {
      if (request.url().includes("/api/documents.update")) {
        this.calls.push({
          method: request.method(),
          path: "/api/documents.update",
          status: 0,
          request: request.postData() || "",
          response: "browser request",
        });
      }
    });
    await page.goto(document.url);
    await expect(
      page.locator('.ProseMirror[contenteditable="true"]').first()
    ).toBeVisible({ timeout: 30000 });
    return page;
  }

  /** Reads persisted soft-delete state from the dedicated QA database.
   * @param id the comment identifier.
   *
   * @returns the persisted deletion timestamp.
   */
  public async deletedAt(id: string): Promise<string | null> {
    if (
      new URL(process.env.DATABASE_URL || "").pathname !== "/outline_playwright"
    ) {
      throw new Error("La consulta requiere la base de QA.");
    }
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    try {
      const result = await client.query<{ deletedAt: Date | null }>(
        'SELECT "deletedAt" FROM comments WHERE id = $1',
        [id]
      );
      const timestamp = result.rows[0]?.deletedAt?.toISOString() || null;
      this.calls.push({
        method: "SELECT",
        path: "QA comments.deletedAt",
        status: 200,
        request: id,
        response: JSON.stringify({ deletedAt: timestamp }),
      });
      return timestamp;
    } finally {
      await client.end();
    }
  }

  /** Captures browser and API evidence and releases the test's resources.
   * @returns a promise that resolves after resources are released.
   */
  public async finish(): Promise<void> {
    for (const [index, context] of this.contexts.entries()) {
      const pages = context.pages();
      for (const [pageIndex, page] of pages.entries()) {
        if (!page.isClosed()) {
          const capture = this.info.outputPath(
            `browser-${index}-${pageIndex}.png`
          );
          try {
            await page.screenshot({ path: capture, timeout: 5000 });
            await this.info.attach(`browser-${index}-${pageIndex}`, {
              path: capture,
              contentType: "image/png",
            });
          } catch {
            // A navigation failure is already recorded in the test result.
          }
        }
      }
      const failed = this.info.status !== "passed";
      const trace = this.info.outputPath(`trace-${index}.zip`);
      await context.tracing.stop(failed ? { path: trace } : {});
      await context.close();
      if (failed) {
        await this.info.attach(`trace-${index}`, {
          path: trace,
          contentType: "application/zip",
        });
        for (const [pageIndex, page] of pages.entries()) {
          const video = page.video();
          if (video) {
            await this.info.attach(`video-${index}-${pageIndex}`, {
              path: await video.path(),
              contentType: "video/webm",
            });
          }
        }
      }
    }
    const log = JSON.stringify(
      this.calls,
      (key, value: string | number | object) =>
        /token|password|secret|authorization|cookie/i.test(key)
          ? "[REDACTED]"
          : value,
      2
    );
    await this.info.attach("api-calls.json", {
      body: Buffer.from(log),
      contentType: "application/json",
    });
    for (const id of this.documents) {
      await this.post("documents.delete", { id }, "admin");
    }
  }
}

export const test = base.extend<{ qa: QaContext }>({
  qa: async ({ request, browser }, runFixture, info) => {
    const actors = actorsSchema.parse(
      JSON.parse(await fs.readFile(path.resolve(".qa/actors.json"), "utf8"))
    );
    const qa = new QaContext(actors, request, browser, info);
    await runFixture(qa);
    await qa.finish();
  },
});

export { expect } from "@playwright/test";
