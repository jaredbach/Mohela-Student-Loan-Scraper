# Mohela Sync

A small Chrome extension to scrape loan balances and recent transactions from the Mohela student loan portal and export them as CSVs.

Contents
- `content.js` — content script that scrapes loan rows, totals, and recent transactions and saves them to `chrome.storage.local`.
- `background.js` — background listener (kept minimal).
- `popup.html` / `popup.js` — popup UI to view saved data, trigger a fresh scrape, and export CSVs.
- `manifest.json` — Chrome extension manifest v3.

Features
- Scrapes per-loan data (name, current balance, interest rate, repayment plan, status, etc.).
- Saves total balance and total number of loans.
- Scrapes recent transactions per loan when available.
- Export two CSVs from the popup:
  - `balances.csv` — headers: Date, Balance, Account (skips loans with zero balance)
  - `transactions.csv` — headers: Date, Merchant, Category, Account, Original Statement, Notes, Amount, Tags
- Account names are mapped (e.g., `1-01 Direct Loan - Subsidized` → `Federal Student Loan 1`).

Quick install (load unpacked extension)
1. Open Chrome and go to `chrome://extensions/`.
2. Enable "Developer mode" (top-right).
3. Click "Load unpacked" and choose this project folder (`Mohela-Student-Loan-Scraper`).
4. Open a Mohela account page, open the extension popup, and click "Sync Now" to scrape.

Using the popup
- "Sync Now": runs the content script on the active Mohela tab and saves data to `chrome.storage.local`.
- "Export Balances": downloads `balances.csv` using today's date for each row.
- "Export Transactions": downloads `transactions.csv` with per-transaction rows (Merchant=MOHELA, Category=Transfer).

Notes and troubleshooting
- The scraping uses DOM selectors that match the current Mohela HTML structure. If the site changes, selectors may need updating.
- Balances and transactions are parsed from visible elements; edge cases (missing titles, alternate markup) are handled with fallbacks, but if you see incorrect/missing entries, open the console and run:

```js
chrome.storage.local.get('mohelaLoans', console.log)
```

Then paste the logged object here so I can help update the selectors.

- `gh` (GitHub CLI) is optional but convenient for creating a repo and pushing from the terminal.

Development
- This is a small vanilla JS Chrome extension. There is no build step currently — just load the folder as an unpacked extension.

License
- Add a license of your choice (MIT recommended). If you want, I can add one for you.

Contact / next steps
- I can add a `.gitignore`, README improvements, or a small preview UI in the popup. Tell me which you'd like next.