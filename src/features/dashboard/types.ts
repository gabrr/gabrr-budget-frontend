export type WealthCheckpoint = {
  id: string;
  checkpoint_date: string;
  wealth_amount: string;
  currency: string;
  created_at?: string;
  updated_at?: string;
};

export type WealthCheckpointsResponse = {
  checkpoints: WealthCheckpoint[];
};

export type ProjectionSettings = {
  average_annual_return_multiplier: string;
  is_default: boolean;
};

export type MonthlyCapacityMonth = {
  month: string;
  label: string;
  income: string;
  living_costs: string;
  fixed_costs: string;
  debt_installments: string;
  investment_capacity: string;
  unused_capacity: string;
  capacity_ceiling: string;
  projected_wealth: string | null;
  has_debt_pressure: boolean;
  has_debt_drop: boolean;
  has_investment_capacity: boolean;
};

export type MonthlyCapacityReport = {
  currency: string;
  average_annual_return_multiplier: string;
  wealth_checkpoints: Array<{ date: string; wealth_amount: string }>;
  months: MonthlyCapacityMonth[];
};

export type MonthlyCapacityParams = {
  anchorMonth: string;
  months: number;
  currency: string;
  includeDrafts: boolean;
};

export type GoalScenario = {
  retirementAge: number;
  lifestylePercent: number;
  annualReturn: number;
  incomeGrowth: boolean;
  spendingGrowth: boolean;
  inflation: boolean;
};

export type ScenarioBasis = {
  currentAge: number;
  currentYear: number;
  currentMonth: number;
  currentWealth: number;
  averageMonthlyIncome: number;
  averageMonthlySpending: number;
  averageMonthlyInvestment: number;
  currency: string;
  inflationRate: number;
  incomeTrend: number;
  spendingTrend: number;
};

export type ProjectionPoint = {
  months: number;
  age: number;
  year: number;
  monthIndex: number;
  value: number;
};

export type WealthProjection = {
  required: number;
  target: number;
  current: ProjectionPoint[];
  goal: ProjectionPoint[];
};
