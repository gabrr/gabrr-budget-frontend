export const categoryChipValues = [
  "food",
  "transportation",
  "health",
  "leisure",
  "needs",
  "fun",
  "donations",
  "clothing",
  "renting",
  "home",
  "company",
  "others",
] as const;

export type CategoryChipValue = (typeof categoryChipValues)[number];

export const bucketChipValues = [
  "income",
  "debt_installment",
  "fixed_cost",
  "living_cost",
  "excluded",
  "unknown",
] as const;

export type BucketChipValue = (typeof bucketChipValues)[number];

export type TransactionChipClickHandler = () => void;
