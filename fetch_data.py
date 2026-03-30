"""
Runs in GitHub Actions. Downloads MSTR and BTC-USD history via yfinance,
computes mNAV, and writes data/data.json for the frontend to consume.
"""

import json, os, math
from datetime import datetime, timezone
import yfinance as yf


BTC_HISTORY = [
    ("2024-12-31", "2025-03-30",  447470, 281_735_000),
    ("2025-03-31", "2025-06-29",  528185, 299_653_000),
    ("2025-06-30", "2025-09-29",  597325, 314_216_000),
    ("2025-09-30", "2025-12-30",  640031, 320_040_000),
    ("2025-12-31", "2026-03-21",  672500, 344_897_000),
    ("2026-03-22", "2026-06-30",  762099, 377_847_000),
]

def get_holdings(date):
    for start, end, btc, shares in BTC_HISTORY:
        if start <= date.strftime("%Y-%m-%d") <= end:
            return btc, shares
    return 762099, 377_847_000


print("Downloading MSTR...")
mstr = yf.download("MSTR", period="13mo", interval="1d", auto_adjust=True, progress=False)

print("Downloading BTC-USD...")
btc  = yf.download("BTC-USD", period="13mo", interval="1d", auto_adjust=True, progress=False)

mstr_close = mstr["Close"].dropna()
btc_close  = btc["Close"].dropna()

common_dates = mstr_close.index.intersection(btc_close.index)
print(f"Common trading days: {len(common_dates)}")

records = []
for date in sorted(common_dates):
    mstr_px = float(mstr_close.loc[date].iloc[0] if hasattr(mstr_close.loc[date], 'iloc') else mstr_close.loc[date])
    btc_px  = float(btc_close.loc[date].iloc[0]  if hasattr(btc_close.loc[date],  'iloc') else btc_close.loc[date])

    BTC_HELD, SHARES_OUT = get_holdings(date)
    BTC_PER_SHARE = BTC_HELD / SHARES_OUT
    nav_per_share = BTC_PER_SHARE * btc_px
    mnav          = mstr_px / nav_per_share if nav_per_share > 0 else None

    if mnav is None or math.isnan(mnav):
        continue

    records.append({
        "date":        date.strftime("%Y-%m-%d"),
        "mstrClose":   round(mstr_px, 4),
        "btcClose":    round(btc_px, 2),
        "navPerShare": round(nav_per_share, 4),
        "mnav":        round(mnav, 6),
    })

os.makedirs("data", exist_ok=True)

output = {
    "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "btcHeld":   BTC_HELD,
    "sharesOut": SHARES_OUT,
    "btcPerShare": round(BTC_PER_SHARE, 8),
    "records":   records,
}

with open("data/data.json", "w") as f:
    json.dump(output, f, separators=(",", ":"))
