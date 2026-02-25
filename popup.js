// Popup script: injects content scripts, handles messages, triggers CSV download

const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');

function setStatus(msg, type = '') {
  statusDiv.style.display = 'block';
  statusDiv.textContent = msg;
  statusDiv.className = type;
}

// Listen for messages from content script (via background)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SCRAPE_PROGRESS') {
    setStatus(message.message);
  } else if (message.type === 'SCRAPE_ERROR') {
    setStatus(message.error, 'error');
    startBtn.disabled = false;
    startBtn.textContent = 'Start Scraping';
  } else if (message.type === 'SCRAPE_COMPLETE') {
    setStatus(`Found ${message.count} bets. Downloading CSV...`, 'success');

    // Send bets to background for CSV generation and download
    chrome.runtime.sendMessage({
      type: 'GENERATE_CSV',
      bets: message.bets,
      site: message.site
    }, (response) => {
      if (response && response.success) {
        setStatus(`Done! ${message.count} bets exported to ${response.filename}`, 'success');
      } else if (response && response.error) {
        setStatus(`CSV error: ${response.error}`, 'error');
      }
      startBtn.disabled = false;
      startBtn.textContent = 'Start Scraping';
    });
  }
});

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  startBtn.textContent = 'Scraping...';
  setStatus('Injecting scripts...');

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      setStatus('No active tab found.', 'error');
      startBtn.disabled = false;
      startBtn.textContent = 'Start Scraping';
      return;
    }

    // Check if we're on a supported site
    const url = tab.url || '';
    if (!/fanduel\.com|draftkings\.com/i.test(url)) {
      setStatus('Please navigate to FanDuel or DraftKings first.', 'error');
      startBtn.disabled = false;
      startBtn.textContent = 'Start Scraping';
      return;
    }

    // Inject scripts in order: utilities first, then parsers, then orchestrator
    const scripts = [
      { file: 'utils/scroll.js' },
      { file: 'parsers/fanduel.js' },
      { file: 'parsers/draftkings.js' },
      { file: 'content.js' }
    ];

    for (const script of scripts) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [script.file]
      });
    }

    setStatus('Scripts injected. Scrolling to load all bets...');
  } catch (err) {
    console.error('[Sportsbook Scraper] Injection error:', err);
    setStatus(`Error: ${err.message}`, 'error');
    startBtn.disabled = false;
    startBtn.textContent = 'Start Scraping';
  }
});
