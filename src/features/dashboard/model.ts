import type {
  GoalScenario,
  MonthlyCapacityMonth,
  MonthlyCapacityReport,
  ProjectionPoint,
  ScenarioBasis,
  WealthCheckpoint,
  WealthProjection,
} from "./types";

export const DEFAULT_GOAL: GoalScenario = {
  retirementAge: 50,
  lifestylePercent: 100,
  annualReturn: 0.08,
  incomeGrowth: false,
  spendingGrowth: false,
  inflation: true,
};

export const WEALTH_HORIZONS = [
  0, 3, 6, 9, 12, 18, 24, 36, 60, 120, 180, 240,
] as const;

export function reportAnchorMonth(now = new Date()) {
  return monthKey(addUtcMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), -12));
}

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addUtcMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

export function toNumber(value: string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value: number, currency: string, compact = false) {
  if (!Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function formatChartMoney(value: number, currency: string) {
  if (!Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(value);
}

export function formatMonth(key: string, long = true) {
  const date = new Date(`${key}-01T00:00:00Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(date);
}

export function latestCheckpoint(checkpoints: WealthCheckpoint[]) {
  return checkpoints.at(-1) ?? null;
}

export function buildScenarioBasis(
  report: MonthlyCapacityReport,
  checkpoints: WealthCheckpoint[],
  now = new Date(),
): ScenarioBasis {
  const checkpoint = latestCheckpoint(checkpoints);
  const reportCheckpoint = report.wealth_checkpoints.at(-1);
  const currentWealth = checkpoint
    ? toNumber(checkpoint.wealth_amount)
    : reportCheckpoint
      ? toNumber(reportCheckpoint.wealth_amount)
      : 0;

  const currentKey = monthKey(now);
  const observed = report.months
    .filter((month) => month.month <= currentKey && toNumber(month.income) > 0)
    .slice(-12);
  const source = observed.length ? observed : report.months.filter((month) => toNumber(month.income) > 0).slice(0, 12);
  const divisor = Math.max(1, source.length);
  const average = (pick: (month: MonthlyCapacityMonth) => number) =>
    source.reduce((sum, month) => sum + pick(month), 0) / divisor;

  return {
    currentAge: 27,
    currentYear: now.getUTCFullYear(),
    currentMonth: now.getUTCMonth(),
    currentWealth,
    averageMonthlyIncome: average((month) => toNumber(month.income)),
    averageMonthlySpending: average(
      (month) =>
        toNumber(month.fixed_costs) +
        toNumber(month.living_costs),
    ),
    averageMonthlyInvestment: average((month) =>
      Math.max(0, toNumber(month.investment_capacity)),
    ),
    currency: report.currency,
    inflationRate: 0.05,
    incomeTrend: 0.04,
    spendingTrend: 0.032,
  };
}

function realReturn(settings: GoalScenario, basis: ScenarioBasis) {
  const inflation = settings.inflation ? basis.inflationRate : 0;
  return (1 + settings.annualReturn) / (1 + inflation) - 1;
}

export function retirementSpending(settings: GoalScenario, basis: ScenarioBasis) {
  const years = settings.retirementAge - basis.currentAge;
  const growth = settings.spendingGrowth
    ? (1 + basis.spendingTrend) ** years
    : 1;
  return basis.averageMonthlySpending * growth * (settings.lifestylePercent / 100);
}

export function targetWealth(settings: GoalScenario, basis: ScenarioBasis) {
  const rate = realReturn(settings, basis);
  if (rate <= 0) return Number.NaN;
  return (retirementSpending(settings, basis) * 12) / rate;
}

function futureValue(
  contribution: number,
  settings: GoalScenario,
  basis: ScenarioBasis,
) {
  const totalMonths = (settings.retirementAge - basis.currentAge) * 12;
  const monthlyRate = (1 + realReturn(settings, basis)) ** (1 / 12) - 1;
  let wealth = basis.currentWealth;
  for (let month = 0; month < totalMonths; month += 1) {
    wealth = wealth * (1 + monthlyRate) + contribution;
  }
  return wealth;
}

function requiredMonthly(settings: GoalScenario, basis: ScenarioBasis) {
  const target = targetWealth(settings, basis);
  if (!Number.isFinite(target) || settings.retirementAge <= basis.currentAge) {
    return Number.NaN;
  }
  if (futureValue(0, settings, basis) >= target) return 0;
  let low = 0;
  let high = 1_000;
  while (futureValue(high, settings, basis) < target && high < 1_000_000) {
    high *= 2;
  }
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const midpoint = (low + high) / 2;
    if (futureValue(midpoint, settings, basis) < target) low = midpoint;
    else high = midpoint;
  }
  return Math.ceil(((low + high) / 2) / 10) * 10;
}

function buildPath(
  contributionValue: number,
  settings: GoalScenario,
  basis: ScenarioBasis,
  growContribution: boolean,
) {
  const points: ProjectionPoint[] = [];
  const totalMonths = (settings.retirementAge - basis.currentAge) * 12;
  const monthlyRate = (1 + realReturn(settings, basis)) ** (1 / 12) - 1;
  const monthlyGrowth = growContribution && settings.incomeGrowth
    ? (1 + basis.incomeTrend) ** (1 / 12) - 1
    : 0;
  let wealth = basis.currentWealth;
  let contribution = contributionValue;

  for (let month = 0; month <= totalMonths; month += 1) {
    const date = new Date(Date.UTC(basis.currentYear, basis.currentMonth + month, 1));
    points.push({
      months: month,
      age: basis.currentAge + month / 12,
      year: date.getUTCFullYear(),
      monthIndex: date.getUTCMonth(),
      value: wealth,
    });
    wealth = wealth * (1 + monthlyRate) + contribution;
    contribution *= 1 + monthlyGrowth;
  }
  return points;
}

export function buildWealthProjection(
  settings: GoalScenario,
  basis: ScenarioBasis,
): WealthProjection {
  const required = requiredMonthly(settings, basis);
  return {
    required,
    target: targetWealth(settings, basis),
    current: buildPath(
      basis.averageMonthlyInvestment,
      settings,
      basis,
      true,
    ),
    goal: buildPath(required, { ...settings, incomeGrowth: false }, basis, false),
  };
}

export function activeHorizons(settings: GoalScenario, basis: ScenarioBasis) {
  const total = (settings.retirementAge - basis.currentAge) * 12;
  return [...new Set([...WEALTH_HORIZONS, total])]
    .filter((months) => months <= total)
    .sort((a, b) => a - b);
}

export function horizonLabel(
  months: number,
  retirementAge: number,
  totalMonths: number,
  compact = false,
) {
  if (months === 0) return "Today";
  if (months === totalMonths) return `Age ${retirementAge}`;
  if (months < 12 || months === 18) return compact ? `${months} mo` : `${months} months`;
  const years = months / 12;
  return compact ? `${years} yr` : `${years} ${years === 1 ? "year" : "years"}`;
}

export function niceStep(range: number, targetDivisions = 4) {
  const rough = Math.max(1, range / targetDivisions);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

export function describeCapacityMonth(month: MonthlyCapacityMonth, currency: string) {
  const investment = toNumber(month.investment_capacity);
  return `${month.label}. Income ${formatMoney(toNumber(month.income), currency)}. Fixed costs ${formatMoney(toNumber(month.fixed_costs), currency)}. Living costs ${formatMoney(toNumber(month.living_costs), currency)}. Debt installments ${formatMoney(toNumber(month.debt_installments), currency)}. ${investment < 0 ? "Capacity shortfall" : "Investment capacity"} ${formatMoney(Math.abs(investment), currency)}.`;
}

export function hasFinancialActivity(report: MonthlyCapacityReport) {
  return report.months.some((month) => [
    month.income,
    month.fixed_costs,
    month.living_costs,
    month.debt_installments,
    month.investment_capacity,
  ].some((value) => toNumber(value) !== 0));
}
