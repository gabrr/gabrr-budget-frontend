import type { ReactNode } from "react";
import Image from "next/image";

import styles from "./processes.module.css";

export function InlineError({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className={styles.inlineError} role="alert">
      <span>{message}</span>
      {retry && (
        <button type="button" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function LedgerState({
  children,
  role,
}: {
  children: ReactNode;
  role?: "alert";
}) {
  return (
    <div className={styles.ledgerState} role={role}>
      {children}
    </div>
  );
}

export function LoadingLedger() {
  return (
    <section className={`${styles.ledger} ${styles.standaloneState}`}>
      <LedgerState>Loading your statements…</LedgerState>
    </section>
  );
}

export function EmptyLedger() {
  return (
    <section className={`${styles.ledger} ${styles.standaloneState}`}>
      <LedgerState>
        <strong>No statements yet</strong>
        <span>Import a PDF statement to see its transactions.</span>
      </LedgerState>
    </section>
  );
}

export function ErrorLedger({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className={`${styles.ledger} ${styles.standaloneState}`}>
      <LedgerState role="alert">
        <strong>Statements are unavailable</strong>
        <span>{message}</span>
        <button className={styles.textButton} type="button" onClick={onRetry}>
          Try again
        </button>
      </LedgerState>
    </section>
  );
}

export function UploadIcon() {
  return (
    <Image
      aria-hidden="true"
      src="/brand/icons/download-simple.svg"
      alt=""
      width={18}
      height={18}
    />
  );
}
