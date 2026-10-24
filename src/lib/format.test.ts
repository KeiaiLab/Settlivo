import { expect, test } from "vitest";
import { formatMoney, formatUsdc, moneyParts, usdcParts } from "./format";

test("moneyParts splits the currency marker from grouped digits", () => {
  expect(moneyParts(4_200_000, "KRW")).toEqual({ unit: "₩", digits: "4,200,000", code: "KRW" });
  expect(moneyParts(77_531.31, "PHP")).toEqual({ unit: "₱", digits: "77,531.31", code: "PHP" });
  expect(moneyParts(2_400, "BRL")).toEqual({ unit: "R$", digits: "2,400.00", code: "BRL" });
  expect(moneyParts(38_000_000, "VND")).toEqual({ unit: "₫", digits: "38,000,000", code: "VND" });
  expect(moneyParts(1_234.5, "PLN")).toEqual({ unit: "zł", digits: "1,234.50", code: "PLN" });
  expect(moneyParts(0, "USD")).toEqual({ unit: "$", digits: "0.00", code: "USD" });
});

test("moneyParts keeps the sign with the digits and honours a dp override", () => {
  expect(moneyParts(-12.5, "EUR")).toEqual({ unit: "€", digits: "-12.50", code: "EUR" });
  expect(moneyParts(1_234.56, "USD", { dp: 0 })).toEqual({ unit: "$", digits: "1,235", code: "USD" });
});

test("usdcParts groups thousands and rounds to 2 dp unless exact", () => {
  expect(usdcParts("3043.478260")).toEqual({ digits: "3,043.48", unit: "USDC" });
  expect(usdcParts("3043.478260", "USDT", { exact: true })).toEqual({ digits: "3,043.478260", unit: "USDT" });
  expect(usdcParts(48250)).toEqual({ digits: "48,250.00", unit: "USDC" });
  expect(usdcParts("0.5", "USDC", { exact: true })).toEqual({ digits: "0.500000", unit: "USDC" });
});

test("string formatters agree with the parts", () => {
  expect(formatUsdc("3043.478260")).toBe("3,043.48 USDC");
  expect(formatUsdc("3043.478260", "USDT", { exact: true })).toBe("3,043.478260 USDT");
  expect(formatMoney(4_200_000, "KRW")).toBe("₩4,200,000");
  expect(formatMoney(77_531.31, "PHP")).toBe("₱77,531.31");
});
