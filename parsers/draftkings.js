// DraftKings-specific DOM parsing using data-test-id attributes
// Guard against re-injection
if (typeof DraftKingsParser === 'undefined') {
  class DraftKingsParser {
    static SITE = 'DraftKings';

    static URL_PATTERN = /draftkings\.com\/(mybets|bet-history|my-bets)/i;

    // Accumulated bets collected during scrolling (keyed by DK bet ID to dedupe).
    // DraftKings uses virtual scrolling (sb-lazy-render) which only keeps visible
    // cards in the DOM, so we must harvest cards incrementally while scrolling.
    static _collectedBets = new Map();

    static isValidPage(url) {
      return DraftKingsParser.URL_PATTERN.test(url);
    }

    /** Parse a single bet card element into a bet object. Returns null if card is invalid. */
    static _parseCard(card) {
      const cardTestId = card.getAttribute('data-test-id');
      if (!cardTestId) return null;
      const betIdSuffix = cardTestId.replace('bet-card-', '');

      // Title: "2 Picks", "Under 222.5", "MEM Grizzlies +5.5"
      const titleEl = card.querySelector(`[data-test-id="bet-details-title-${betIdSuffix}"]`);
      const title = titleEl ? titleEl.textContent.trim() : '';

      // Odds: "+445", "−110"
      const oddsEl = card.querySelector(`[data-test-id="bet-details-displayOdds-${betIdSuffix}"]`);
      let odds = oddsEl ? oddsEl.textContent.trim() : '';
      // Check for boosted odds (original crossed out, boosted shown)
      const boostedOddsEl = card.querySelector(`[data-test-id="bet-details-boosted-displayOdds-${betIdSuffix}"]`);
      if (boostedOddsEl) odds = boostedOddsEl.textContent.trim();
      // Normalize minus sign (DK uses Unicode −, not ASCII -)
      odds = odds.replace(/\u2212/g, '-');

      // Subtitle / bet type: "40+, 30+", "Live Total", "Live Spread"
      const subtitleEl = card.querySelector(`[data-test-id="bet-details-subtitle-${betIdSuffix}"]`);
      const subtitle = subtitleEl ? subtitleEl.textContent.trim() : '';

      // Status: "Open", "Won", "Lost", "Push", "Void"
      const statusEl = card.querySelector(`[data-test-id="bet-details-status-${betIdSuffix}"]`);
      const status = statusEl ? statusEl.textContent.trim() : '';

      // Stake: "Wager: $0.10"
      const stakeEl = card.querySelector(`[data-test-id="bet-stake-${betIdSuffix}"]`);
      let stake = '';
      if (stakeEl) {
        const stakeMatch = stakeEl.textContent.match(/\$([\d.]+)/);
        if (stakeMatch) stake = '$' + stakeMatch[1];
      }

      // Returns: "To Pay: $0.54", "Payout: $1.20", "Paid: $0.54"
      const returnsEl = card.querySelector(`[data-test-id="bet-returns-${betIdSuffix}"]`);
      let payout = '';
      if (returnsEl) {
        const payoutMatch = returnsEl.textContent.match(/\$([\d.]+)/);
        if (payoutMatch) payout = '$' + payoutMatch[1];
      }

      // SGP badge (optional)
      const sgpEl = card.querySelector(`[data-test-id="sgp-${betIdSuffix}"]`);
      const isSGP = !!sgpEl;

      // Team names for the event
      const team1El = card.querySelector('[data-test-id^="event-team-name-1-"]');
      const team2El = card.querySelector('[data-test-id^="event-team-name-2-"]');
      const team1 = team1El ? team1El.textContent.trim() : '';
      const team2 = team2El ? team2El.textContent.trim() : '';
      const event = team1 && team2 ? `${team1} v ${team2}` : team1 || team2;

      // Bet reference: date and DK bet ID
      const dateEl = card.querySelector(`[data-test-id="bet-reference-${betIdSuffix}-0"]`);
      const dkIdEl = card.querySelector(`[data-test-id="bet-reference-${betIdSuffix}-1"]`);
      const dateTime = dateEl ? dateEl.textContent.trim() : '';
      const dkBetId = dkIdEl ? dkIdEl.textContent.trim() : '';

      // Determine bet type
      let betType = '';
      if (isSGP) {
        betType = 'SGP';
      } else if (subtitle) {
        betType = subtitle;
      }

      // Selection: for SGP it's the subtitle (picks summary), for singles it's the title
      let selection = isSGP ? subtitle : title;

      // Result mapping
      let result = status;
      if (/^won$/i.test(status)) result = 'Won';
      else if (/^lost?$/i.test(status)) result = 'Lost';
      else if (/^push$/i.test(status)) result = 'Push';
      else if (/^void|cancelled$/i.test(status)) result = 'Void';

      const rawText = card.textContent.replace(/\s+/g, ' ').trim();

      return {
        _betId: betIdSuffix,
        'date_time': dateTime,
        'sport': '',
        'league': '',
        'event': event,
        'bet_type': betType,
        'selection': selection,
        'odds': odds,
        'stake': stake,
        'payout': payout,
        'result': result,
        'site': DraftKingsParser.SITE,
        'raw_notes': dkBetId + ' | ' + rawText
      };
    }

    /**
     * Harvest all currently-visible bet cards into the accumulated collection.
     * Call this repeatedly during scrolling to capture cards before they are
     * removed from the DOM by DraftKings' virtual scroll (sb-lazy-render).
     * Returns the number of NEW bets found in this pass.
     */
    static harvestVisibleBets() {
      const cards = document.querySelectorAll('[data-test-id^="bet-card-"]');
      let newCount = 0;
      for (const card of cards) {
        const bet = DraftKingsParser._parseCard(card);
        if (!bet) continue;
        if (!DraftKingsParser._collectedBets.has(bet._betId)) {
          newCount++;
        }
        // Always update — the card might have more data now (e.g. settled status)
        DraftKingsParser._collectedBets.set(bet._betId, bet);
      }
      return newCount;
    }

    /**
     * Return all collected bets. If no incremental harvesting was done
     * (e.g. page has no virtual scroll), falls back to a one-shot DOM parse.
     */
    static parseBets() {
      // Do one final harvest of whatever is currently in the DOM
      DraftKingsParser.harvestVisibleBets();

      const bets = [];
      for (const bet of DraftKingsParser._collectedBets.values()) {
        // Strip internal _betId before returning
        const { _betId, ...rest } = bet;
        bets.push(rest);
      }

      return bets;
    }

    /** Reset collected bets (useful if scraping multiple times in one session). */
    static reset() {
      DraftKingsParser._collectedBets = new Map();
    }
  }

  globalThis.DraftKingsParser = DraftKingsParser;
}
