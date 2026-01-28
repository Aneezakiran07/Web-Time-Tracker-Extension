// Add this to your popup.html in a new tab section
const DEFAULT_BLOCK_LIST = [
  'instagram.com',
  'facebook.com', 
  'twitter.com',
  'x.com',
  'reddit.com',
  'tiktok.com',
  'snapchat.com',
  'netflix.com',
  'hulu.com',
  'twitch.tv',
  'discord.com',
  'pinterest.com',
  'tumblr.com',
  '9gag.com',
  'buzzfeed.com',
  'dailymail.co.uk',
  'espn.com',
  'cnn.com',
  'bbc.com',
  'news.ycombinator.com'
];

function renderBlockSettings() {
  chrome.storage.local.get(['blockList', 'cooldownSites'], (result) => {
    const blockList = result.blockList || DEFAULT_BLOCK_LIST;
    const cooldownSites = result.cooldownSites || [];
    
    const settingsContent = document.getElementById('settings-content');
    
    let html = `
      <div class="settings-section">
        <h3>🔥 Hard Block Sites</h3>
        <p class="settings-hint">These sites are completely blocked during Power Sizzle sessions</p>
        <div class="block-list">
          ${blockList.map((site, idx) => `
            <div class="block-item">
              <span>${site}</span>
              <button class="remove-btn" data-type="block" data-index="${idx}">×</button>
            </div>
          `).join('')}
        </div>
        <div class="add-site">
          <input type="text" id="new-block-site" placeholder="example.com" />
          <button id="add-block-site">Add</button>
        </div>
      </div>
      
      <div class="settings-section">
        <h3>❄️ Cool Down Sites</h3>
        <p class="settings-hint">Sites you've marked as distracting (categorized as "entertainment")</p>
        <div class="block-list">
          ${cooldownSites.map((site, idx) => `
            <div class="block-item cooldown">
              <span>${site}</span>
              <button class="remove-btn" data-type="cooldown" data-index="${idx}">×</button>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="settings-section">
        <h3>🎓 YouTube Smart Filter</h3>
        <p class="settings-hint">During focus sessions, YouTube content is analyzed:</p>
        <ul class="feature-list">
          <li>✅ Educational lectures, tutorials, courses</li>
          <li>❌ Vlogs, gaming, entertainment, Shorts</li>
        </ul>
      </div>
    `;
    
    setHTML(settingsContent, html);
    
    document.getElementById('add-block-site').addEventListener('click', addBlockSite);
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', removeSite);
    });
  });
}

function addBlockSite() {
  const input = document.getElementById('new-block-site');
  const site = input.value.trim().toLowerCase();
  
  if (!site) return;
  
  const domainRegex = /^([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}$/;
  if (!domainRegex.test(site)) {
    alert('Please enter a valid domain (e.g., example.com)');
    return;
  }
  
  chrome.storage.local.get(['blockList'], (result) => {
    const blockList = result.blockList || DEFAULT_BLOCK_LIST;
    
    if (blockList.includes(site)) {
      alert('This site is already in the block list');
      return;
    }
    
    blockList.push(site);
    chrome.storage.local.set({ blockList }, () => {
      input.value = '';
      renderBlockSettings();
    });
  });
}

function removeSite(e) {
  const type = e.target.dataset.type;
  const index = parseInt(e.target.dataset.index);
  
  const storageKey = type === 'block' ? 'blockList' : 'cooldownSites';
  
  chrome.storage.local.get([storageKey], (result) => {
    const list = result[storageKey] || [];
    list.splice(index, 1);
    chrome.storage.local.set({ [storageKey]: list }, renderBlockSettings);
  });
}

// Auto-add sites marked as "entertainment" to cooldown list
function updateCooldownSites() {
  chrome.storage.local.get(['categories', 'cooldownSites'], (result) => {
    const categories = result.categories || {};
    const cooldownSites = result.cooldownSites || [];
    
    Object.entries(categories).forEach(([site, category]) => {
      if (category === 'entertainment' && !cooldownSites.includes(site)) {
        cooldownSites.push(site);
      }
    });
    
    chrome.storage.local.set({ cooldownSites });
  });
}

// Call this when categories change
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'categoryChanged') {
    updateCooldownSites();
  }
});
