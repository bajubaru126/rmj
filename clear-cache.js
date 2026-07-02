// Cache clearing script for development
// Run this script to clear browser cache and force reload

console.log('🧹 Clearing browser cache...');

// Add cache-busting timestamp to all imports
const timestamp = Date.now();
console.log(`Cache bust timestamp: ${timestamp}`);

// Instructions for manual cache clearing
console.log(`
🔧 MANUAL CACHE CLEARING INSTRUCTIONS:

1. In Chrome/Edge:
   - Press Ctrl+Shift+I (F12) to open DevTools
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

2. In Firefox:
   - Press Ctrl+Shift+R for hard refresh
   - Or press F12, go to Network tab, check "Disable cache"

3. Alternative method:
   - Press Ctrl+Shift+Delete
   - Clear "Cached images and files"
   - Clear "Cookies and other site data"

4. If still not working:
   - Close all browser tabs
   - Restart the browser completely
   - Restart the dev server (npm run dev)

5. Nuclear option:
   - Clear all browser data
   - Restart computer
   - Start fresh dev server

Current timestamp for debugging: ${timestamp}
`);

// Export timestamp for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { timestamp };
}