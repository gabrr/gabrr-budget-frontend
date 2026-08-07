"use client";

import { Box, Button } from "@chakra-ui/react";
import Image from "next/image";

import { formatMoney, retirementSpending } from "../model";
import type {
  GoalScenario,
  ScenarioBasis,
  WealthProjection,
} from "../types";
import styles from "../dashboard.module.css";

type GoalDockProps = {
  basis: ScenarioBasis;
  projection: WealthProjection;
  scenario: GoalScenario;
  onEdit: () => void;
};

export function GoalDock({ basis, projection, scenario, onEdit }: GoalDockProps) {
  const spending = retirementSpending(scenario, basis);
  const spendingBasis = scenario.lifestylePercent === 100
    ? "Same spending as today"
    : `${scenario.lifestylePercent}% of today’s spending`;

  return (
    <Box className={styles.goalDock}>
      <section className={styles.goalSummary} aria-labelledby="retirement-goal-title">
        <header className={styles.goalStageMeta}>
          <span id="retirement-goal-title">Retirement</span>
          <Button
            type="button"
            unstyled
            aria-haspopup="dialog"
            className={styles.goalStageAction}
            onClick={onEdit}
          >
            <Image src="/brand/icons/pencil-simple.svg" alt="" width={14} height={14} />
            <span>Edit goal</span>
          </Button>
        </header>
        <div className={styles.goalStageReading}>
          <div className={styles.goalStageOutcome}>
            <p>Retire at {scenario.retirementAge}</p>
            <strong aria-label={`Estimated portfolio target at retirement: ${formatMoney(projection.target, basis.currency)}`}>
              {formatMoney(projection.target, basis.currency, true)}
            </strong>
            <span>Estimated portfolio target</span>
          </div>
          <div className={styles.goalStageInterpretation}>
            <span>Monthly retirement spending</span>
            <strong>
              {formatMoney(spending, basis.currency)}
              <small>/month</small>
            </strong>
            <p>
              <span>{spendingBasis}</span>
              <span>No monthly investing after {scenario.retirementAge}</span>
            </p>
          </div>
        </div>
        <footer className={styles.goalStageBasis}>
          <span><i aria-hidden="true" />Goal path in Wealth Preview above</span>
          <span>Estimate in today&apos;s {basis.currency}</span>
        </footer>
      </section>

      <button
        className={styles.addGoalCard}
        type="button"
        disabled
        aria-label="Add a new goal. Currently unavailable because only retirement goals are supported."
      >
        <span>Additional goals</span>
        <strong><Image src="/brand/icons/plus.svg" alt="" width={20} height={20} />Add a new goal</strong>
      </button>
    </Box>
  );
}
