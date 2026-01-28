let blockOverlay = null;
let checkInterval = null;

function createBlockOverlay() {
  if (blockOverlay) return;
  
  blockOverlay = document.createElement('div');
  blockOverlay.id = 'sizzle-block-overlay';
  blockOverlay.innerHTML = `
    <div class="sizzle-block-content">
      <h1>Keep Sizzling!</h1>
      <p>This content is blocked during your Power Sizzle session.</p>
      <p class="sizzle-hint">Focus on your goals - you've got this!</p>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    #sizzle-block-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .sizzle-block-content {
      text-align: center;
      color: white;
      animation: fadeIn 0.5s ease;
    }
    .sizzle-flame {
      font-size: 80px;
      margin-bottom: 20px;
      animation: flicker 2s infinite;
    }
    .sizzle-block-content h1 {
      font-size: 48px;
      margin: 0 0 20px 0;
      font-weight: 700;
    }
    .sizzle-block-content p {
      font-size: 20px;
      margin: 10px 0;
      opacity: 0.9;
    }
    .sizzle-hint {
      font-size: 16px;
      opacity: 0.7;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes flicker {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(blockOverlay);
}

function removeBlockOverlay() {
  if (blockOverlay) {
    blockOverlay.remove();
    blockOverlay = null;
  }
}

function matchesDomain(hostname, blockedSite) {
  const cleanHost = hostname.toLowerCase().replace(/^www\./, '');
  const cleanBlocked = blockedSite.toLowerCase().replace(/^www\./, '');
  
  return cleanHost === cleanBlocked || cleanHost.endsWith('.' + cleanBlocked);
}

function checkAndBlock() {
  const hostname = window.location.hostname;
  const url = window.location.href;
  
  chrome.storage.local.get(['focusState', 'blockList', 'cooldownSites', 'blockingEnabled'], (result) => {
    const focusState = result.focusState || {};
    const blockingEnabled = result.blockingEnabled !== false;
    
    if (!focusState.active || focusState.paused || focusState.isBreak || !blockingEnabled) {
      removeBlockOverlay();
      return;
    }
    
    const blockList = result.blockList || [
      'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
      'reddit.com', 'tiktok.com', 'snapchat.com', 'netflix.com',
      'hulu.com', 'twitch.tv', 'discord.com', 'pinterest.com',
      'tumblr.com', '9gag.com', 'buzzfeed.com', 'dailymail.co.uk',
      'espn.com', 'cnn.com', 'bbc.com', 'news.ycombinator.com'
    ];
    
    const cooldownSites = result.cooldownSites || [];
    const allBlockedSites = [...blockList, ...cooldownSites];
    
    const shouldBlock = allBlockedSites.some(site => matchesDomain(hostname, site));
    
    if (shouldBlock) {
      createBlockOverlay();
    } else {
      removeBlockOverlay();
    }
  });
}

// Initial check
checkAndBlock();

// Monitor URL changes and DOM updates
let lastUrl = location.href;
let lastTitle = document.title;

checkInterval = setInterval(() => {
  const urlChanged = location.href !== lastUrl;
  const titleChanged = document.title !== lastTitle;
  
  if (urlChanged || titleChanged) {
    lastUrl = location.href;
    lastTitle = document.title;
    checkAndBlock();
  } else {
    checkAndBlock();
  }
}, 500);

// Also check on various events
['popstate', 'hashchange', 'DOMContentLoaded', 'load'].forEach(event => {
  window.addEventListener(event, checkAndBlock);
});

// Prevent closing overlay via inspect element
setInterval(() => {
  const overlay = document.getElementById('sizzle-block-overlay');
  if (overlay && !blockOverlay) {
    blockOverlay = overlay;
  }
  
  chrome.storage.local.get(['focusState'], (result) => {
    const focusState = result.focusState || {};
    if (focusState.active && !focusState.paused && !focusState.isBreak) {
      if (!document.getElementById('sizzle-block-overlay') && blockOverlay) {
        document.body.appendChild(blockOverlay);
      }
    }
  });
}, 2000);

// Listen for focus state changes
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'focusStateChanged') {
    checkAndBlock();
  }
});