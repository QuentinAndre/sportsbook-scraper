// Auto-scroll with MutationObserver idle detection
// Guard against re-injection
if (typeof ScrollManager === 'undefined') {
  class ScrollManager {
    constructor(options = {}) {
      this.scrollDelay = options.scrollDelay || 800;
      this.maxNoChangeAttempts = options.maxNoChangeAttempts || 3;
      this.maxScrollTime = options.maxScrollTime || 120000; // 2 minute safety cap
      this.onProgress = options.onProgress || (() => {});
    }

    // Find the actual scrollable container — not always document.body.
    // FanDuel uses a <ul> with overflow:auto inside a flex layout.
    findScrollContainer() {
      // Look for the bet list container: a <ul> or <div> with overflow scroll/auto
      // that contains bet-related content
      const candidates = document.querySelectorAll('ul, div');
      for (const el of candidates) {
        const style = getComputedStyle(el);
        const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll');
        if (!isScrollable) continue;
        // Must have meaningful scroll height (more content than visible)
        if (el.scrollHeight <= el.clientHeight) continue;
        // Prefer elements that contain bet-related text
        const text = el.textContent || '';
        if (/BET ID|TOTAL WAGER|MONEYLINE|SPREAD/i.test(text)) {
          return el;
        }
      }
      // Fallback: try document.scrollingElement or body
      return document.scrollingElement || document.documentElement;
    }

    async scrollToBottom() {
      const container = this.findScrollContainer();
      const isWindow = (container === document.scrollingElement || container === document.documentElement);

      this.onProgress(
        isWindow
          ? 'Scrolling page to load all bets...'
          : 'Found bet list container, scrolling to load all bets...'
      );

      return new Promise((resolve) => {
        let noChangeCount = 0;
        let lastChildCount = container.querySelectorAll ? container.querySelectorAll(':scope > *').length : 0;
        let lastScrollHeight = container.scrollHeight;
        let mutationSeen = false;
        let observer = null;
        let scrollInterval = null;
        let mutationDebounce = null;
        const startTime = Date.now();

        const cleanup = () => {
          if (observer) observer.disconnect();
          if (scrollInterval) clearInterval(scrollInterval);
          if (mutationDebounce) clearTimeout(mutationDebounce);
        };

        const done = () => {
          cleanup();
          resolve();
        };

        // Watch for DOM mutations inside the scrollable container
        observer = new MutationObserver(() => {
          mutationSeen = true;
          if (mutationDebounce) clearTimeout(mutationDebounce);
          mutationDebounce = setTimeout(() => {
            mutationSeen = false;
          }, 1500);
        });

        observer.observe(isWindow ? document.body : container, {
          childList: true,
          subtree: true
        });

        scrollInterval = setInterval(() => {
          // Safety timeout
          if (Date.now() - startTime > this.maxScrollTime) {
            this.onProgress('Max scroll time reached, proceeding with loaded content.');
            done();
            return;
          }

          // Scroll the container to its bottom
          if (isWindow) {
            window.scrollTo(0, document.body.scrollHeight);
          } else {
            container.scrollTop = container.scrollHeight;
          }

          // Check if new content was added
          const currentScrollHeight = container.scrollHeight;
          const currentChildCount = container.querySelectorAll
            ? container.querySelectorAll(':scope > *').length
            : 0;

          const heightChanged = currentScrollHeight !== lastScrollHeight;
          const childrenChanged = currentChildCount !== lastChildCount;

          if (!heightChanged && !childrenChanged && !mutationSeen) {
            noChangeCount++;
            this.onProgress(
              `Checking for more content... (${noChangeCount}/${this.maxNoChangeAttempts})`
            );
            if (noChangeCount >= this.maxNoChangeAttempts) {
              this.onProgress(`Scroll complete. No new content after ${this.maxNoChangeAttempts} checks.`);
              done();
              return;
            }
          } else {
            noChangeCount = 0;
            lastScrollHeight = currentScrollHeight;
            lastChildCount = currentChildCount;
            this.onProgress(
              `Scrolling... (${currentChildCount} items loaded)`
            );
          }

          mutationSeen = false;
        }, this.scrollDelay);
      });
    }
  }

  globalThis.ScrollManager = ScrollManager;
}
