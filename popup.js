document.getElementById("sync").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  });

  // Wait a sec for scrape + storage to complete, then refresh popup
  setTimeout(loadData, 1500);
});
  
document.getElementById('export').addEventListener('click', () => {
  chrome.storage.local.get('mohelaLoans', ({ mohelaLoans }) => {
    if (!mohelaLoans || !mohelaLoans.loans || mohelaLoans.loans.length === 0) {
      alert('No loan data to export. Sync first while on Mohela.');
      return;
    }

    // Build CSV: columns Date, Balance, Account
    const rows = [];
    rows.push(['Date', 'Balance', 'Account']);

    const mapAccount = (rawName) => {
      if (!rawName) return '';
      // try to match patterns like '1-01' or '1-02' at the start and use the second number
      const m = rawName.match(/\b\d+-0*(\d+)\b/);
      if (m) {
        const idx = parseInt(m[1], 10);
        if (!isNaN(idx)) return `Federal Student Loan ${idx}`;
      }
      // fallback specific mappings (in case of other formats)
      if (/Direct Loan - Subsidized/i.test(rawName)) return 'Federal Student Loan 1';
      if (/Direct Loan - Unsubsidized/i.test(rawName)) return 'Federal Student Loan 2';
      return rawName;
    };

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      mohelaLoans.loans.forEach(loan => {
        const date = today;
          let balanceRaw = (loan.currentBalance || '').toString();
          // normalize NBSP and trim
          balanceRaw = balanceRaw.replace(/\u00A0/g, ' ').trim();
          // extract numeric portion (remove $ and commas). If no digits present, keep as null
          const digits = balanceRaw.replace(/[^0-9.-]+/g, '');
          const numeric = digits === '' ? null : parseFloat(digits);
          // additional zero-text detection (handles formats like "$0.00", "(0.00)", "0")
          const zeroText = /^\s*[-(]?\s*\$?0+(?:[\.,]0+)?\s*[) -]?\s*$/;
          if (numeric === 0 || (balanceRaw && zeroText.test(balanceRaw))) return;
        const account = mapAccount(loan.name || '');
        // sanitize quotes, commas and newlines
        const safe = s => s.replace(/\r?\n/g, ' ').replace(/"/g, '""');
        rows.push([safe(date), safe(balanceRaw), safe(account)]);
      });

    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balances.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});

// Export transactions.csv
document.getElementById('export-transactions').addEventListener('click', () => {
  chrome.storage.local.get('mohelaLoans', ({ mohelaLoans }) => {
    if (!mohelaLoans || !mohelaLoans.transactions || mohelaLoans.transactions.length === 0) {
      alert('No transactions found. Sync first while on Mohela.');
      return;
    }

    const mapAccount = (rawName) => {
      if (!rawName) return '';
      const m = rawName.match(/\b\d+-0*(\d+)\b/);
      if (m) {
        const idx = parseInt(m[1], 10);
        if (!isNaN(idx)) return `Federal Student Loan ${idx}`;
      }
      if (/Direct Loan - Subsidized/i.test(rawName)) return 'Federal Student Loan 1';
      if (/Direct Loan - Unsubsidized/i.test(rawName)) return 'Federal Student Loan 2';
      return rawName;
    };

    const rows = [];
    // headers: Date, Merchant, Category, Account, Original Statement, Notes, Amount, Tags
    rows.push(['Date', 'Merchant', 'Category', 'Account', 'Original Statement', 'Notes', 'Amount', 'Tags']);

    const seen = new Set();
    mohelaLoans.transactions.forEach(t => {
      const date = t.date || new Date().toISOString().slice(0,10);
      const merchant = 'MOHELA';
      const category = 'Transfer';
      const account = mapAccount(t.accountRaw || '').trim();
      const original = 'MOHELA Loan Payment';
      const notes = 'Synced via Chrome Ext';
      const amountRaw = (t.amount || '').toString();
      const safe = s => s.replace(/\r?\n/g, ' ').replace(/"/g, '""');

      // Skip if account is empty (user requested these be excluded)
      if (!account) return;

      // extract numeric portion and parse
      const digits = amountRaw.replace(/[^0-9.-]+/g, '');
      const numeric = digits === '' ? null : parseFloat(digits);
      if (numeric === null || isNaN(numeric)) return; // skip non-numeric amounts

      // skip zero amounts
      if (numeric === 0) return;

      // make positive
      const positive = Math.abs(numeric);
      const amountFormatted = `$${positive.toFixed(2)}`;

      // dedupe by date|account|amount
      const key = `${date}|${account}|${positive.toFixed(2)}`;
      if (seen.has(key)) return;
      seen.add(key);

      rows.push([safe(date), safe(merchant), safe(category), safe(account), safe(original), safe(notes), safe(amountFormatted), '']);
    });

    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});

function loadData() {
  chrome.storage.local.get("mohelaLoans", data => {
    console.log("Popup got data:", data);
    const el = document.getElementById("balance");
    
    if (!data.mohelaLoans) {
      el.textContent = "No data found. Click Sync Now while on Mohela.";
      const exportBtn = document.getElementById('export');
      if (exportBtn) exportBtn.disabled = true;
      return;
    }

    const info = data.mohelaLoans;
    const exportBtn = document.getElementById('export');
    if (exportBtn) exportBtn.disabled = !(info.loans && info.loans.length > 0);
    el.innerHTML = `
      <strong>Total Balance:</strong> ${info.totalBalance || "N/A"}<br>
      <strong>Total Loans:</strong> ${info.totalLoans || "N/A"}<br><br>
      ${info.loans.map(l => `
        <div>
          <b>${l.name}</b><br>
          Balance: ${l.currentBalance}<br>
          Rate: ${l.interestRate}<br>
          Plan: ${l.repaymentPlan}<br>
          Status: ${l.status}
        </div>
        <hr>
      `).join("")}
    `;
  });
}

// Load data when popup opens
loadData();
