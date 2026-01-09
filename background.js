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

//save current time, will work like,if some user got in on thursday its weekly time will be calculated as thursday- sunday, and month will be calculated as current month, not as whoole 30 days
function saveCurrentTime() {
  console.log('saveCurrentTime called, currentSite:', currentSite, 'startTime:', startTime);
  if (!currentSite || !startTime) return;
  
  const timeSpent = Date.now() - startTime;
  console.log('Time spent:', timeSpent, 'Site:', currentSite);
  
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // "2026-01-09"
  
  // Calculate week (Monday = start of week)
  const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to get Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekKey = monday.toISOString().split('T')[0]; // Week identified by its Monday
  
  // Calculate month
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // "2026-01"
  
  chrome.storage.local.get(['dailyData', 'weeklyData', 'monthlyData'], (result) => {
    const dailyData = result.dailyData || {};
    const weeklyData = result.weeklyData || {};
    const monthlyData = result.monthlyData || {};
    
    const seconds = Math.round(timeSpent / 1000);
    
    // TODAY's data
    if (!dailyData[today]) {
      dailyData[today] = { total: 0, cooking: 0, study: 0, procrastination: 0, sites: {} };
    }
    dailyData[today].total += seconds;
    dailyData[today].sites[currentSite] = (dailyData[today].sites[currentSite] || 0) + seconds;
    
    // THIS WEEK's data
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { total: 0, cooking: 0, study: 0, procrastination: 0, sites: {} };
    }
    weeklyData[weekKey].total += seconds;
    weeklyData[weekKey].sites[currentSite] = (weeklyData[weekKey].sites[currentSite] || 0) + seconds;
    
    // THIS MONTH's data
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, cooking: 0, study: 0, procrastination: 0, sites: {} };
    }
    monthlyData[monthKey].total += seconds;
    monthlyData[monthKey].sites[currentSite] = (monthlyData[monthKey].sites[currentSite] || 0) + seconds;
    
    // Check if this is Flavortown!
    if (currentSite.includes('flavortown.hackclub.com')) {
      dailyData[today].cooking += seconds;
      weeklyData[weekKey].cooking += seconds;
      monthlyData[monthKey].cooking += seconds;
      console.log('Cooking time added:', seconds);
    }
    
    chrome.storage.local.set({ dailyData, weeklyData, monthlyData });
  });
}
// Listen for messages from popup to categorize sites
//here , users can make catetegories, what sites they are using as a study, and what sites they are using for fun
//chrome.runtime.on message is used for communication bw the bg script and the pop up
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'categorize') {
    chrome.storage.local.get(['categories'], (result) => {
      const categories = result.categories || {};
      categories[request.site] = request.category;
      chrome.storage.local.set({ categories });
      sendResponse({ success: true });
    });
    return true;
  }
});

