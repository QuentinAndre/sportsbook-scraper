# Sportsbook Bet History Exporter

A Chrome extension that exports your settled bet history from **FanDuel** and **DraftKings** as CSV files.

The extension auto-scrolls through infinite-scroll bet history pages, parses all loaded bets, and downloads a CSV with the following columns:

| Date/Time | Sport | League | Event | Bet Type | Selection | Odds | Stake | Payout | Result | Site | Raw Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|

## Installation

### Step 1: Download the extension

**Option A — Download as ZIP (no git required):**

1. Go to <https://github.com/QuentinAndre/sportsbook-scraper>
2. Click the green **Code** button near the top right
3. Click **Download ZIP**
4. Open the downloaded `sportsbook-scraper-master.zip` file
5. Extract (unzip) the contents to a permanent location on your computer, for example `C:\Users\YourName\Documents\sportsbook-scraper-master`

> **Important:** Do not move, rename, or delete this folder after loading the extension. Chrome references it directly.

**Option B — Clone with git:**

```
git clone https://github.com/QuentinAndre/sportsbook-scraper.git
```

### Step 2: Open Chrome's extension management page

Open Chrome and navigate to:

```
chrome://extensions
```

You can also get there by clicking the three-dot menu (top right) → **Extensions** → **Manage Extensions**.

### Step 3: Enable Developer Mode

In the top-right corner of the extensions page, you'll see a toggle labeled **Developer mode**. Turn it **on**. Three new buttons will appear at the top left: "Load unpacked", "Pack extension", and "Update".

### Step 4: Load the extension

1. Click **Load unpacked**
2. In the folder picker, navigate to and select the `sportsbook-scraper` folder (or `sportsbook-scraper-master` if you downloaded the ZIP)
3. Click **Select Folder**

The extension should now appear in your extensions list with the name "Sportsbook Bet History Exporter".

### Step 5: Pin the extension (optional but recommended)

1. Click the puzzle piece icon in Chrome's toolbar (top right)
2. Find "Sportsbook Bet History Exporter"
3. Click the pin icon next to it

This keeps the extension icon visible in your toolbar for easy access.

## Usage

1. Log into **DraftKings** and navigate to **My Bets → Settled**, or log into **FanDuel** and navigate to your **Account Activity / Bet History**
2. Click the extension icon in the toolbar
3. Click **Start Scraping**
4. Wait for it to scroll through your bets and generate the CSV
5. A save dialog will appear — choose where to save the file

The CSV file will be named `{site}_bets_{timestamp}.csv`.

## Troubleshooting

- **"Developer mode extensions" popup on Chrome launch:** This is normal for sideloaded extensions. Click Cancel (or the X) to dismiss it.
- **Extension disabled after a Chrome update:** Go back to `chrome://extensions` and re-enable it, or click "Load unpacked" again.
- **"No bets found" error:** The site may have updated its page structure. Open DevTools (F12) and check the console for a DOM snapshot to help debug. See the "Updating Selectors" section below.
- **Extension not appearing on the site:** Make sure you are on the correct page (settled bets / bet history, not the homepage).

## Updating Selectors

FanDuel and DraftKings may change their page structure over time, which can break the scraper. To fix this:

1. Open DevTools (F12) on the bet history page
2. Inspect a bet card element
3. Look for `data-testid`, `data-qa`, or `aria-label` attributes (these are the most stable)
4. Update the `SELECTORS` object in `parsers/fanduel.js` or `parsers/draftkings.js`
5. Go to `chrome://extensions` and click the reload icon on the extension card
