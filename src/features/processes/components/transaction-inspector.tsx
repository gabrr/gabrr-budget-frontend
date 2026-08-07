"use client";

import { Button, Field } from "@chakra-ui/react";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  confidencePercent,
  displayStatementFilename,
  formatAmount,
  formatJobDay,
  formatJobTime,
  formatTransactionDate,
  statementKindLabel,
  titleCase,
  transactionTitle,
} from "../mappers";
import { ProcessApiError } from "../api";
import { usePatchTransaction } from "../queries";
import type {
  Evidence,
  ImportJob,
  ReportBucket,
  Transaction,
  TransactionNature,
  TransactionPatch,
} from "../types";
import styles from "./processes.module.css";

const reportRoles: ReadonlyArray<{ value: ReportBucket; label: string }> = [
  { value: "income", label: "Income" },
  { value: "debt_installment", label: "Debt installment" },
  { value: "fixed_cost", label: "Fixed cost" },
  { value: "living_cost", label: "Living cost" },
  { value: "excluded", label: "Excluded" },
  { value: "unknown", label: "Unknown" },
];

const transactionNatures: ReadonlyArray<{ value: TransactionNature; label: string }> = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
  { value: "refund", label: "Refund" },
  { value: "card_payment", label: "Card payment" },
  { value: "unknown", label: "Unknown" },
];

let evidenceOpener: HTMLButtonElement | null = null;

export function rememberEvidenceOpener(opener: HTMLButtonElement) {
  evidenceOpener = opener;
}

export function restoreEvidenceFocus() {
  if (evidenceOpener?.isConnected) {
    evidenceOpener.setAttribute("aria-expanded", "false");
    evidenceOpener.focus({ preventScroll: true });
  }
  evidenceOpener = null;
}

export function TransactionInspector({
  evidence,
  jobId,
  onDismiss,
  onTransactionPatched,
}: {
  evidence: Evidence | null;
  jobId: string | null;
  onDismiss: () => void;
  onTransactionPatched: (
    transaction: Transaction,
  ) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !evidence || dialog.open) return;
    dialog.showModal();
    requestAnimationFrame(() => closeRef.current?.focus());
  }, [evidence]);

  if (!evidence) return null;
  const transaction = evidence.kind === "transaction" ? evidence.transaction : null;
  const job = evidence.kind === "statement" ? evidence.job : null;
  const confidence = confidencePercent(
    transaction?.classification_confidence ?? job?.statement_kind_confidence ?? null,
  );
  const title = transaction
    ? transactionTitle(transaction)
    : statementKindLabel(job?.statement_kind ?? "unknown");
  const amount = transaction
    ? formatAmount(transaction)
    : confidence === null
      ? "Not assessed"
      : `${confidence}% match`;
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className={styles.inspector}
      id="process-evidence"
      aria-labelledby="inspector-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={onDismiss}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <header className={styles.inspectorHeading}>
        <div>
          <span>{transaction ? "Transaction details" : "Statement detection"}</span>
          <h2 id="inspector-title">{title}</h2>
        </div>
        <button
          ref={closeRef}
          className={styles.closeButton}
          type="button"
          aria-label="Close inspector"
          onClick={close}
        >
          <Image src="/brand/icons/x.svg" alt="" width={20} height={20} />
        </button>
      </header>
      {transaction && jobId ? (
        <TransactionEditor
          key={transaction.id}
          transaction={transaction}
          jobId={jobId}
          amount={amount}
          confidence={confidence}
          onClose={close}
          onPatched={onTransactionPatched}
        />
      ) : (
        <StatementEvidence job={job!} amount={amount} confidence={confidence} />
      )}
    </dialog>
  );
}

function TransactionEditor({
  transaction,
  jobId,
  amount,
  confidence,
  onClose,
  onPatched,
}: {
  transaction: Transaction;
  jobId: string;
  amount: string;
  confidence: number | null;
  onClose: () => void;
  onPatched: (transaction: Transaction) => void;
}) {
  const initialRole = toReportBucket(transaction.report_bucket);
  const initialNature = toTransactionNature(transaction.transaction_nature);
  const [reportRole, setReportRole] = useState<ReportBucket>(initialRole);
  const [nature, setNature] = useState<TransactionNature>(initialNature);
  const mutation = usePatchTransaction();
  const dirty = reportRole !== initialRole || nature !== initialNature;

  function dirtyPatch(): TransactionPatch {
    return {
      ...(reportRole !== initialRole ? { report_bucket: reportRole } : {}),
      ...(nature !== initialNature ? { transaction_nature: nature } : {}),
    };
  }

  async function submit() {
    try {
      const updated = await mutation.mutateAsync({
        jobId,
        transactionId: transaction.id,
        patch: dirtyPatch(),
      });
      onPatched(updated);
      onClose();
    } catch {
      // Mutation state renders a scoped error while preserving local edits.
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dirty) void submit();
  }

  const mutationError = transactionMutationError(mutation.error);

  return (
    <form className={styles.inspectorForm} onSubmit={handleSubmit}>
      <div className={styles.inspectorBody}>
        <p className={styles.inspectorAmount}>{amount}</p>
        <div className={styles.editorFields}>
          <Field.Root>
            <Field.Label>Report role</Field.Label>
            <select
              className={styles.inspectorSelect}
              value={reportRole}
              disabled={mutation.isPending}
              onChange={(event) => {
                setReportRole(event.currentTarget.value as ReportBucket);
              }}
            >
              {reportRoles.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <Field.HelperText>Controls how this transaction contributes to Dashboard reports.</Field.HelperText>
          </Field.Root>
          <Field.Root>
            <Field.Label>Transaction nature</Field.Label>
            <select
              className={styles.inspectorSelect}
              value={nature}
              disabled={mutation.isPending}
              onChange={(event) => setNature(event.currentTarget.value as TransactionNature)}
            >
              {transactionNatures.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <Field.HelperText>Describes the movement without changing its source amount.</Field.HelperText>
          </Field.Root>
          <div className={styles.readonlyField}>
            <span>Category</span>
            <strong>{titleCase(transaction.category)}</strong>
            <p>Read-only for now because category options are not connected.</p>
          </div>
        </div>
        <dl className={styles.facts}>
          <Fact label="Imported text" value={transaction.description || "Unavailable"} />
          <Fact label="Date" value={formatTransactionDate(transaction)} />
          <Fact label="Classification" value={confidence === null ? "Not assessed" : `${confidence}%`} />
          <Fact label="Source" value={transaction.classification_source === "user" ? "User override" : titleCase(transaction.classification_source, "System")} />
        </dl>
        <section className={styles.reason}>
          <h3>Why this classification</h3>
          <p>{transaction.classification_reason || "No classification reason was provided."}</p>
        </section>
        <p className={styles.basis}>Confidence applies to the inferred nature, category, and report role.</p>
        {mutationError ? <p className={styles.inspectorError} role="alert">{mutationError}</p> : null}
      </div>
      <footer className={styles.inspectorFooter}>
        <Button
          type="submit"
          variant="outline"
          disabled={!dirty || mutation.isPending}
          loading={mutation.isPending}
        >
          Save changes
        </Button>
      </footer>
    </form>
  );
}

function StatementEvidence({
  job,
  amount,
  confidence,
}: {
  job: ImportJob;
  amount: string;
  confidence: number | null;
}) {
  return (
    <div className={styles.inspectorBody}>
      <p className={styles.inspectorAmount}>{amount}</p>
      <dl className={styles.facts}>
        <Fact label="Imported file" value={displayStatementFilename(job.original_filename)} />
        <Fact label="Imported" value={`${formatJobDay(job)} at ${formatJobTime(job)}`} />
        <Fact label="Evidence type" value="Document type" />
        <Fact label="Statement kind" value={statementKindLabel(job.statement_kind)} />
        <Fact label="Classification" value={confidence === null ? "Not assessed" : `${confidence}%`} />
        <Fact label="Source" value="Not exposed" />
      </dl>
      <section className={styles.reason}>
        <h3>Why this classification</h3>
        <p>{statementReason(job.statement_kind)}</p>
      </section>
      <p className={styles.basis}>This score describes document-type detection only. It is separate from transaction classification confidence.</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function toReportBucket(value: string): ReportBucket {
  return reportRoles.some((role) => role.value === value)
    ? value as ReportBucket
    : "unknown";
}

function toTransactionNature(value: string): TransactionNature {
  return transactionNatures.some((nature) => nature.value === value)
    ? value as TransactionNature
    : "unknown";
}

function transactionMutationError(error: Error | null) {
  if (!error) return null;
  if (error instanceof ProcessApiError && error.status === 404) {
    return "This transaction no longer exists. Close the inspector to refresh the list.";
  }
  if (error instanceof ProcessApiError && error.status === 422) {
    return error.message;
  }
  return "Your changes were not saved. Check your connection and try again.";
}

function statementReason(kind?: string) {
  return kind && kind !== "unknown"
    ? "The API does not expose document-detection reasoning for this import."
    : "The import has not supplied enough evidence to assess the statement type.";
}
