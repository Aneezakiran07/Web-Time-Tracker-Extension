let currentSite = null;
let startTime = null;
let focusSessionActive = false;
let focusTimerInterval = null;

// Browser API compatibility (works for both Chrome and Firefox)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

//in background.js, we have those functions that will run in the background
//like the focus timer and the time tracking
//we also have the storage.local.get and storage.local.set functions to save and retrieve data from the storage

// Initialize focus state from storage on startup
browserAPI.storage.local.get(['focusState'], (result) => {
  if (result.focusState && result.focusState.active) {
    focusSessionActive = true;
    startFocusTimer(result.focusState);
    console.log('Restored focus session from storage');
  }
});

// When the active tab changes
browserAPI.tabs.onActivated.addListener(() => {
  saveCurrentTime();
  startNewTracking();
});

// When a tab is updated (URL changes)
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    saveCurrentTime();
    startNewTracking();
  }
});

//starts new tracking when the user switches tabs or updates the url,
function startNewTracking() {
  browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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

//save the current time spent on cur site

function saveCurrentTime() {
  console.log('saveCurrentTime called, currentSite:', currentSite, 'startTime:', startTime);
  if (!currentSite || !startTime) return;
  
  const timeSpent = Date.now() - startTime;
  console.log('Time spent:', timeSpent, 'Site:', currentSite);
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Calculate week (Monday = start of week)
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekKey = monday.toISOString().split('T')[0];
  
  // Calculate month
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  browserAPI.storage.local.get(['dailyData', 'weeklyData', 'monthlyData', 'categories'], (result) => {
    const dailyData = result.dailyData || {};
    const weeklyData = result.weeklyData || {};
    const monthlyData = result.monthlyData || {};
    const categories = result.categories || {};
    
    const seconds = Math.round(timeSpent / 1000);
    
    // TODAY's data
    if (!dailyData[today]) {
      dailyData[today] = { total: 0, cooking: 0, study: 0, entertainment: 0, sites: {} };
    }
    dailyData[today].total += seconds;
    dailyData[today].sites[currentSite] = (dailyData[today].sites[currentSite] || 0) + seconds;
    
    // THIS WEEK's data
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { total: 0, cooking: 0, study: 0, entertainment: 0, sites: {} };
    }
    weeklyData[weekKey].total += seconds;
    weeklyData[weekKey].sites[currentSite] = (weeklyData[weekKey].sites[currentSite] || 0) + seconds;
    
    // THIS MONTH's data
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, cooking: 0, study: 0, entertainment: 0, sites: {} };
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
    
    // If focus session is active, count as study time
    if (focusSessionActive) {
      dailyData[today].study += seconds;
      weeklyData[weekKey].study += seconds;
      monthlyData[monthKey].study += seconds;
      console.log('Focus session active - counted as study:', seconds);
    } else if (categories[currentSite] === 'study') {
      dailyData[today].study += seconds;
      weeklyData[weekKey].study += seconds;
      monthlyData[monthKey].study += seconds;
    } else if (categories[currentSite] === 'entertainment') {
      dailyData[today].entertainment += seconds;
      weeklyData[weekKey].entertainment += seconds;
      monthlyData[monthKey].entertainment += seconds;
    }
    
    browserAPI.storage.local.set({ dailyData, weeklyData, monthlyData });
  });
}

// Focus session timer in background
function startFocusTimer(state) {
  clearInterval(focusTimerInterval);
  
  console.log('Background timer started with state:', state);
  
  focusTimerInterval = setInterval(() => {
    browserAPI.storage.local.get(['focusState'], (result) => {
      const focusState = result.focusState;
      
      if (!focusState || !focusState.active) {
        console.log('No active focus state, stopping background timer');
        clearInterval(focusTimerInterval);
        return;
      }
      
      if (focusState.paused) {
        console.log('Focus state is paused, skipping countdown');
        return;
      }
      
      focusState.timeRemaining--;
      console.log('Background timer tick:', focusState.timeRemaining, 'isBreak:', focusState.isBreak);
      
      if (focusState.timeRemaining <= 0) {
        if (focusState.isBreak) {
          // Break ended, start new focus session
          focusState.isBreak = false;
          focusState.isLongBreak = false;
          focusState.timeRemaining = focusState.focusDuration;
          focusSessionActive = true;
          console.log('Break ended, new focus session started');
          
          // Send notification to popup if open
          browserAPI.runtime.sendMessage({ action: 'timerComplete', type: 'break' }).catch(() => {});
        } else {
          // Focus session ended, check if it's time for long break
          focusState.sessionCount++;
          focusState.completedToday = (focusState.completedToday || 0) + 1;
          
          // Every 4th session gets a long break
          const isLongBreak = (focusState.sessionCount % 4 === 0);
          focusState.isBreak = true;
          focusState.isLongBreak = isLongBreak;
          focusState.timeRemaining = isLongBreak ? focusState.longBreakDuration : focusState.breakDuration;
          focusSessionActive = false;
          
          console.log('Focus session completed. Session #', focusState.sessionCount, isLongBreak ? '(LONG BREAK!)' : '(short break)');
          
          // Save completed session count and update streak
          saveFocusSessionCount(focusState.sessionCount);
          updateStreak();
          
          // Send notification to popup if open
          browserAPI.runtime.sendMessage({ action: 'timerComplete', type: 'focus', isLongBreak }).catch(() => {});
        }
      }
      
      browserAPI.storage.local.set({ focusState }, () => {
        console.log('Focus state saved to storage');
      });
    });
  }, 1000);
}

//saves the focussession count for showing on stats page
function saveFocusSessionCount(count) {
  const today = new Date().toISOString().split('T')[0];
  
  browserAPI.storage.local.get(['focusSessions'], (result) => {
    const focusSessions = result.focusSessions || {};
    
    if (!focusSessions[today]) {
      focusSessions[today] = { count: 0, totalMinutes: 0 };
    }
    
    focusSessions[today].count = count;
    
    browserAPI.storage.local.set({ focusSessions }, () => {
      console.log('Focus session count saved:', count);
    });
  });
}

function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  
  browserAPI.storage.local.get(['focusStreak', 'focusSessions'], (result) => {
    const focusSessions = result.focusSessions || {};
    const focusStreak = result.focusStreak || { currentStreak: 0, lastDate: null, longestStreak: 0 };
    
    // Check if user did a focus session today
    if (!focusSessions[today] || focusSessions[today].count === 0) {
      // No session today yet, don't update streak
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (!focusStreak.lastDate) {
      // First ever session
      focusStreak.currentStreak = 1;
      focusStreak.lastDate = today;
    } else if (focusStreak.lastDate === today) {
      // Already counted today, don't increment
      return;
    } else if (focusStreak.lastDate === yesterdayStr) {
      // Consecutive day!
      focusStreak.currentStreak++;
      focusStreak.lastDate = today;
    } else {
      // Streak broken, restart
      focusStreak.currentStreak = 1;
      focusStreak.lastDate = today;
    }
    
    // Update longest streak
    if (focusStreak.currentStreak > focusStreak.longestStreak) {
      focusStreak.longestStreak = focusStreak.currentStreak;
    }
    
    browserAPI.storage.local.set({ focusStreak }, () => {
      console.log('Streak updated:', focusStreak.currentStreak, 'days');
    });
  });
}

// Listen for messages from popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'categorize') {
    browserAPI.storage.local.get(['categories'], (result) => {
      const categories = result.categories || {};
      categories[request.site] = request.category;
      browserAPI.storage.local.set({ categories });
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'focusSession') {
    console.log('Focus session message received:', request.state);
    
    if (request.state === 'start') {
      focusSessionActive = true;
      const focusState = {
        active: true,
        paused: false,
        isBreak: false,
        isLongBreak: false,
        focusDuration: request.focusDuration,
        breakDuration: request.breakDuration,
        longBreakDuration: request.longBreakDuration || 600,
        timeRemaining: request.focusDuration,
        sessionCount: request.sessionCount || 0,
        completedToday: request.completedToday || 0
      };
      browserAPI.storage.local.set({ focusState }, () => {
        console.log('Focus state saved, starting timer');
        startFocusTimer(focusState);
      });
      sendResponse({ success: true });
    } else if (request.state === 'resume') {
      focusSessionActive = !request.isBreak;
      browserAPI.storage.local.get(['focusState'], (result) => {
        const focusState = result.focusState;
        focusState.paused = false;
        browserAPI.storage.local.set({ focusState }, () => {
          startFocusTimer(focusState);
          console.log('Focus session resumed');
        });
      });
    } else if (request.state === 'pause') {
      browserAPI.storage.local.get(['focusState'], (result) => {
        const focusState = result.focusState;
        focusState.paused = true;
        browserAPI.storage.local.set({ focusState }, () => {
          clearInterval(focusTimerInterval);
          console.log('Focus session paused');
        });
      });
    } else if (request.state === 'stop') {
      focusSessionActive = false;
      clearInterval(focusTimerInterval);
      browserAPI.storage.local.set({ focusState: { active: false } }, () => {
        console.log('Focus session stopped');
      });
    } else if (request.state === 'skipBreak') {
      focusSessionActive = true;
      browserAPI.storage.local.get(['focusState'], (result) => {
        const focusState = result.focusState;
        focusState.isBreak = false;
        focusState.timeRemaining = focusState.focusDuration;
        browserAPI.storage.local.set({ focusState }, () => {
          startFocusTimer(focusState);
          console.log('Break skipped, new focus session');
        });
      });
    }
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'getFocusState') {
    browserAPI.storage.local.get(['focusState', 'focusSessions'], (result) => {
      sendResponse({ 
        focusState: result.focusState || { active: false },
        focusSessions: result.focusSessions || {}
      });
    });
    return true;
  }
});