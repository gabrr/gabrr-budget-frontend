"use client";

import { Button } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

import { ProcessApiError } from "../api";
import { displayStatementFilename } from "../mappers";
import type { ImportJob } from "../types";
import styles from "./processes.module.css";

type Props = {
  job: ImportJob | null;
  transactionCount: number | null;
  deleting: boolean;
  error: Error | null;
  onConfirm: () => void;
  onDismiss: () => void;
};

function deletionError(error: Error | null) {
  if (!error) return null;
  if (error instanceof ProcessApiError && error.status === 409) {
    return "This statement is still processing and cannot be deleted.";
  }
  return "We couldn’t delete this statement. It is still listed.";
}

function transactionImpact(count: number | null) {
  if (count === null) return "Any imported transactions will also be removed.";
  if (count === 0) return "No imported transactions are currently attached.";
  if (count === 1) return "1 imported transaction will be removed.";
  return `${count} imported transactions will be removed.`;
}

export function DeleteStatementDialog({
  job,
  transactionCount,
  deleting,
  error,
  onConfirm,
  onDismiss,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (job && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => cancelRef.current?.focus({ preventScroll: true }));
    } else if (!job && dialog.open) {
      dialog.close();
    }
  }, [job]);

  if (!job) return null;

  const filename = displayStatementFilename(job.original_filename);
  const errorMessage = deletionError(error);
  const close = () => {
    if (!deleting) dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.importDialog} ${styles.deleteDialog}`}
      aria-labelledby="delete-statement-title"
      aria-describedby="delete-statement-description delete-statement-impact"
      aria-busy={deleting}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={onDismiss}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <header className={styles.inspectorHeading}>
        <div>
          <span>Permanent action</span>
          <h2 id="delete-statement-title">Delete {filename}?</h2>
        </div>
      </header>
      <div className={styles.deleteDialogBody}>
        <p id="delete-statement-description">
          This permanently deletes the statement, its uploaded file, and all imported
          transactions. Dashboard and report totals may change.
        </p>
        <p className={styles.deleteImpact} id="delete-statement-impact">
          {transactionImpact(transactionCount)} This cannot be undone.
        </p>
        {errorMessage && <p className={styles.inspectorError} role="alert">{errorMessage}</p>}
      </div>
      <footer className={styles.inspectorFooter}>
        <Button
          ref={cancelRef}
          className={styles.button}
          type="button"
          disabled={deleting}
          onClick={close}
        >
          Cancel
        </Button>
        <Button
          className={`${styles.button} ${styles.destructiveButton}`}
          type="button"
          loading={deleting}
          loadingText="Deleting…"
          onClick={onConfirm}
        >
          Delete statement
        </Button>
      </footer>
    </dialog>
  );
}
