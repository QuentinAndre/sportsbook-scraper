// FanDuel-specific DOM selectors and parsing
// Guard against re-injection
if (typeof FanDuelParser === 'undefined') {
  class FanDuelParser {
    static SITE = 'FanDuel';

    // Selectors ordered by stability: data-testid > aria > class partial
    static SELECTORS = {
      // Bet card containers
      betCard: [
        '[data-testid="bet-card"]',
        '[data-testid="settled-bet"]',
        '[class*="betslip-card"]',
        '[class*="settled-bet"]',
        '[class*="BetCard"]',
        '[class*="bet-receipt"]'
      ],
      // Date/time
      date: [
        '[data-testid="bet-date"]',
        '[class*="bet-date"]',
        '[class*="betDate"]',
        '[class*="date-time"]',
        '[class*="timestamp"]'
      ],
      // Event name
      event: [
        '[data-testid="event-name"]',
        '[data-testid="bet-event"]',
        '[class*="event-name"]',
        '[class*="eventName"]',
        '[class*="matchup"]'
      ],
      // Selection / pick
      selection: [
        '[data-testid="selection-name"]',
        '[data-testid="bet-selection"]',
        '[class*="selection"]',
        '[class*="pick-name"]',
        '[class*="outcome"]'
      ],
      // Odds
      odds: [
        '[data-testid="odds"]',
        '[data-testid="bet-odds"]',
        '[class*="odds"]',
        '[class*="price"]'
      ],
      // Stake / wager
      stake: [
        '[data-testid="stake"]',
        '[data-testid="bet-stake"]',
        '[class*="stake"]',
        '[class*="wager"]',
        '[class*="risk"]'
      ],
      // Payout / winnings
      payout: [
        '[data-testid="payout"]',
        '[data-testid="bet-payout"]',
        '[data-testid="potential-payout"]',
        '[class*="payout"]',
        '[class*="winnings"]',
        '[class*="return"]'
      ],
      // Result (won/lost/push)
      result: [
        '[data-testid="bet-result"]',
        '[data-testid="bet-status"]',
        '[class*="result"]',
        '[class*="status"]',
        '[class*="badge"]'
      ],
      // Bet type (single, parlay, etc.)
      betType: [
        '[data-testid="bet-type"]',
        '[class*="bet-type"]',
        '[class*="betType"]',
        '[class*="wager-type"]'
      ],
      // Sport/League
      sport: [
        '[data-testid="sport-name"]',
        '[class*="sport"]',
        '[class*="league"]',
        '[class*="competition"]'
      ]
    };

    static URL_PATTERN = /fanduel\.com\/(account\/activity|history|mybets)/i;

    static isValidPage(url) {
      return FanDuelParser.URL_PATTERN.test(url);
    }

    static queryFirst(parent, selectorList) {
      for (const sel of selectorList) {
        const el = parent.querySelector(sel);
        if (el) return el.textContent.trim();
      }
      return '';
    }

    static findBetCards() {
      for (const sel of FanDuelParser.SELECTORS.betCard) {
        const cards = document.querySelectorAll(sel);
        if (cards.length > 0) return Array.from(cards);
      }

      // Fallback: look for repeating card-like structures
      const candidates = document.querySelectorAll(
        '[class*="card"], [class*="bet"], [class*="receipt"], [class*="slip"]'
      );
      // Filter to elements that likely contain bet info (have stake/odds text)
      return Array.from(candidates).filter(el => {
        const text = el.textContent;
        return /\$[\d.]+/.test(text) && /[+-]\d{3}/.test(text);
      });
    }

    static parseBets() {
      const cards = FanDuelParser.findBetCards();
      const bets = [];

      for (const card of cards) {
        const rawText = card.textContent.replace(/\s+/g, ' ').trim();
        const bet = {
          'date_time': FanDuelParser.queryFirst(card, FanDuelParser.SELECTORS.date),
          'sport': FanDuelParser.queryFirst(card, FanDuelParser.SELECTORS.sport),
          'league': '',
          'event': FanDuelParser.queryFirst(card, FanDuelParser.SELECTORS.event),
          'bet_type': FanDuelParser.queryFirst(card, FanDuelParser.SELECTORS.betType),
          'selection': FanDuelParser.queryFirst(card, FanDuelParser.SELECTORS.selection),
          'odds': FanDuelParser.queryFirst(card, FanDuelParser.SELECTORS.odds),
          'stake': FanDuelParser.queryFirst(card, FanDuelParser.SELECTORS.stake),
          'payout': FanDuelParser.queryFirst(card, FanDuelParser.SELECTORS.payout),
          'result': FanDuelParser.queryFirst(card, FanDuelParser.SELECTORS.result),
          'site': FanDuelParser.SITE,
          'raw_notes': rawText
        };

        // Try to extract from raw text if selectors failed
        if (!bet.odds) {
          const oddsMatch = rawText.match(/([+-]\d{3,4})/);
          if (oddsMatch) bet.odds = oddsMatch[1];
        }
        if (!bet.stake) {
          const stakeMatch = rawText.match(/(?:stake|wager|risk)[:\s]*\$?([\d.]+)/i);
          if (stakeMatch) bet.stake = '$' + stakeMatch[1];
        }
        if (!bet.payout) {
          const payoutMatch = rawText.match(/(?:payout|win|return)[:\s]*\$?([\d.]+)/i);
          if (payoutMatch) bet.payout = '$' + payoutMatch[1];
        }
        if (!bet.result) {
          if (/\bwon\b/i.test(rawText)) bet.result = 'Won';
          else if (/\blost?\b/i.test(rawText)) bet.result = 'Lost';
          else if (/\bpush\b/i.test(rawText)) bet.result = 'Push';
          else if (/\bvoid\b/i.test(rawText)) bet.result = 'Void';
        }

        // Split sport/league if combined
        if (bet.sport && bet.sport.includes(' - ')) {
          const parts = bet.sport.split(' - ');
          bet.sport = parts[0].trim();
          bet.league = parts.slice(1).join(' - ').trim();
        }

        bets.push(bet);
      }

      return bets;
    }
  }

  globalThis.FanDuelParser = FanDuelParser;
}
