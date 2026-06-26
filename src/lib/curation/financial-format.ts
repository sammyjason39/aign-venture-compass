import type { FinancialCurrency, FinancialUnit } from "./types";

const UNIT_SUFFIX: Record<FinancialUnit, string> = {
  juta: "jt",
  ribu: "rb",
  penuh: "",
};

export function currencyPrefix(currency: FinancialCurrency): string {
  return currency === "USD" ? "$" : "Rp";
}

export function unitSuffix(unit: FinancialUnit): string {
  return UNIT_SUFFIX[unit] ?? "";
}

function fmtNumber(value: number): string {
  const abs = Math.abs(value);
  const decimals = abs > 0 && abs < 100 && !Number.isInteger(value) ? 1 : 0;
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Money value in the model's chosen magnitude, e.g. "Rp13.400 jt". */
export function formatMoney(
  value: number | null | undefined,
  currency: FinancialCurrency,
  unit: FinancialUnit,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const suffix = unitSuffix(unit);
  const sign = value < 0 ? "−" : "";
  const body = fmtNumber(Math.abs(value));
  return `${sign}${currencyPrefix(currency)}${body}${suffix ? " " + suffix : ""}`;
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${fmtNumber(value)}%`;
}

export function formatX(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${fmtNumber(value)}×`;
}

export function formatNum(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return fmtNumber(value);
}
