// DraftKings-specific DOM selectors and parsing
// Guard against re-injection
if (typeof DraftKingsParser === 'undefined') {
  class DraftKingsParser {
    static SITE = 'DraftKings';

    // Selectors ordered by stability: data-testid > aria > class partial
    static SELECTORS = {
      betCard: [
        '[data-testid="bet-card"]',
        '[data-testid="settled-bet-card"]',
        '[class*="bet-card"]',
        '[class*="betCard"]',
        '[class*="settled-bet"]',
        '[class*="myBetsCard"]',
        '[class*="receipt"]'
      ],
      date: [
        '[data-testid="bet-date"]',
        '[data-testid="placed-date"]',
        '[class*="bet-date"]',
        '[class*="betDate"]',
        '[class*="placed-date"]',
        '[class*="timestamp"]'
      ],
      event: [
        '[data-testid="event-name"]',
        '[data-testid="event-cell-link"]',
        '[class*="event-name"]',
        '[class*="eventName"]',
        '[class*="event-cell"]',
        '[class*="matchup"]'
      ],
      selection: [
        '[data-testid="selection-name"]',
        '[data-testid="bet-leg-description"]',
        '[class*="selection"]',
        '[class*="betLeg"]',
        '[class*="outcome-name"]',
        '[class*="pick"]'
      ],
      odds: [
        '[data-testid="odds"]',
        '[data-testid="bet-odds"]',
        '[class*="odds"]',
        '[class*="price"]',
        '[class*="americanOdds"]'
      ],
      stake: [
        '[data-testid="stake"]',
        '[data-testid="bet-amount"]',
        '[class*="stake"]',
        '[class*="wager"]',
        '[class*="bet-amount"]',
        '[class*="risk"]'
      ],
      payout: [
        '[data-testid="payout"]',
        '[data-testid="potential-payout"]',
        '[data-testid="returns"]',
        '[class*="payout"]',
        '[class*="winnings"]',
        '[class*="returns"]',
        '[class*="toCollect"]'
      ],
      result: [
        '[data-testid="bet-status"]',
        '[data-testid="bet-result"]',
        '[class*="bet-status"]',
        '[class*="betStatus"]',
        '[class*="result"]',
        '[class*="badge"]'
      ],
      betType: [
        '[data-testid="bet-type"]',
        '[class*="bet-type"]',
        '[class*="betType"]',
        '[class*="wager-type"]'
      ],
      sport: [
        '[data-testid="sport-label"]',
        '[class*="sport"]',
        '[class*="league"]',
        '[class*="category"]'
      ]
    };

    static URL_PATTERN = /draftkings\.com\/(mybets|bet-history|my-bets)/i;

    static isValidPage(url) {
      return DraftKingsParser.URL_PATTERN.test(url);
    }

    static queryFirst(parent, selectorList) {
      for (const sel of selectorList) {
        const el = parent.querySelector(sel);
        if (el) return el.textContent.trim();
      }
      return '';
    }

    static findBetCards() {
      for (const sel of DraftKingsParser.SELECTORS.betCard) {
        const cards = document.querySelectorAll(sel);
        if (cards.length > 0) return Array.from(cards);
      }

      // Fallback: look for repeating card-like structures
      const candidates = document.querySelectorAll(
        '[class*="card"], [class*="bet"], [class*="receipt"]'
      );
      return Array.from(candidates).filter(el => {
        const text = el.textContent;
        return /\$[\d.]+/.test(text) && /[+-]\d{3}/.test(text);
      });
    }

    static parseBets() {
      const cards = DraftKingsParser.findBetCards();
      const bets = [];

      for (const card of cards) {
        const rawText = card.textContent.replace(/\s+/g, ' ').trim();
        const bet = {
          'date_time': DraftKingsParser.queryFirst(card, DraftKingsParser.SELECTORS.date),
          'sport': DraftKingsParser.queryFirst(card, DraftKingsParser.SELECTORS.sport),
          'league': '',
          'event': DraftKingsParser.queryFirst(card, DraftKingsParser.SELECTORS.event),
          'bet_type': DraftKingsParser.queryFirst(card, DraftKingsParser.SELECTORS.betType),
          'selection': DraftKingsParser.queryFirst(card, DraftKingsParser.SELECTORS.selection),
          'odds': DraftKingsParser.queryFirst(card, DraftKingsParser.SELECTORS.odds),
          'stake': DraftKingsParser.queryFirst(card, DraftKingsParser.SELECTORS.stake),
          'payout': DraftKingsParser.queryFirst(card, DraftKingsParser.SELECTORS.payout),
          'result': DraftKingsParser.queryFirst(card, DraftKingsParser.SELECTORS.result),
          'site': DraftKingsParser.SITE,
          'raw_notes': rawText
        };

        // Fallback extraction from raw text
        if (!bet.odds) {
          const oddsMatch = rawText.match(/([+-]\d{3,4})/);
          if (oddsMatch) bet.odds = oddsMatch[1];
        }
        if (!bet.stake) {
          const stakeMatch = rawText.match(/(?:stake|wager|risk|bet)[:\s]*\$?([\d.]+)/i);
          if (stakeMatch) bet.stake = '$' + stakeMatch[1];
        }
        if (!bet.payout) {
          const payoutMatch = rawText.match(/(?:payout|win|return|collect)[:\s]*\$?([\d.]+)/i);
          if (payoutMatch) bet.payout = '$' + payoutMatch[1];
        }
        if (!bet.result) {
          if (/\bwon\b/i.test(rawText)) bet.result = 'Won';
          else if (/\blost?\b/i.test(rawText)) bet.result = 'Lost';
          else if (/\bpush\b/i.test(rawText)) bet.result = 'Push';
          else if (/\bvoid\b|cancelled/i.test(rawText)) bet.result = 'Void';
        }

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

  globalThis.DraftKingsParser = DraftKingsParser;
}
