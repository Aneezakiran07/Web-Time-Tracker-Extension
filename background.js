let currentSite = null;
let startTime = null;

// When the active tab changes
chrome.tabs.onActivated.addListener(() => {
  saveCurrentTime();
  startNewTracking();
});

// When a tab is updated (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    saveCurrentTime();
    startNewTracking();
  }
});

function startNewTracking() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        currentSite = url.hostname;
        startTime = Date.now();
      } catch (e) {
        currentSite = null;
        startTime = null;
      }
    }
  });
}

function saveCurrentTime() {
  console.log('saveCurrentTime called, currentSite:', currentSite, 'startTime:', startTime);
  if (!currentSite || !startTime) return;
  
  const timeSpent = Date.now() - startTime;
  console.log('Time spent:', timeSpent, 'Site:', currentSite);
  
  chrome.storage.local.get(['timeData', 'cookingTime'], (result) => {
    const timeData = result.timeData || {};
    let cookingTime = result.cookingTime || 0;
    
    const seconds = Math.round(timeSpent / 1000);
    timeData[currentSite] = (timeData[currentSite] || 0) + seconds;
    
    // Check if this is Flavortown!
    if (currentSite.includes('flavortown.hackclub.com')) {
      cookingTime += seconds;
      console.log('Cooking time added:', seconds, 'Total:', cookingTime);
    }
    
    chrome.storage.local.set({ timeData, cookingTime });
  });
}

