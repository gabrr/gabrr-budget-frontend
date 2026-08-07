"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";

import {
  confidencePercent,
  displayStatementFilename,
  formatJobDay,
  formatJobMonth,
  formatJobTime,
  statusLabel,
  statementKindLabel,
} from "../mappers";
import type { ImportJob } from "../types";
import { Ring } from "./process-states";
import styles from "./processes.module.css";

export const IMPORT_PAGE_SIZE = 6;

type StatementListProps = {
  jobs: ImportJob[];
  selectedJobId: string | null;
  newJobIds: Set<string>;
  clearingJobId: string | null;
  onSelect: (job: ImportJob) => void;
};

function PanelState({ children, role }: { children: ReactNode; role?: "alert" }) {
  return <div className={styles.panelState} role={role}>{children}</div>;
}

export function StatementGroups({ jobs, selectedJobId, newJobIds, clearingJobId, onSelect }: StatementListProps) {
  const groups = new Map<string, { month: string; year: number; day: string; jobs: ImportJob[] }>();
  jobs.forEach((job) => {
    const month = formatJobMonth(job);
    const day = formatJobDay(job);
    const key = `${month.key}|${day}`;
    const existing = groups.get(key);
    if (existing) existing.jobs.push(job);
    else groups.set(key, { ...month, day, jobs: [job] });
  });
  let previousMonth = "";

  return (
    <>
      {[...groups.entries()].map(([key, group]) => {
        const showMonth = group.month !== previousMonth;
        previousMonth = group.month;
        return (
          <section className={styles.dayGroup} key={key}>
            {showMonth && <h3 className={styles.monthLabel}>{group.month} <span>{group.year}</span></h3>}
            <h4 className={styles.dayLabel}>{group.day}</h4>
            <ol className={styles.statementList}>
              {group.jobs.map((job) => {
                const confidence = confidencePercent(job.statement_kind_confidence);
                const isNew = newJobIds.has(job.job_id) && job.status === "done";
                const filename = displayStatementFilename(job.original_filename);
                const visibleStatus = job.status === "done" ? null : statusLabel(job.status);
                return (
                  <li key={job.job_id}>
                    <button
                      className={styles.statementCard}
                      type="button"
                      aria-current={job.job_id === selectedJobId}
                      aria-label={[filename, isNew ? "New" : null, visibleStatus].filter(Boolean).join(", ")}
                      onClick={() => onSelect(job)}
                    >
                      <time className={styles.statementTime}>{formatJobTime(job)}</time>
                      <span className={styles.statementCopy}>
                        <strong>{filename}</strong>
                        {confidence !== null && (
                          <span className={styles.statementMeta}>
                            <span className={styles.kindMeter}><Ring value={confidence} />{statementKindLabel(job.statement_kind)} {confidence}%</span>
                          </span>
                        )}
                      </span>
                      {isNew && (
                        <span className={`${styles.newBadge} ${clearingJobId === job.job_id ? styles.clearingBadge : ""}`}>New</span>
                      )}
                      {visibleStatus ? (
                        <span className={`${styles.jobStatus} ${styles[job.status] ?? ""}`}>{visibleStatus}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </>
  );
}

export function ImportPager({ page, pages, count, onChange }: { page: number; pages: number; count: number; onChange: (page: number) => void }) {
  const start = count ? (page - 1) * IMPORT_PAGE_SIZE + 1 : 0;
  const end = Math.min(page * IMPORT_PAGE_SIZE, count);
  return (
    <footer className={styles.paneFooter}>
      <span className={styles.range}>{count ? `${start}-${end} of latest ${count}` : "No imports"}</span>
      <nav className={styles.pager} aria-label="Import pages">
        <button className={styles.pageButton} type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
        <span className={styles.range}>{page} / {pages}</span>
        <button className={styles.pageButton} type="button" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</button>
      </nav>
    </footer>
  );
}

export function StatementsPane({ loading, error, ...props }: StatementListProps & { loading: boolean; error: boolean; page: number; pages: number; count: number; onPageChange: (page: number) => void }) {
  return (
    <aside className={styles.statements} aria-labelledby="statements-title">
      <header className={styles.panelHeading}>
        <div><h2 id="statements-title">Statements</h2><span>{props.count ? `Latest ${props.count}` : "No imports"}</span></div>
        <p>Choose a source document.</p>
      </header>
      <div className={styles.statementScroll}>
        {loading ? <PanelState>Loading recent imports…</PanelState> : error && !props.count ? <PanelState role="alert">Recent imports could not be loaded.</PanelState> : props.jobs.length === 0 ? <PanelState>No statement imports yet.</PanelState> : <StatementGroups {...props} />}
      </div>
      <ImportPager page={props.page} pages={props.pages} count={props.count} onChange={props.onPageChange} />
    </aside>
  );
}

export function StatementChooser({ open, page, pages, count, onPageChange, onDismiss, ...props }: StatementListProps & { open: boolean; page: number; pages: number; count: number; onPageChange: (page: number) => void; onDismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={styles.importDialog}
      aria-labelledby="chooser-title"
      onCancel={(event) => {
        event.preventDefault();
        ref.current?.close();
      }}
      onClose={onDismiss}
    >
      <header className={styles.inspectorHeading}>
        <div><span>Import activity</span><h2 id="chooser-title">Choose a statement</h2></div>
        <button className={styles.closeButton} type="button" aria-label="Close statements" onClick={() => ref.current?.close()}><Image src="/brand/icons/x.svg" alt="" width={20} height={20} /></button>
      </header>
      <div className={styles.statementScroll}>
        {props.jobs.length ? <StatementGroups {...props} /> : <PanelState>No statement imports yet.</PanelState>}
      </div>
      <ImportPager page={page} pages={pages} count={count} onChange={onPageChange} />
    </dialog>
  );
}
