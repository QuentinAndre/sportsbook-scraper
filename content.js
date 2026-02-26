// Orchestrator: detects site, scrolls, parses, returns data
// No re-injection guard here — this script should run each time the user clicks "Start Scraping"

(async () => {
  const url = window.location.href;

  // Detect which site we're on
  let parser = null;
  let siteName = '';

  if (/fanduel\.com/i.test(url)) {
    if (typeof FanDuelParser !== 'undefined' && FanDuelParser.isValidPage(url)) {
      parser = FanDuelParser;
      siteName = 'fanduel';
    } else if (typeof FanDuelParser !== 'undefined') {
      chrome.runtime.sendMessage({
        type: 'SCRAPE_ERROR',
        error: 'Please navigate to your FanDuel bet history/activity page first.'
      });
      return;
    }
  } else if (/draftkings\.com/i.test(url)) {
    if (typeof DraftKingsParser !== 'undefined' && DraftKingsParser.isValidPage(url)) {
      parser = DraftKingsParser;
      siteName = 'draftkings';
    } else if (typeof DraftKingsParser !== 'undefined') {
      chrome.runtime.sendMessage({
        type: 'SCRAPE_ERROR',
        error: 'Please navigate to your DraftKings settled bets page first.'
      });
      return;
    }
  }

  if (!parser) {
    chrome.runtime.sendMessage({
      type: 'SCRAPE_ERROR',
      error: 'This site is not supported. Please navigate to FanDuel or DraftKings bet history.'
    });
    return;
  }

  // Report progress
  const sendProgress = (msg) => {
    chrome.runtime.sendMessage({ type: 'SCRAPE_PROGRESS', message: msg });
  };

  sendProgress('Starting auto-scroll to load all bets...');

  // For DraftKings, reset any previously collected bets and enable incremental harvesting.
  // DK uses virtual scrolling (sb-lazy-render) which removes cards from the DOM as you
  // scroll past them, so we must collect cards during scrolling, not just at the end.
  if (typeof DraftKingsParser !== 'undefined' && parser === DraftKingsParser) {
    DraftKingsParser.reset();
  }

  // Scroll to load all content
  if (typeof ScrollManager !== 'undefined') {
    const harvestDuringScroll = (typeof DraftKingsParser !== 'undefined' && parser === DraftKingsParser)
      ? () => DraftKingsParser.harvestVisibleBets()
      : null;

    const scroller = new ScrollManager({
      scrollDelay: 1000,
      idleTimeout: 5000,
      maxNoChangeAttempts: 3,
      onProgress: sendProgress,
      onScrollStep: harvestDuringScroll
    });
    await scroller.scrollToBottom();
  }

  // Scroll back to top for good measure
  window.scrollTo(0, 0);

  sendProgress('Parsing bet data...');

  // Parse all bets
  const bets = parser.parseBets();

  if (bets.length === 0) {
    chrome.runtime.sendMessage({
      type: 'SCRAPE_ERROR',
      error: 'No bets found on this page. The page structure may have changed. Check the console for details.'
    });
    console.log('[Sportsbook Scraper] No bet cards found. DOM snapshot for debugging:');
    console.log(document.body.innerHTML.substring(0, 5000));
    return;
  }

  sendProgress(`Found ${bets.length} bets. Generating CSV...`);

  // Send bets back to popup/background
  chrome.runtime.sendMessage({
    type: 'SCRAPE_COMPLETE',
    bets: bets,
    site: siteName,
    count: bets.length
  });
})();
