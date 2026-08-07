"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import type { ImportJob } from "./types";

const STORAGE_KEY = "acetate.processes.new-imports.v1";
const MAX_STORED_JOB_IDS = 100;

type ImportAttention = {
  watchedJobIds: string[];
  unreadJobIds: string[];
};

const SERVER_ATTENTION: ImportAttention = {
  watchedJobIds: [],
  unreadJobIds: [],
};

let clientAttention: ImportAttention | null = null;
const listeners = new Set<() => void>();

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string"))]
    .slice(-MAX_STORED_JOB_IDS);
}

function readAttention(): ImportAttention {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return SERVER_ATTENTION;
    const parsed = JSON.parse(value) as Partial<ImportAttention>;
    return {
      watchedJobIds: stringArray(parsed.watchedJobIds),
      unreadJobIds: stringArray(parsed.unreadJobIds),
    };
  } catch {
    return SERVER_ATTENTION;
  }
}

function writeAttention(value: ImportAttention) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // The badge remains session-local if browser storage is unavailable.
  }
}

function sameAttention(left: ImportAttention, right: ImportAttention) {
  return left.watchedJobIds.join("|") === right.watchedJobIds.join("|") &&
    left.unreadJobIds.join("|") === right.unreadJobIds.join("|");
}

function getClientSnapshot() {
  clientAttention ??= readAttention();
  return clientAttention;
}

function getServerSnapshot() {
  return SERVER_ATTENTION;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const syncOtherTab = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    clientAttention = readAttention();
    emitChange();
  };
  window.addEventListener("storage", syncOtherTab);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", syncOtherTab);
  };
}

export function useNewImportBadges(jobs: ImportJob[], selectedJobId: string | null) {
  const attention = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const updateAttention = useCallback(
    (update: (current: ImportAttention) => ImportAttention) => {
      const current = getClientSnapshot();
      const next = update(current);
      if (sameAttention(current, next)) return;
      clientAttention = next;
      writeAttention(next);
      emitChange();
    },
    [],
  );

  useEffect(() => {
    if (attention.watchedJobIds.length === 0) return;

    const statusById = new Map(jobs.map((job) => [job.job_id, job.status]));
    const completed = attention.watchedJobIds.filter(
      (jobId) => statusById.get(jobId) === "done",
    );
    const failed = attention.watchedJobIds.filter(
      (jobId) => statusById.get(jobId) === "failed",
    );
    if (completed.length === 0 && failed.length === 0) return;

    const terminalIds = new Set([...completed, ...failed]);
    updateAttention((current) => ({
      watchedJobIds: current.watchedJobIds.filter((jobId) => !terminalIds.has(jobId)),
      unreadJobIds: stringArray([
        ...current.unreadJobIds.filter((jobId) => jobId !== selectedJobId),
        ...completed.filter((jobId) => jobId !== selectedJobId),
      ]),
    }));
  }, [attention.watchedJobIds, jobs, selectedJobId, updateAttention]);

  const trackUpload = useCallback((jobId: string) => {
    updateAttention((current) => ({
      ...current,
      watchedJobIds: stringArray([...current.watchedJobIds, jobId]),
    }));
  }, [updateAttention]);

  const markRead = useCallback((jobId: string) => {
    updateAttention((current) => ({
      ...current,
      unreadJobIds: current.unreadJobIds.filter((candidate) => candidate !== jobId),
    }));
  }, [updateAttention]);

  const newJobIds = useMemo(
    () => new Set(attention.unreadJobIds),
    [attention.unreadJobIds],
  );

  return { markRead, newJobIds, trackUpload };
}
