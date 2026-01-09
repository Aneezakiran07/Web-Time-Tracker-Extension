let currentSite = null;
let startTime = null;


//im going to add built in chrome functions for tracking time (src. google)
//chrome.tabs.onActivated: Built into Chrome to detect tab clicks.
//chrome.tabs.onUpdated: Built into Chrome to detect URL changes.
//chrome.tabs.query: Built into Chrome to "ask" which tab is open.

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
    if (tabs[0]) {
      const url = new URL(tabs[0].url);
      currentSite = url.hostname;
      startTime = Date.now();
    }
  });
}

function saveCurrentTime() {
  if (!currentSite || !startTime) return; //if cur time and start time are not defined
  
  const timeSpent = Date.now() - startTime; // Date.now() is used to get cur time in ms
  
  // Get existing data
  chrome.storage.local.get(['timeData'], (result) => {//chrome.storage.local.get is a built in chrome function to get data from local storage
    const timeData = result.timeData || {};
    
    // Add time to this site (convert to seconds)
    timeData[currentSite] = (timeData[currentSite] || 0) + Math.round(timeSpent / 1000);
    
    // Save back to storage
    chrome.storage.local.set({ timeData });
  });
}

