// Runs side effects (action logs, emails) after the response so APIs answer fast,
// while waitUntil keeps the Vercel function alive until they finish.
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { waitUntil } from "@vercel/functions";
import { collection, doc, setDoc, type DocumentReference } from "firebase/firestore";
import type { Request, Response, NextFunction } from "express";
import db from "../configs/firebase.js";

interface PendingLog {
  ref: DocumentReference;
  data: object;
  createdAt: number;
}

interface RequestContext {
  requestId: string;
  method: string;
  endpoint: string;
  startedAt: number;
  res: Response;
  responseTimeMs: number | null;
  pendingLogs: PendingLog[];
}

const store = new AsyncLocalStorage<RequestContext>();

const writeLog = (log: PendingLog, ctx: RequestContext | undefined) =>
  setDoc(log.ref, {
    ...log.data,
    // Extra status fields so every log shows the full outcome of the API call it belongs to
    request_id: ctx?.requestId ?? null,
    api_method: ctx?.method ?? null,
    api_endpoint: ctx?.endpoint ?? null,
    api_status_code: ctx?.res.statusCode ?? null,
    api_response_time_ms: ctx?.responseTimeMs ?? null,
    elapsed_ms: ctx ? log.createdAt - ctx.startedAt : null,
    logged_after_response: ctx ? log.createdAt - ctx.startedAt > (ctx.responseTimeMs ?? Infinity) : null,
  }).catch((e) => console.error("❌ Failed to write action log:", e));

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const ctx: RequestContext = {
    requestId: randomUUID(),
    method: req.method,
    endpoint: req.originalUrl.split("?")[0] ?? req.originalUrl,
    startedAt: Date.now(),
    res,
    responseTimeMs: null,
    pendingLogs: [],
  };
  let done!: () => void;
  waitUntil(new Promise<void>((resolve) => (done = resolve)));

  const flush = () => {
    if (ctx.responseTimeMs !== null) return;
    ctx.responseTimeMs = Date.now() - ctx.startedAt;
    const logs = ctx.pendingLogs.splice(0);
    Promise.all(logs.map((log) => writeLog(log, ctx))).finally(done);
  };
  res.once("finish", flush);
  res.once("close", flush);

  store.run(ctx, next);
};

// Drop-in for `addDoc(collection(db, "actionLogs"), data)`: returns the new ref at once,
// the write happens once the response is sent (so it can record the final status code).
export const addActionLog = (data: object): DocumentReference => {
  const log: PendingLog = { ref: doc(collection(db, "actionLogs")), data, createdAt: Date.now() };
  const ctx = store.getStore();
  if (ctx && ctx.responseTimeMs === null) ctx.pendingLogs.push(log);
  else waitUntil(writeLog(log, ctx));
  return log.ref;
};

// Runs a task without making the response wait for it.
export const runInBackground = (task: () => Promise<unknown>): void => {
  waitUntil(task().catch((e) => console.error("❌ Background task failed:", e)));
};

// Fire-and-forget fetch, used for failure-notification mails nobody reads the response of.
export const backgroundFetch = (url: string, init?: RequestInit): void => {
  runInBackground(() => fetch(url, init));
};
