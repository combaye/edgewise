// Altman Z-Score (original 1968 manufacturing model). Pure function.
//
//   Z = 1.2·X1 + 1.4·X2 + 3.3·X3 + 0.6·X4 + 1.0·X5
//   X1 = working capital / total assets
//   X2 = retained earnings / total assets
//   X3 = EBIT / total assets
//   X4 = market value of equity / total liabilities
//   X5 = sales / total assets
//
// Inputs are the Twelve Data /balance_sheet and /income_statement responses
// plus the live price (for market value of equity).

const num = (v) => {
  if (v === null || v === undefined || v === "") return null; // Number(null) is 0 — guard it
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

export function computeAltmanZ(balanceResp, incomeResp, price) {
  const bs = balanceResp?.balance_sheet?.[0] ?? balanceResp?.balance_sheet;
  const is = incomeResp?.income_statement?.[0] ?? incomeResp?.income_statement;
  if (!bs || !is) return null;

  const totalAssets = num(bs.assets?.total_assets);
  const curAssets = num(bs.assets?.current_assets?.total_current_assets);
  const curLiab = num(bs.liabilities?.current_liabilities?.total_current_liabilities);
  const totalLiab = num(bs.liabilities?.total_liabilities);
  const retained = num(bs.shareholders_equity?.retained_earnings);
  const ebit = num(is.ebit) ?? num(is.operating_income);
  const sales = num(is.sales);
  const shares = num(is.diluted_shares_outstanding) ?? num(is.basic_shares_outstanding);

  if (!totalAssets || !totalLiab || curAssets == null || curLiab == null) return null;

  const mktCap = price != null && shares != null ? price * shares : null;
  if (mktCap == null || retained == null || ebit == null || sales == null) return null;

  const X1 = (curAssets - curLiab) / totalAssets;
  const X2 = retained / totalAssets;
  const X3 = ebit / totalAssets;
  const X4 = mktCap / totalLiab;
  const X5 = sales / totalAssets;
  const z = 1.2 * X1 + 1.4 * X2 + 3.3 * X3 + 0.6 * X4 + 1.0 * X5;

  return {
    z,
    zone: z > 2.99 ? { label: "SAFE", dir: "safe" } : z >= 1.81 ? { label: "GREY ZONE", dir: "grey" } : { label: "DISTRESS", dir: "distress" },
    factors: [
      { name: "Working capital / assets", x: X1, w: 1.2 },
      { name: "Retained earnings / assets", x: X2, w: 1.4 },
      { name: "EBIT / assets", x: X3, w: 3.3 },
      { name: "Mkt equity / liabilities", x: X4, w: 0.6 },
      { name: "Sales / assets", x: X5, w: 1.0 },
    ],
    fiscalDate: bs.fiscal_date || is.fiscal_date || null,
  };
}
