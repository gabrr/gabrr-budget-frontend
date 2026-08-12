"use client";

import type { RefObject } from "react";

import { ActionButton } from "@/components/actions";
import {
  ConfidenceChip,
  ConfidenceRing,
  DisclosureChip,
  PassiveChip,
} from "@/components/chips";
import {
  confidencePercent,
  displayStatementFilename,
  formatAmount,
  formatJobDay,
  formatJobTime,
  formatTransactionDay,
  periodFromTransactions,
  roleTone,
  statementKindLabel,
  transactionTitle,
} from "../mappers";
import { useTransactions } from "../queries";
import type {
  Evidence,
  ImportJob,
  Transaction,
} from "../types";
import { ImportActivity } from "./import-activity";
import { jobStatusChip } from "./process-chip-meta";
import { LedgerState } from "./process-states";
import { ReportRoleChip, reportRoleLabel } from "./report-role-chip";
import { rememberEvidenceOpener } from "./transaction-inspector";
import styles from "./processes.module.css";

const PAGE_SIZES = [25, 50, 100] as const;
export type TransactionPageSize = (typeof PAGE_SIZES)[number];

type Props = {
  job: ImportJob;
  query: ReturnType<typeof useTransactions>;
  transactionPage: number;
  pageSize: TransactionPageSize;
  evidence: Evidence | null;
  activityHeadingRef: RefObject<HTMLHeadingElement | null>;
  periodHeadingRef: RefObject<HTMLHeadingElement | null>;
  ledgerScrollRef: RefObject<HTMLDivElement | null>;
  onEvidence: (evidence: Evidence) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: TransactionPageSize) => void;
  onChooseFileAgain: () => void;
  onDeleteRequest: (job: ImportJob, opener: HTMLButtonElement) => void;
};

export function TransactionLedger({ job, query, transactionPage, pageSize, evidence, activityHeadingRef, periodHeadingRef, ledgerScrollRef, onEvidence, onPageChange, onPageSizeChange, onChooseFileAgain, onDeleteRequest }: Props) {
  const allTransactions = query.data?.items ?? [];
  const total = allTransactions.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (transactionPage - 1) * pageSize + 1 : 0;
  const end = Math.min(transactionPage * pageSize, total);
  const visibleTransactions = allTransactions.slice(start ? start - 1 : 0, end);
  const period = periodFromTransactions(visibleTransactions);

  return (
    <section className={styles.ledger} data-mode={job.status === "done" ? "transactions" : "activity"} aria-labelledby="selected-file-title">
      <header className={styles.fileContext}>
        <div className={styles.fileTitle}>
          <h2 id="selected-file-title">{displayStatementFilename(job.original_filename)}</h2>
          <p>{job.status === "done" ? query.isPending ? "Loading transactions" : `${total} transactions · Imported ${formatJobDay(job)} at ${formatJobTime(job)}${query.isFetching ? " · Updating" : ""}` : job.status === "failed" ? "No transactions saved" : "Waiting to process"}</p>
        </div>
        <div className={styles.fileActions}>
          {confidencePercent(job.statement_kind_confidence) !== null && (
            <DisclosureChip
              aria-haspopup="dialog"
              aria-controls="process-evidence"
              aria-expanded={evidence?.kind === "statement"}
              leading={<ConfidenceRing value={confidencePercent(job.statement_kind_confidence)} />}
              label={statementKindLabel(job.statement_kind)}
              meta={`${confidencePercent(job.statement_kind_confidence)}%`}
              onClick={(event) => { rememberEvidenceOpener(event.currentTarget); onEvidence({ kind: "statement", job }); }}
            />
          )}
          {job.status === "done" ? null : <StatusBadge status={job.status} />}
          {(job.status === "done" || job.status === "failed") && (
            <ActionButton
              tone="danger"
              icon="/brand/icons/trash.svg"
              type="button"
              aria-label={`Delete ${displayStatementFilename(job.original_filename)}`}
              onClick={(event) => onDeleteRequest(job, event.currentTarget)}
            >
              Delete
            </ActionButton>
          )}
        </div>
      </header>

      {job.status === "done" ? (
        <>
          <div>
            <div className={styles.ledgerTools}>
              <div className={styles.period}><h3 ref={periodHeadingRef} tabIndex={-1}>{period.month}</h3><span>{period.year}</span></div>
              <AmountContext kind={job.statement_kind} />
            </div>
            <div className={styles.tableHead} aria-hidden="true">
              <span>Transaction</span><span>Report role</span><span>Confidence</span>
              <span>{job.statement_kind === "credit_card" ? "Added to invoice" : "Account movement"}</span><span />
            </div>
          </div>
          <div
            ref={ledgerScrollRef}
            className={styles.ledgerScroll}
            id="transaction-panel"
            role="region"
            aria-label="Transactions"
          >
            <TransactionBody
              query={query}
              items={visibleTransactions}
              statementKind={job.statement_kind}
              emptyLabel="No transactions were found for this statement."
              activeTransactionId={evidence?.kind === "transaction" ? evidence.transaction.id : null}
              onOpen={(transaction, opener) => {
                rememberEvidenceOpener(opener);
                onEvidence({ kind: "transaction", transaction, statementKind: job.statement_kind });
              }}
            />
          </div>
          <footer className={styles.ledgerFooter}>
            <label className={styles.rowsControl}>Rows<select aria-label="Transactions per page" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value) as TransactionPageSize)}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            <span className={styles.range}>{total ? `${start}-${end} of ${total}` : "0 transactions"}</span>
            <TransactionPager page={transactionPage} pages={pages} range={total ? `${start}-${end} of ${total}` : "0 transactions"} onChange={onPageChange} />
          </footer>
        </>
      ) : <ImportActivity ref={activityHeadingRef} job={job} onChooseFileAgain={onChooseFileAgain} />}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = jobStatusChip(status);
  return <PassiveChip label={meta.label} tone={meta.tone} icon={meta.icon} />;
}

function AmountContext({ kind }: { kind: string }) {
  const card = kind === "credit_card";
  return (
    <div className={styles.amountContext}>
      <span><strong>{card ? "Added to invoice" : "Account movement"}</strong><br />Source sign preserved</span>
      <span className={styles.help} role="img" aria-label="Amounts use the sign and currency returned by the source API; the frontend does not infer or reverse polarity.">?</span>
    </div>
  );
}

function TransactionBody({ query, items, statementKind, emptyLabel, onOpen, activeTransactionId }: { query: ReturnType<typeof useTransactions>; items: Transaction[]; statementKind: string; emptyLabel: string; onOpen: (transaction: Transaction, opener: HTMLButtonElement) => void; activeTransactionId: string | null }) {
  if (query.isPending && !query.data) return <LedgerState>Loading transactions…</LedgerState>;
  if (query.isError && !query.data) return <LedgerState role="alert"><span>{query.error.message}</span><button className={styles.textButton} type="button" onClick={() => void query.refetch()}>Retry</button></LedgerState>;
  if (!query.data?.items.length) return <LedgerState>{emptyLabel}</LedgerState>;

  const groups = new Map<string, Transaction[]>();
  items.forEach((transaction) => {
    const day = formatTransactionDay(transaction);
    groups.set(day, [...(groups.get(day) ?? []), transaction]);
  });
  return <>{query.isError && <div className={styles.cacheError} role="alert"><span>Showing cached transactions. The latest update failed.</span><button className={styles.textButton} type="button" onClick={() => void query.refetch()}>Retry</button></div>}{[...groups.entries()].map(([day, items]) => <section className={styles.transactionGroup} key={day}><h4 className={styles.transactionDay}>{day}</h4><ol className={styles.transactionList}>{items.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} statementKind={statementKind} expanded={activeTransactionId === transaction.id} onOpen={onOpen} />)}</ol></section>)}</>;
}

function TransactionRow({ transaction, statementKind, expanded, onOpen }: { transaction: Transaction; statementKind: string; expanded: boolean; onOpen: (transaction: Transaction, opener: HTMLButtonElement) => void }) {
  const confidence = confidencePercent(transaction.classification_confidence);
  const role = reportRoleLabel(transaction.report_bucket);
  const title = transactionTitle(transaction);
  const amount = formatAmount(transaction);
  const tone = roleTone(transaction.report_bucket);
  return (
    <li className={styles.transactionItem}>
      <button className={styles.transactionRow} type="button" aria-haspopup="dialog" aria-controls="process-evidence" aria-expanded={expanded} aria-label={`View ${title}: report role ${role}, ${confidence ?? "unknown"}% confidence, ${amount}`} onClick={(event) => onOpen(transaction, event.currentTarget)}>
        <span className={styles.merchantButton}><strong>{title}</strong>{transaction.description && transaction.description !== title.toUpperCase() && <span>{transaction.description}</span>}</span>
        <span className={styles.classificationRail}>
          <ReportRoleChip value={transaction.report_bucket} />
          <ConfidenceChip
            value={confidence}
            label={confidence === null ? "N/A" : `${confidence}%`}
            aria-label={confidence === null ? "Classification confidence unavailable" : `Classification confidence ${confidence} percent`}
            justifySelf="start"
          />
        </span>
        <strong className={`${styles.amount} ${tone === "income" ? styles.amountIncome : tone === "excluded" ? styles.amountExcluded : statementKind === "credit_card" ? styles.amountCredit : ""}`}>{amount}</strong>
        <span className={styles.inspectButton} aria-hidden="true" />
      </button>
    </li>
  );
}

function TransactionPager({ page, pages, range, onChange }: { page: number; pages: number; range: string; onChange: (page: number) => void }) {
  const first = Math.max(1, Math.min(page - 1, pages - 2));
  const numbered = Array.from({ length: Math.min(3, pages) }, (_, index) => first + index).filter((value) => value <= pages);
  return <nav className={styles.ledgerPagination} aria-label="Transaction pages"><button className={styles.pageButton} type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button><span className={`${styles.ledgerPagination} ${styles.numbered}`}>{numbered.map((number) => <button key={number} className={styles.pageButton} type="button" aria-current={number === page ? "page" : undefined} onClick={() => onChange(number)}>{number}</button>)}</span><span className={styles.mobileRange}>{range}</span><button className={styles.pageButton} type="button" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</button></nav>;
}
