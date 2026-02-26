// Service worker: CSV generation + chrome.downloads
// Import CSV utility
importScripts('utils/csv.js');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_CSV') {
    const { bets, site } = message;

    try {
      const csvContent = CsvBuilder.buildCsv(bets);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${site}_bets_${timestamp}.csv`;

      // MV3 service workers can't use URL.createObjectURL
      // Use data URL approach instead
      const base64 = btoa(unescape(encodeURIComponent(csvContent)));
      const dataUrl = 'data:text/csv;base64,' + base64;

      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('[Sportsbook Scraper] Download error:', chrome.runtime.lastError);
        } else {
          console.log('[Sportsbook Scraper] Download started, ID:', downloadId);
        }
      });

      sendResponse({ success: true, filename: filename });
    } catch (err) {
      console.error('[Sportsbook Scraper] CSV generation error:', err);
      sendResponse({ success: false, error: err.message });
    }

    return true; // Keep message channel open for async sendResponse
  }

  // No need to forward messages from content scripts — chrome.runtime.sendMessage
  // in MV3 already delivers to all extension listeners (background + popup).
});
