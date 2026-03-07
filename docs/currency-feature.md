# Currency Behavior

This document describes how currency is handled in SajiloKhata.

## 1. Storage and Math

- Expenses persist money in integer cents using `amountCents`.
- Display conversion to decimal happens in API responses and frontend formatting.
- Currency code is stored per expense (`currencyCode`).

## 2. User Preference

- User default currency is stored in:
  - `user.preferences.currency`
- Personal expense forms default to this preference.

## 3. Group Currency

- Group expenses can be created with a selected currency code.
- Group UI surfaces indicate when group currency differs from personal preference.

## 4. Receipt Scanner Currency

- OCR normalization attempts to detect receipt currency.
- If missing or unreliable fallback appears, scanner display now prefers user currency.
- Receipt prefill sends normalized currency into expense dialogs.

## 5. Frontend Formatting

- Prefer `formatCurrencyWithSymbol(...)` from `frontend/src/lib/currency.ts`.
- Avoid raw `Intl.NumberFormat` with hardcoded `USD` for expense UI.

## 6. Supported Codes

The currency helper includes a curated list of common ISO-like 3-letter codes, including:

- USD, EUR, GBP, JPY, CAD, AUD
- INR, NPR, CNY, SGD, HKD
- BRL, MXN, ZAR, AED, SAR and others

## 7. Best Practices

- Persist cents, not floats.
- Keep currency code with each money record.
- Normalize incoming OCR currency before applying form defaults.
- Use one formatting utility path across components.

