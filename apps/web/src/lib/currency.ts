export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  /** Rate relative to 1 USD */
  rate: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US", rate: 1 },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE", rate: 0.92 },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB", rate: 0.79 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN", rate: 83.5 },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE", rate: 3.67 },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar", locale: "en-CA", rate: 1.36 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU", rate: 1.53 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP", rate: 151.5 },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG", rate: 1.34 },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", locale: "de-CH", rate: 0.89 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN", rate: 7.24 },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "en-HK", rate: 7.82 },
  { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR", rate: 1325.0 },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE", rate: 10.45 },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO", rate: 10.62 },
  { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK", rate: 6.87 },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ", rate: 1.64 },
  { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA", rate: 18.35 },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR", rate: 5.05 },
  { code: "MXN", symbol: "Mex$", name: "Mexican Peso", locale: "es-MX", rate: 17.15 },
  { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH", rate: 36.0 },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY", rate: 4.68 },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH", rate: 56.2 },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID", rate: 15750 },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", locale: "vi-VN", rate: 24650 },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA", rate: 3.75 },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal", locale: "ar-QA", rate: 3.64 },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", locale: "ar-KW", rate: 0.31 },
  { code: "OMR", symbol: "﷼", name: "Omani Rial", locale: "ar-OM", rate: 0.38 },
  { code: "BHD", symbol: "د.ب", name: "Bahraini Dinar", locale: "ar-BH", rate: 0.38 },
];

export const CURRENCY_MAP = new Map(CURRENCIES.map((c) => [c.code, c]));

export const DEFAULT_CURRENCY = "INR";

export const STORAGE_KEY = "doloyal_currency";

export function convertAmount(
  amountInBase: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  if (fromCurrency === toCurrency) return amountInBase;
  const fromRate = CURRENCY_MAP.get(fromCurrency)?.rate;
  const toRate = CURRENCY_MAP.get(toCurrency)?.rate;
  if (!fromRate || !toRate) return amountInBase;
  const amountInUSD = amountInBase / fromRate;
  return amountInUSD * toRate;
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  compact = false,
): string {
  const info = CURRENCY_MAP.get(currencyCode);
  const locale = info?.locale ?? "en-US";
  const currency = currencyCode;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: currencyCode === "JPY" || currencyCode === "KRW" || currencyCode === "VND" || currencyCode === "IDR" ? 0 : 0,
    }).format(amount);
  } catch {
    return `${info?.symbol ?? currencyCode}${Math.round(amount).toLocaleString(locale)}`;
  }
}

export function formatCompactCurrency(amount: number, currencyCode: string): string {
  return formatCurrency(amount, currencyCode, true);
}