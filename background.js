chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.balance && msg.transactions) {
    console.log("Received data from Mohela page:", msg);
    chrome.storage.local.set({
      mohelaData: {
        lastSynced: new Date().toISOString(),
        balance: msg.balance,
        transactions: msg.transactions
      }
    });
  }
});
