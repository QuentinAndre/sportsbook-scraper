// FanDuel-specific DOM parsing
// Guard against re-injection
if (typeof FanDuelParser === 'undefined') {
  class FanDuelParser {
    static SITE = 'FanDuel';

    static URL_PATTERN = /fanduel\.com\/(my-bets|account\/activity|history|mybets)/i;

    static isValidPage(url) {
      return FanDuelParser.URL_PATTERN.test(url);
    }

    static parseBets() {
      const bets = [];

      // The page is a <ul> with <li> items. Each bet spans two <li> elements:
      //   1. Header <li>: contains a div with aria-label="Selection, Bet Type, , Odds, Event, Time"
      //   2. Footer <li>: contains TOTAL WAGER, WON ON FANDUEL/RETURNED, BET ID, PLACED date
      // There are also separator <li> items (small spacers) and banner <li> items between bets.

      // Strategy: find all footer <li> (contain "BET ID"), then look backward for the header <li>.
      const allLis = document.querySelectorAll('ul > li');

      for (let i = 0; i < allLis.length; i++) {
        const li = allLis[i];
        const text = li.textContent;

        // Identify footer <li> by "BET ID" presence
        if (!/BET ID/i.test(text)) continue;

        // --- Parse footer ---
        const footerText = text.replace(/\s+/g, ' ').trim();

        // Wager: dollar amount before "TOTAL WAGER"
        let stake = '';
        const stakeMatch = footerText.match(/\$([\d.]+)\s*TOTAL WAGER/i);
        if (stakeMatch) stake = '$' + stakeMatch[1];

        // Payout and result: dollar amount before "WON ON FANDUEL" or "RETURNED"
        let payout = '';
        let result = '';
        const wonMatch = footerText.match(/\$([\d.]+)\s*WON ON FANDUEL/i);
        const returnedMatch = footerText.match(/\$([\d.]+)\s*RETURNED/i);
        if (wonMatch) {
          payout = '$' + wonMatch[1];
          result = parseFloat(wonMatch[1]) > 0 ? 'Won' : 'Lost';
        } else if (returnedMatch) {
          payout = '$' + returnedMatch[1];
          result = parseFloat(returnedMatch[1]) > 0 ? 'Returned' : 'Lost';
        }

        // Bet ID
        let betId = '';
        const betIdMatch = footerText.match(/BET ID:\s*(\S+)/i);
        if (betIdMatch) betId = betIdMatch[1];

        // Placed date
        let dateTime = '';
        const placedMatch = footerText.match(/PLACED:\s*(.+?)(?:\s*BET ID|$)/i);
        if (placedMatch) {
          dateTime = placedMatch[1].trim();
        } else {
          // Try alternate order (BET ID before PLACED)
          const placedMatch2 = footerText.match(/PLACED:\s*(.+)/i);
          if (placedMatch2) dateTime = placedMatch2[1].trim();
        }

        // --- Parse header (previous non-separator <li>) ---
        let selection = '';
        let betType = '';
        let odds = '';
        let event = '';
        let eventTime = '';

        // Walk backward to find the header <li> with an aria-label
        for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
          const headerLi = allLis[j];
          // The header <li> contains a div with a structured aria-label
          const ariaDiv = headerLi.querySelector('[aria-label][aria-hidden="false"]');
          if (ariaDiv) {
            const ariaLabel = ariaDiv.getAttribute('aria-label');
            // Format: "Selection, Bet Type, , Odds, Event, Time"
            // e.g. "MOUZ, MONEYLINE, , +1100, Aurora v MOUZ, 1:55pm MT"
            // e.g. "Over, TOTAL POINTS SCORED, , -112, Old Dominion (W) @ James Madison (W), 3:00pm MT"
            const parts = ariaLabel.split(',').map(s => s.trim());
            if (parts.length >= 6) {
              selection = parts[0];
              betType = parts[1];
              // parts[2] is empty or has handicap info
              odds = parts[3];
              // Event may contain commas in team names, so rejoin middle parts
              // Last part is always the time (contains am/pm)
              const timeIdx = parts.findIndex((p, idx) => idx >= 4 && /\d+:\d+\s*(am|pm)/i.test(p));
              if (timeIdx >= 0) {
                event = parts.slice(4, timeIdx).join(', ').trim();
                eventTime = parts[timeIdx];
              } else {
                event = parts.slice(4).join(', ').trim();
              }
              // If selection has a line/handicap (e.g., "Over 137.5"), check the header spans
              const lineSpan = headerLi.querySelector('span[aria-label^="Odds"]');
              if (lineSpan) {
                odds = lineSpan.textContent.trim();
              }
            }
            break;
          }
        }

        const bet = {
          'date_time': dateTime,
          'sport': '',
          'league': '',
          'event': event + (eventTime ? ', ' + eventTime : ''),
          'bet_type': betType,
          'selection': selection,
          'odds': odds,
          'stake': stake,
          'payout': payout,
          'result': result,
          'site': FanDuelParser.SITE,
          'raw_notes': 'BET ID: ' + betId + ' | ' + footerText
        };

        bets.push(bet);
      }

      return bets;
    }
  }

  globalThis.FanDuelParser = FanDuelParser;
}
