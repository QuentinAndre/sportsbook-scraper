// CSV builder utility
// Guard against re-injection
if (typeof CsvBuilder === 'undefined') {
  class CsvBuilder {
    static COLUMNS = [
      'Date/Time',
      'Sport',
      'League',
      'Event',
      'Bet Type',
      'Selection',
      'Odds',
      'Stake',
      'Payout',
      'Result',
      'Site',
      'Raw Notes'
    ];

    static escapeField(value) {
      if (value == null) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    static buildCsv(bets) {
      const header = CsvBuilder.COLUMNS.map(CsvBuilder.escapeField).join(',');
      const rows = bets.map(bet =>
        CsvBuilder.COLUMNS.map(col => {
          const key = col.replace(/[\/\s]/g, '_').toLowerCase();
          return CsvBuilder.escapeField(bet[key] ?? '');
        }).join(',')
      );
      return header + '\n' + rows.join('\n');
    }
  }

  // Make available globally
  if (typeof globalThis !== 'undefined') {
    globalThis.CsvBuilder = CsvBuilder;
  }
}
