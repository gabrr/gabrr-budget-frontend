"use client";

import {
  Button,
  Field,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { DashboardApiError } from "../api";
import { formatMoney } from "../model";
import type { GoalScenario, ScenarioBasis, WealthCheckpoint } from "../types";
import styles from "../dashboard.module.css";

type CheckpointDraft = {
  date: string;
  amount: string;
};

type GoalEditorProps = {
  basis: ScenarioBasis;
  scenario: GoalScenario;
  checkpoints: WealthCheckpoint[];
  onClose: () => void;
  onApplyPreview: (scenario: GoalScenario) => void;
  onSave: (
    scenario: GoalScenario,
    checkpoint: CheckpointDraft | null,
  ) => Promise<void>;
  onDeleteCheckpoint: (checkpointId: string) => Promise<void>;
};

export function GoalEditor({
  basis,
  scenario,
  checkpoints,
  onClose,
  onApplyPreview,
  onSave,
  onDeleteCheckpoint,
}: GoalEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(scenario);
  const [checkpoint, setCheckpoint] = useState<CheckpointDraft>({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingCheckpointId, setConfirmingCheckpointId] = useState<string | null>(null);
  const [deletingCheckpointId, setDeletingCheckpointId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const isAgeValid = Number.isInteger(draft.retirementAge) &&
    draft.retirementAge > basis.currentAge &&
    draft.retirementAge <= 75;
  const checkpointAmount = checkpoint.amount.trim();
  const parsedCheckpointDate = new Date(`${checkpoint.date}T00:00:00Z`);
  const isCheckpointDateValid = /^\d{4}-\d{2}-\d{2}$/.test(checkpoint.date) &&
    !Number.isNaN(parsedCheckpointDate.getTime()) &&
    parsedCheckpointDate.toISOString().slice(0, 10) === checkpoint.date;
  const isCheckpointValid = checkpointAmount === "" || (
    Number.isFinite(Number(checkpointAmount)) &&
    Number(checkpointAmount) >= 0 &&
    isCheckpointDateValid
  );
  const newestCheckpoints = [...checkpoints].sort((left, right) => {
    const dateOrder = right.checkpoint_date.localeCompare(left.checkpoint_date);
    if (dateOrder !== 0) return dateOrder;
    return (right.created_at ?? "").localeCompare(left.created_at ?? "");
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAgeValid || !isCheckpointValid) return;
    setIsSaving(true);
    setSubmitError(null);
    try {
      await onSave(draft, checkpointAmount ? checkpoint : null);
      onClose();
    } catch (error) {
      if (error instanceof DashboardApiError && error.status === 409 && checkpointAmount) {
        setSubmitError(
          `A ${basis.currency} checkpoint already exists on ${formatCheckpointDate(checkpoint.date)}. Delete that checkpoint below before adding a replacement.`,
        );
      } else {
        setSubmitError(error instanceof Error ? error.message : "Could not save the goal");
      }
    } finally {
      setIsSaving(false);
    }
  }

  function applyPreview() {
    if (!isAgeValid) return;
    onApplyPreview(draft);
    onClose();
  }

  function focusWithinDialog(elementId: string) {
    window.requestAnimationFrame(() => {
      const element = dialogRef.current?.querySelector<HTMLElement>(`#${CSS.escape(elementId)}`);
      element?.focus({ preventScroll: true });
    });
  }

  async function handleDelete(checkpointItem: WealthCheckpoint) {
    setDeletingCheckpointId(checkpointItem.id);
    setDeleteErrors((current) => ({ ...current, [checkpointItem.id]: "" }));
    try {
      await onDeleteCheckpoint(checkpointItem.id);
      setConfirmingCheckpointId(null);
      focusWithinDialog("checkpoint-list-title");
    } catch (error) {
      setDeleteErrors((current) => ({
        ...current,
        [checkpointItem.id]: error instanceof Error
          ? error.message
          : "Could not delete this checkpoint.",
      }));
      focusWithinDialog(`confirm-delete-${checkpointItem.id}`);
    } finally {
      setDeletingCheckpointId(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.sidePanel}
      aria-labelledby="goal-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <form onSubmit={handleSubmit}>
        <header className={styles.layerHeading}>
          <div>
            <span>Retirement goal</span>
            <h2 id="goal-editor-title">Edit goal</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className={styles.panelScroll}>
          <section className={styles.panelSection} aria-labelledby="retirement-settings-title">
            <div className={styles.panelSectionHeading}>
              <h3 id="retirement-settings-title">Retirement scenario</h3>
              <span>Preview only, kept for this visit</span>
            </div>
            <Stack gap="5">
              <Field.Root invalid={!isAgeValid} required>
                <Field.Label>Retirement age</Field.Label>
                <Input
                  type="number"
                  min={basis.currentAge + 1}
                  max="75"
                  value={draft.retirementAge}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setDraft((current) => ({
                      ...current,
                      retirementAge: Number(value),
                    }));
                  }}
                />
                <Field.HelperText>Current scenario age: {basis.currentAge}</Field.HelperText>
                <Field.ErrorText>Choose an age from {basis.currentAge + 1} to 75.</Field.ErrorText>
              </Field.Root>

              <RangeField
                label="Lifestyle at retirement"
                min={100}
                max={200}
                value={draft.lifestylePercent}
                valueLabel={`${draft.lifestylePercent}%`}
                help={`${formatMoney(basis.averageMonthlySpending * draft.lifestylePercent / 100, basis.currency)} per month`}
                onChange={(value) => setDraft((current) => ({ ...current, lifestylePercent: value }))}
              />
              <SwitchRow
                label="Income"
                detail="+4.0%/year"
                checked={draft.incomeGrowth}
                onChange={(checked) => setDraft((current) => ({ ...current, incomeGrowth: checked }))}
              />
              <SwitchRow
                label="Spending"
                detail="+3.2%/year"
                checked={draft.spendingGrowth}
                onChange={(checked) => setDraft((current) => ({ ...current, spendingGrowth: checked }))}
              />
              <SwitchRow
                label="Inflation"
                detail="5.0%/year"
                checked={draft.inflation}
                onChange={(checked) => setDraft((current) => ({ ...current, inflation: checked }))}
              />
            </Stack>
          </section>

          <section className={styles.panelSection} aria-labelledby="saved-assumptions-title">
            <div className={styles.panelSectionHeading}>
              <h3 id="saved-assumptions-title">Saved assumptions</h3>
              <span>Saved to your account</span>
            </div>
            <RangeField
              label="Annual return"
              min={6}
              max={21}
              value={Math.round(draft.annualReturn * 100)}
              valueLabel={`${Math.round(draft.annualReturn * 100)}%`}
              help="Used for saved projections and this retirement preview."
              onChange={(value) => setDraft((current) => ({ ...current, annualReturn: value / 100 }))}
            />
            <div className={styles.checkpointFields}>
              <Text as="h4">Add a wealth checkpoint</Text>
              <Text>Optional. Leave the amount empty to keep the current checkpoint.</Text>
              <Field.Root
                invalid={checkpointAmount !== "" && !isCheckpointDateValid}
                required={checkpointAmount !== ""}
              >
                <Field.Label>Date</Field.Label>
                <Input
                  type="date"
                  value={checkpoint.date}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCheckpoint((current) => ({ ...current, date: value }));
                  }}
                />
                <Field.ErrorText>Choose a valid checkpoint date.</Field.ErrorText>
              </Field.Root>
              <Field.Root invalid={!isCheckpointValid}>
                <Field.Label>Wealth amount ({basis.currency})</Field.Label>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={checkpoint.amount}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCheckpoint((current) => ({ ...current, amount: value }));
                  }}
                />
                <Field.ErrorText>Enter zero or a positive amount.</Field.ErrorText>
              </Field.Root>
            </div>

            <div className={styles.checkpointManager}>
              <div className={styles.checkpointManagerHeading}>
                <div>
                  <Text as="h4" id="checkpoint-list-title" tabIndex={-1}>Wealth checkpoints</Text>
                  <Text>Newest first, saved to your account</Text>
                </div>
                <span>{newestCheckpoints.length}</span>
              </div>
              {newestCheckpoints.length === 0 ? (
                <p className={styles.checkpointListEmpty}>No wealth checkpoints saved yet.</p>
              ) : (
                <ul className={styles.checkpointList}>
                  {newestCheckpoints.map((checkpointItem) => {
                    const amount = formatMoney(
                      Number(checkpointItem.wealth_amount),
                      checkpointItem.currency,
                    );
                    const date = formatCheckpointDate(checkpointItem.checkpoint_date);
                    const isConfirming = confirmingCheckpointId === checkpointItem.id;
                    return (
                      <li key={checkpointItem.id}>
                        <div className={styles.checkpointRow}>
                          <div>
                            <strong>{amount}</strong>
                            <span>{date}</span>
                          </div>
                          {!isConfirming ? (
                            <Button
                              id={`delete-checkpoint-${checkpointItem.id}`}
                              type="button"
                              size="xs"
                              variant="ghost"
                              color="danger"
                              disabled={deletingCheckpointId !== null}
                              onClick={() => {
                                setConfirmingCheckpointId(checkpointItem.id);
                                focusWithinDialog(`confirm-delete-${checkpointItem.id}`);
                              }}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                        {isConfirming ? (
                          <div
                            className={styles.deleteConfirmation}
                            role="group"
                            aria-label={`Confirm deletion of ${amount} checkpoint from ${date}`}
                          >
                            <p>Delete the {amount} checkpoint from {date}?</p>
                            <div>
                              <Button
                                id={`confirm-delete-${checkpointItem.id}`}
                                type="button"
                                size="xs"
                                background="#8b4a46"
                                color="#fff"
                                loading={deletingCheckpointId === checkpointItem.id}
                                onClick={() => { void handleDelete(checkpointItem); }}
                              >
                                Yes, delete
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                disabled={deletingCheckpointId === checkpointItem.id}
                                onClick={() => {
                                  setConfirmingCheckpointId(null);
                                  focusWithinDialog(`delete-checkpoint-${checkpointItem.id}`);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        {deleteErrors[checkpointItem.id] ? (
                          <p className={styles.checkpointDeleteError} role="alert">
                            {deleteErrors[checkpointItem.id]}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {submitError ? <Text className={styles.formError} role="alert">{submitError}</Text> : null}
        </div>

        <footer className={styles.panelActions}>
          <Button
            type="button"
            width="full"
            variant="outline"
            disabled={!isAgeValid || isSaving}
            onClick={applyPreview}
          >
            Apply preview
          </Button>
          <Button
            type="submit"
            width="full"
            background="#101010"
            color="#ffffff"
            _hover={{ background: "#292929" }}
            _disabled={{ cursor: "not-allowed", opacity: 0.55 }}
            loading={isSaving}
            disabled={!isAgeValid || !isCheckpointValid}
          >
            Save assumptions/checkpoint
          </Button>
        </footer>
      </form>
    </dialog>
  );
}

function formatCheckpointDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(parsed);
}

function RangeField({
  label,
  min,
  max,
  value,
  valueLabel,
  help,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  valueLabel: string;
  help: string;
  onChange: (value: number) => void;
}) {
  const progress = `${((value - min) / Math.max(1, max - min)) * 100}%`;
  return (
    <div className={styles.rangeField}>
      <div><label>{label}</label><output>{valueLabel}</output></div>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        aria-valuetext={valueLabel}
        style={{ "--range-progress": progress } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <p>{help}</p>
    </div>
  );
}

function SwitchRow({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.switchRow}>
      <span>{label}<b>{detail}</b></span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}
