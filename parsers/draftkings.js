// DraftKings-specific DOM parsing using data-test-id attributes
// Guard against re-injection
if (typeof DraftKingsParser === 'undefined') {
  class DraftKingsParser {
    static SITE = 'DraftKings';

    static URL_PATTERN = /draftkings\.com\/(mybets|bet-history|my-bets)/i;

    static isValidPage(url) {
      return DraftKingsParser.URL_PATTERN.test(url);
    }

    static parseBets() {
      const bets = [];

      // Each bet card has data-test-id="bet-card-{betId}"
      const cards = document.querySelectorAll('[data-test-id^="bet-card-"]');

      for (const card of cards) {
        // Extract the bet ID from the card's data-test-id
        const cardTestId = card.getAttribute('data-test-id');
        const betIdSuffix = cardTestId.replace('bet-card-', '');

        // Title: "2 Picks", "Under 222.5", "MEM Grizzlies +5.5"
        const titleEl = card.querySelector(`[data-test-id="bet-details-title-${betIdSuffix}"]`);
        const title = titleEl ? titleEl.textContent.trim() : '';

        // Odds: "+445", "−110"
        const oddsEl = card.querySelector(`[data-test-id="bet-details-displayOdds-${betIdSuffix}"]`);
        let odds = oddsEl ? oddsEl.textContent.trim() : '';
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

        // Returns: "To Pay: $0.54", "Payout: $1.20", "Returns: $0.00"
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

        bets.push({
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
        });
      }

      return bets;
    }
  }

  globalThis.DraftKingsParser = DraftKingsParser;
}
