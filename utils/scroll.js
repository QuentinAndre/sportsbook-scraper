// Auto-scroll with MutationObserver idle detection
// Guard against re-injection
if (typeof ScrollManager === 'undefined') {
  class ScrollManager {
    constructor(options = {}) {
      this.scrollDelay = options.scrollDelay || 800;
      this.idleTimeout = options.idleTimeout || 5000;
      this.maxNoChangeAttempts = options.maxNoChangeAttempts || 3;
      this.onProgress = options.onProgress || (() => {});
    }

    async scrollToBottom() {
      return new Promise((resolve) => {
        let noChangeCount = 0;
        let lastHeight = document.body.scrollHeight;
        let mutationSeen = false;
        let observer = null;
        let scrollInterval = null;
        let idleTimer = null;

        const cleanup = () => {
          if (observer) observer.disconnect();
          if (scrollInterval) clearInterval(scrollInterval);
          if (idleTimer) clearTimeout(idleTimer);
        };

        const done = () => {
          cleanup();
          resolve();
        };

        // Watch for DOM mutations (new content loading)
        observer = new MutationObserver(() => {
          mutationSeen = true;
          // Reset idle timer on each mutation
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            // Content stopped loading after mutation
            mutationSeen = false;
          }, 1500);
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        scrollInterval = setInterval(() => {
          const currentHeight = document.body.scrollHeight;

          // Scroll to the bottom
          window.scrollTo(0, currentHeight);

          if (currentHeight === lastHeight && !mutationSeen) {
            noChangeCount++;
            this.onProgress(`Checking for more content... (${noChangeCount}/${this.maxNoChangeAttempts})`);
            if (noChangeCount >= this.maxNoChangeAttempts) {
              done();
              return;
            }
          } else {
            noChangeCount = 0;
            lastHeight = currentHeight;
            this.onProgress('Scrolling and loading more bets...');
          }

          mutationSeen = false;
        }, this.scrollDelay);

        // Safety timeout: stop after idleTimeout even if still changing
        setTimeout(() => {
          if (noChangeCount < this.maxNoChangeAttempts) {
            this.onProgress('Safety timeout reached, proceeding with loaded content.');
          }
          done();
        }, this.idleTimeout + (this.maxNoChangeAttempts * this.scrollDelay * 2));
      });
    }
  }

  globalThis.ScrollManager = ScrollManager;
}
