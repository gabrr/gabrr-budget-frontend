"use client";

import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { toaster } from "@/components/toaster";

import {
  displayStatementFilename,
  formatJobDay,
  formatJobTime,
  jobTimestamp,
  statementKindLabel,
} from "../mappers";
import {
  useDeleteImportJob,
  useImportJobs,
  useTransactions,
  useUploadStatement,
} from "../queries";
import type {
  Evidence,
  ImportJob,
  Transaction,
} from "../types";
import { useNewImportBadges } from "../use-new-import-badges";
import { DeleteStatementDialog } from "./delete-statement-dialog";
import { ImportHandoff } from "./import-handoff";
import { EmptyLedger, ErrorLedger, InlineError, LoadingLedger, UploadIcon } from "./process-states";
import { IMPORT_PAGE_SIZE, StatementChooser, StatementsPane } from "./statements-pane";
import { restoreEvidenceFocus, TransactionInspector } from "./transaction-inspector";
import { TransactionLedger, type TransactionPageSize } from "./transaction-ledger";
import styles from "./processes.module.css";

const IMPORT_LIMIT = 50;

function newestFirst(jobs: ImportJob[] | undefined) {
  return [...(jobs ?? [])].sort(
    (left, right) => jobTimestamp(right).valueOf() - jobTimestamp(left).valueOf(),
  );
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function ProcessesScreen() {
  const importsQuery = useImportJobs(IMPORT_LIMIT);
  const jobs = useMemo(() => newestFirst(importsQuery.data), [importsQuery.data]);
  const [requestedJobId, setRequestedJobId] = useState<string | null>(null);
  const [importPage, setImportPage] = useState(1);
  const [transactionPageState, setTransactionPageState] = useState({
    jobId: null as string | null,
    page: 1,
  });
  const [pageSize, setPageSize] = useState<TransactionPageSize>(50);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [handoffJob, setHandoffJob] = useState<ImportJob | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadValidation, setUploadValidation] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [clearingJobId, setClearingJobId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImportJob | null>(null);
  const idempotencyKeys = useRef(new Map<string, string>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const activityHeadingRef = useRef<HTMLHeadingElement>(null);
  const periodHeadingRef = useRef<HTMLHeadingElement>(null);
  const ledgerScrollRef = useRef<HTMLDivElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const deleteOpenerRef = useRef<HTMLButtonElement | null>(null);
  const shouldRestoreEvidenceFocusRef = useRef(false);
  const shouldRestoreChooserFocusRef = useRef(false);
  const selectedJobId = jobs.some((job) => job.job_id === requestedJobId)
    ? requestedJobId
    : jobs[0]?.job_id ?? null;
  const selectedJob = jobs.find((job) => job.job_id === selectedJobId) ?? null;
  const uploadMutation = useUploadStatement();
  const deleteMutation = useDeleteImportJob();
  const { markRead, newJobIds, trackUpload } = useNewImportBadges(jobs, selectedJobId);
  const importPages = Math.max(1, Math.ceil(jobs.length / IMPORT_PAGE_SIZE));
  const currentImportPage = Math.min(importPage, importPages);
  const visibleJobs = jobs.slice(
    (currentImportPage - 1) * IMPORT_PAGE_SIZE,
    currentImportPage * IMPORT_PAGE_SIZE,
  );
  const transactionsQuery = useTransactions(
    selectedJob?.status === "done" ? selectedJob.job_id : null,
  );
  const transactionPages = Math.max(
    1,
    Math.ceil((transactionsQuery.data?.items.length ?? 0) / pageSize),
  );
  const transactionPage = Math.min(
    transactionPageState.jobId === selectedJobId ? transactionPageState.page : 1,
    transactionPages,
  );

  useEffect(() => {
    if (evidence !== null || !shouldRestoreEvidenceFocusRef.current) return;
    const timeout = window.setTimeout(() => {
      shouldRestoreEvidenceFocusRef.current = false;
      restoreEvidenceFocus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [evidence]);

  useEffect(() => {
    if (chooserOpen || !shouldRestoreChooserFocusRef.current) return;
    const opener = changeButtonRef.current;
    const timeout = window.setTimeout(() => {
      shouldRestoreChooserFocusRef.current = false;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [chooserOpen]);

  function dismissEvidence() {
    shouldRestoreEvidenceFocusRef.current = true;
    setEvidence(null);
  }

  function openChooser() {
    shouldRestoreChooserFocusRef.current = false;
    setChooserOpen(true);
  }

  function dismissChooser() {
    shouldRestoreChooserFocusRef.current = true;
    setChooserOpen(false);
  }

  function selectJob(job: ImportJob, fromChooser = false) {
    setRequestedJobId(job.job_id);
    setTransactionPageState({ jobId: job.job_id, page: 1 });
    setEvidence(null);
    if (newJobIds.has(job.job_id)) {
      setClearingJobId(job.job_id);
      window.setTimeout(() => {
        markRead(job.job_id);
        setClearingJobId(null);
      }, 220);
    }
    setAnnouncement(`${displayStatementFilename(job.original_filename)} selected.`);
    if (fromChooser) dismissChooser();
  }

  function changeTransactionPage(nextPage: number) {
    setTransactionPageState({ jobId: selectedJobId, page: nextPage });
    requestAnimationFrame(() => {
      ledgerScrollRef.current?.scrollTo({ top: 0 });
      periodHeadingRef.current?.focus({ preventScroll: true });
    });
    const total = transactionsQuery.data?.items.length ?? 0;
    const start = total ? (nextPage - 1) * pageSize + 1 : 0;
    const end = Math.min(nextPage * pageSize, total);
    setAnnouncement(total ? `Showing transactions ${start} to ${end} of ${total}.` : "No transactions.");
  }

  function handleTransactionPatched(
    transaction: Transaction,
  ) {
    const merchant = transaction.merchant_name || transaction.merchant || "Transaction";
    setAnnouncement(`${merchant} updated.`);
  }

  function requestDelete(job: ImportJob, opener: HTMLButtonElement) {
    deleteOpenerRef.current = opener;
    deleteMutation.reset();
    setDeleteTarget(job);
  }

  function dismissDelete() {
    if (deleteMutation.isPending) return;
    setDeleteTarget(null);
    deleteMutation.reset();
    requestAnimationFrame(() => {
      if (deleteOpenerRef.current?.isConnected) {
        deleteOpenerRef.current.focus({ preventScroll: true });
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget || deleteMutation.isPending) return;
    const filename = displayStatementFilename(deleteTarget.original_filename);
    const targetIndex = jobs.findIndex((job) => job.job_id === deleteTarget.job_id);
    const remainingJobs = jobs.filter((job) => job.job_id !== deleteTarget.job_id);
    const fallbackJob = remainingJobs[Math.min(targetIndex, remainingJobs.length - 1)] ?? null;
    const fallbackIndex = fallbackJob
      ? remainingJobs.findIndex((job) => job.job_id === fallbackJob.job_id)
      : -1;

    deleteMutation.mutate(deleteTarget.job_id, {
      onSuccess: () => {
        setRequestedJobId(fallbackJob?.job_id ?? null);
        setImportPage(fallbackIndex >= 0 ? Math.floor(fallbackIndex / IMPORT_PAGE_SIZE) + 1 : 1);
        setTransactionPageState({ jobId: fallbackJob?.job_id ?? null, page: 1 });
        setEvidence(null);
        setDeleteTarget(null);
        setAnnouncement(`${filename} deleted.`);
        toaster.create({
          type: "success",
          title: "Statement deleted",
          description: `${filename} and its transactions were removed.`,
          meta: { closable: true },
        });
        requestAnimationFrame(() => {
          if (!fallbackJob) importButtonRef.current?.focus({ preventScroll: true });
          else if (fallbackJob.status === "done") periodHeadingRef.current?.focus({ preventScroll: true });
          else activityHeadingRef.current?.focus({ preventScroll: true });
        });
      },
    });
  }

  function beginUpload(file: File) {
    setUploadValidation(null);
    if (!isPdf(file)) {
      setUploadValidation("Choose a PDF statement.");
      return;
    }
    setUploadFile(file);
    const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
    let key = idempotencyKeys.current.get(fingerprint);
    if (!key) {
      key = `statement-${crypto.randomUUID()}`;
      idempotencyKeys.current.set(fingerprint, key);
    }
    uploadMutation.mutate(
      { file, idempotencyKey: key },
      {
        onSuccess: (accepted) => {
          trackUpload(accepted.job_id);
          setImportPage(1);
          setHandoffJob(accepted);
          setAnnouncement(`${displayStatementFilename(accepted.original_filename || file.name)} added.`);
        },
      },
    );
  }

  function viewAcceptedJob() {
    if (!handoffJob) return;
    setRequestedJobId(handoffJob.job_id);
    markRead(handoffJob.job_id);
    setTransactionPageState({ jobId: handoffJob.job_id, page: 1 });
    setImportPage(1);
    setHandoffJob(null);
    requestAnimationFrame(() => activityHeadingRef.current?.focus({ preventScroll: true }));
  }

  return (
    <Box as="main" className={styles.main} id="main">
      <Box className={styles.page}>
        <Flex as="header" className={styles.workspaceHeading}>
          <Box><Heading as="h1">Processes</Heading><Text>Browse imported statements and classifications.</Text></Box>
          <Box className={styles.actions}>
            <Button
              ref={importButtonRef}
              className={styles.importButton}
              type="button"
              aria-label="Import statement"
              aria-describedby="import-file-purpose"
              loading={uploadMutation.isPending}
              loadingText="Adding statement"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon /><span>Import statement</span>
            </Button>
            <span className={styles.srOnly} id="import-file-purpose">Choose a PDF statement to add to Statements.</span>
            <input
              ref={fileInputRef}
              className={styles.srOnly}
              hidden
              type="file"
              accept=".pdf,application/pdf"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) beginUpload(file);
                event.target.value = "";
              }}
            />
          </Box>
        </Flex>

        {(uploadValidation || uploadMutation.isError) && (
          <InlineError
            message={uploadValidation || (uploadMutation.error instanceof Error ? uploadMutation.error.message : "Could not add the statement.")}
            retry={uploadMutation.isError && uploadFile ? () => beginUpload(uploadFile) : undefined}
          />
        )}

        <section className={styles.mobileContext} aria-label="Selected statement">
          <div>
            <span>Selected statement</span>
            <strong>{selectedJob ? displayStatementFilename(selectedJob.original_filename) : "No statement selected"}</strong>
            {selectedJob ? (
              <small>
                Imported {formatJobDay(selectedJob)} at {formatJobTime(selectedJob)} · {statementKindLabel(selectedJob.statement_kind)}
              </small>
            ) : null}
          </div>
          <button ref={changeButtonRef} className={`${styles.button} ${styles.compactButton}`} type="button" onClick={openChooser}>Change</button>
        </section>

        <section className={styles.workbench} id="process-workbench" aria-label="Statement workspace">
          <StatementsPane
            loading={importsQuery.isPending}
            error={importsQuery.isError}
            jobs={visibleJobs}
            selectedJobId={selectedJobId}
            newJobIds={newJobIds}
            clearingJobId={clearingJobId}
            page={currentImportPage}
            pages={importPages}
            count={jobs.length}
            onSelect={selectJob}
            onPageChange={setImportPage}
          />
          <section className={styles.detailArea} aria-label="Selected import">
            {importsQuery.isPending ? <LoadingLedger /> : importsQuery.isError && jobs.length === 0 ? <ErrorLedger message={importsQuery.error.message} onRetry={() => void importsQuery.refetch()} /> : !selectedJob ? <EmptyLedger /> : (
              <TransactionLedger
                job={selectedJob}
                query={transactionsQuery}
                transactionPage={transactionPage}
                pageSize={pageSize}
                evidence={evidence}
                activityHeadingRef={activityHeadingRef}
                periodHeadingRef={periodHeadingRef}
                ledgerScrollRef={ledgerScrollRef}
                onEvidence={(nextEvidence) => {
                  shouldRestoreEvidenceFocusRef.current = false;
                  setEvidence(nextEvidence);
                }}
                onPageChange={changeTransactionPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setTransactionPageState({ jobId: selectedJobId, page: 1 });
                }}
                onChooseFileAgain={() => fileInputRef.current?.click()}
                onDeleteRequest={requestDelete}
              />
            )}
            {importsQuery.isError && jobs.length > 0 && <InlineError message="Showing cached imports. The latest update could not be loaded." retry={() => void importsQuery.refetch()} />}
            {importsQuery.isFetching && !importsQuery.isPending && <span className={styles.cacheStatus}>Updating imports…</span>}
          </section>
        </section>
      </Box>

      <TransactionInspector
        evidence={evidence}
        jobId={selectedJobId}
        onDismiss={dismissEvidence}
        onTransactionPatched={handleTransactionPatched}
      />
      <StatementChooser
        open={chooserOpen}
        jobs={visibleJobs}
        selectedJobId={selectedJobId}
        newJobIds={newJobIds}
        clearingJobId={clearingJobId}
        page={currentImportPage}
        pages={importPages}
        count={jobs.length}
        onSelect={(job) => selectJob(job, true)}
        onPageChange={setImportPage}
        onDismiss={dismissChooser}
      />
      <ImportHandoff job={handoffJob} onDismiss={() => setHandoffJob(null)} onView={viewAcceptedJob} returnFocusRef={importButtonRef} />
      <DeleteStatementDialog
        job={deleteTarget}
        transactionCount={deleteTarget?.job_id === selectedJobId ? transactionsQuery.data?.total ?? null : null}
        deleting={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={confirmDelete}
        onDismiss={dismissDelete}
      />
      <p className={styles.srOnly} aria-live="polite">{announcement}</p>
    </Box>
  );
}
