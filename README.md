# mNAV Tracker

這是一個用於追蹤與視覺化 MicroStrategy (MSTR) 的 **mNAV** 的工具。使用者可以觀察市場對 MSTR 持有的比特幣賦予了多少溢價或折價，進而輔助投資與交易決策。

## 核心功能

* **mNAV 視覺化圖表**：展示每日 mNAV 倍數走勢，支援 1M, 3M, 6M, 1Y 與 All 等時間區間切換。
* **價格正規化比較**：將 MSTR 與 BTC 價格起點設為 100，直觀比較兩者在同一時期的漲跌幅度與連動性。
* **關鍵績效指標 (KPIs)**：即時顯示最新的 mNAV 倍數、MSTR 股價、BTC 價格以及每股淨值 (NAV per Share)。
* **自動資料更新**：結合 GitHub Actions 自動抓取最新市場資料，確保數據的時效性。

## 技術架構

* **前端介面**：HTML5, CSS3, JavaScript (Vanilla)
* **資料獲取與處理**：Python 3, `yfinance`
* **自動化與部署**：GitHub Actions, GitHub Pages

## 資料更新機制

1.  進入 GitHub Repository 的 **Actions** 分頁。
2.  在左側選單點擊 **Update mNAV Data**。
3.  點擊 **Run workflow**，系統會啟動並執行 `fetch_data.py`。
4.  Python 腳本會透過 Yahoo Finance API 抓取 MSTR 與 BTC-USD 的最新收盤價，並根據歷史持倉表計算最新的 mNAV。
5.  計算完成後，會自動將結果覆寫至 `data/data.json`，前端網頁即可同步呈現最新的數據圖表。