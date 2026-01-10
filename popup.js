let contextMenu = null;
let currentTab = 'today';
let timeTravelView = 'daily'; // daily, weekly, monthly
let selectedDate = new Date();
let calendarMonth = new Date();

// Focus session state
let focusState = {
  active: false,
  paused: false,
  isBreak: false,
  isLongBreak: false,
  focusDuration: 25 * 60,
  breakDuration: 5 * 60,
  longBreakDuration: 10 * 60,
  timeRemaining: 0,
  sessionCount: 0,
  completedToday: 0,
  sessionsUntilLongBreak: 4,
  timerInterval: null
};

// Load focus state from storage on popup open
chrome.storage.local.get(['focusState', 'focusSessions'], (result) => {
  if (result.focusState) {
    focusState = { ...focusState, ...result.focusState };
    const today = new Date().toISOString().split('T')[0];
    if (result.focusSessions && result.focusSessions[today]) {
      focusState.sessionCount = result.focusSessions[today].count || 0;
      focusState.completedToday = result.focusSessions[today].count || 0;
    }
  }
  
  // If focus tab is active and session is running, start UI timer
  if (currentTab === 'focus' && focusState.active) {
    renderFocusSession();
    if (!focusState.paused) {
      startUITimer();
    }
  }
});

// Listen for timer complete messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'timerComplete') {
    playNotificationSound();
    // Reload state and re-render
    chrome.storage.local.get(['focusState'], (result) => {
      if (result.focusState) {
        focusState = { ...focusState, ...result.focusState };
        renderFocusSession();
        if (!focusState.paused) {
          startUITimer();
        }
      }
    });
  }
});

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    currentTab = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(currentTab + '-content').classList.add('active');
    
    if (currentTab === 'timetravel') {
      renderTimeTravel();
    } else if (currentTab === 'focus') {
      renderFocusSession();
    } else {
      loadData();
    }
  });
});

// Time Travel view switching
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('view-btn')) {
    timeTravelView = e.target.dataset.view;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    renderTimeTravel();
  }
});

function loadData() {
  chrome.storage.local.get(['dailyData', 'categories'], (result) => {
    const dailyData = result.dailyData || {};
    const categories = result.categories || {};
    
    if (currentTab === 'today') {
      renderToday(dailyData, categories);
    }
  });
}

function renderToday(dailyData, categories) {
  const today = new Date().toISOString().split('T')[0];
  const data = dailyData[today] || { cooking: 0, sites: {} };
  
  let studyTime = 0, entertainmentTime = 0;
  
  for (const [site, seconds] of Object.entries(data.sites)) {
    if (categories[site] === 'study') studyTime += seconds;
    if (categories[site] === 'entertainment') entertainmentTime += seconds;
  }
  
  // Get focus session stats for today
  chrome.storage.local.get(['focusSessions', 'focusStreak'], (result) => {
    const focusSessions = result.focusSessions || {};
    const focusStreak = result.focusStreak || { currentStreak: 0, lastDate: null };
    const todayFocus = focusSessions[today] || { count: 0, totalMinutes: 0 };
    
    let html = '';
    
    // Show streak badge if there's a streak
    if (focusStreak.currentStreak > 0) {
      html += `
        <div class="streak-badge">
          <div>🔥 FOCUS STREAK 🔥</div>
          <div class="streak-number">${focusStreak.currentStreak}</div>
          <div class="streak-text">day${focusStreak.currentStreak > 1 ? 's' : ''} in a row!</div>
        </div>
      `;
    }
    
    html += createStatsHTML(data.cooking || 0, studyTime, entertainmentTime, todayFocus.count, todayFocus.totalMinutes);
    html += createPieChart(data.sites);
    html += createSitesList(data.sites, categories, true);
    
    document.getElementById('today-content').innerHTML = html;
    addPieChartListeners();
    addContextMenuListeners();
  });
}

function renderWeek(weeklyData, categories) {
  // Removed - now handled by Time Travel tab
}

function renderMonth(monthlyData, categories) {
  // Removed - now handled by Time Travel tab
}

// ============ TIME TRAVEL FUNCTIONS ============

function renderTimeTravel() {
  chrome.storage.local.get(['dailyData', 'weeklyData', 'monthlyData', 'categories'], (result) => {
    const dailyData = result.dailyData || {};
    const weeklyData = result.weeklyData || {};
    const monthlyData = result.monthlyData || {};
    const categories = result.categories || {};
    
    if (timeTravelView === 'daily') {
      renderDailyCalendar(dailyData, categories);
    } else if (timeTravelView === 'weekly') {
      renderWeeklyList(weeklyData, categories);
    } else if (timeTravelView === 'monthly') {
      renderMonthlyList(monthlyData, categories);
    }
  });
}

function renderDailyCalendar(dailyData, categories) {
  const viewer = document.getElementById('timetravel-viewer');
  
  // Calendar header
  const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  let html = `
    <div class="calendar-header">
      <button class="nav-btn" id="prevMonth">◀</button>
      <div class="month-year-display">${monthName}</div>
      <button class="nav-btn" id="nextMonth">▶</button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-day-header">Sun</div>
      <div class="calendar-day-header">Mon</div>
      <div class="calendar-day-header">Tue</div>
      <div class="calendar-day-header">Wed</div>
      <div class="calendar-day-header">Thu</div>
      <div class="calendar-day-header">Fri</div>
      <div class="calendar-day-header">Sat</div>
  `;
  
  // Get first day of month
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const selectedStr = selectedDate.toISOString().split('T')[0];
  
  // Previous month days
  const prevMonthLastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    html += `<div class="calendar-day other-month">${prevMonthLastDay - i}</div>`;
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasData = dailyData[dateStr] && Object.keys(dailyData[dateStr].sites || {}).length > 0;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedStr;
    
    let classes = 'calendar-day';
    if (hasData) classes += ' has-data';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';
    
    html += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
  }
  
  html += '</div>';
  viewer.innerHTML = html;
  
  // Add event listeners
  document.getElementById('prevMonth').addEventListener('click', () => {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    renderTimeTravel();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    renderTimeTravel();
  });
  
  document.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
    day.addEventListener('click', () => {
      selectedDate = new Date(day.dataset.date);
      renderTimeTravelStats(dailyData[day.dataset.date], categories, day.dataset.date);
      renderTimeTravel(); // Re-render to show selection
    });
  });
  
  // Show stats for selected date
  renderTimeTravelStats(dailyData[selectedStr], categories, selectedStr);
}

function renderWeeklyList(weeklyData, categories) {
  const viewer = document.getElementById('timetravel-viewer');
  const weeks = Object.keys(weeklyData).sort().reverse();
  
  if (weeks.length === 0) {
    viewer.innerHTML = '<div class="no-data-message"><div class="emoji">📅</div><div>No weekly data yet! Start browsing to collect data.</div></div>';
    document.getElementById('timetravel-stats').innerHTML = '';
    return;
  }
  
  let html = '<div class="week-list">';
  weeks.forEach(weekKey => {
    const weekStart = new Date(weekKey);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const hasData = Object.keys(weeklyData[weekKey].sites || {}).length > 0;
    const isSelected = weekKey === getWeekKey(selectedDate);
    
    html += `<div class="week-item ${hasData ? 'has-data' : ''} ${isSelected ? 'selected' : ''}" data-week="${weekKey}">
      Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </div>`;
  });
  html += '</div>';
  
  viewer.innerHTML = html;
  
  document.querySelectorAll('.week-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedDate = new Date(item.dataset.week);
      renderTimeTravelStats(weeklyData[item.dataset.week], categories, item.dataset.week, 'week');
      renderTimeTravel();
    });
  });
  
  // Show first week's stats
  const firstWeek = weeks[0];
  renderTimeTravelStats(weeklyData[firstWeek], categories, firstWeek, 'week');
}

function renderMonthlyList(monthlyData, categories) {
  const viewer = document.getElementById('timetravel-viewer');
  const months = Object.keys(monthlyData).sort().reverse();
  
  if (months.length === 0) {
    viewer.innerHTML = '<div class="no-data-message"><div class="emoji">📊</div><div>No monthly data yet! Start browsing to collect data.</div></div>';
    document.getElementById('timetravel-stats').innerHTML = '';
    return;
  }
  
  let html = '<div class="month-list">';
  months.forEach(monthKey => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    const hasData = Object.keys(monthlyData[monthKey].sites || {}).length > 0;
    const isSelected = monthKey === `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    
    html += `<div class="month-item ${hasData ? 'has-data' : ''} ${isSelected ? 'selected' : ''}" data-month="${monthKey}">
      ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
    </div>`;
  });
  html += '</div>';
  
  viewer.innerHTML = html;
  
  document.querySelectorAll('.month-item').forEach(item => {
    item.addEventListener('click', () => {
      const [year, month] = item.dataset.month.split('-');
      selectedDate = new Date(year, parseInt(month) - 1);
      renderTimeTravelStats(monthlyData[item.dataset.month], categories, item.dataset.month, 'month');
      renderTimeTravel();
    });
  });
  
  // Show first month's stats
  const firstMonth = months[0];
  renderTimeTravelStats(monthlyData[firstMonth], categories, firstMonth, 'month');
}

function renderTimeTravelStats(data, categories, dateKey, type = 'day') {
  const statsDiv = document.getElementById('timetravel-stats');
  
  if (!data || Object.keys(data.sites || {}).length === 0) {
    statsDiv.innerHTML = '<div class="no-data-message"><div class="emoji">🍪</div><div>No data for this period!</div></div>';
    return;
  }
  
  let studyTime = 0, entertainmentTime = 0;
  
  for (const [site, seconds] of Object.entries(data.sites)) {
    if (categories[site] === 'study') studyTime += seconds;
    if (categories[site] === 'entertainment') entertainmentTime += seconds;
  }
  
  let dateLabel = '';
  if (type === 'day') {
    const date = new Date(dateKey);
    dateLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  } else if (type === 'week') {
    const weekStart = new Date(dateKey);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    dateLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else if (type === 'month') {
    const [year, month] = dateKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    dateLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }
  
  // Get focus session data for this period
  chrome.storage.local.get(['focusSessions'], (result) => {
    const focusSessions = result.focusSessions || {};
    let totalSessions = 0;
    let totalFocusMinutes = 0;
    
    if (type === 'day') {
      const dayData = focusSessions[dateKey] || { count: 0, totalMinutes: 0 };
      totalSessions = dayData.count;
      totalFocusMinutes = dayData.totalMinutes;
    } else if (type === 'week') {
      // Sum up all days in the week
      const weekStart = new Date(dateKey);
      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        const dayKey = currentDay.toISOString().split('T')[0];
        if (focusSessions[dayKey]) {
          totalSessions += focusSessions[dayKey].count || 0;
          totalFocusMinutes += focusSessions[dayKey].totalMinutes || 0;
        }
      }
    } else if (type === 'month') {
      // Sum up all days in the month
      const [year, month] = dateKey.split('-');
      for (const [day, dayData] of Object.entries(focusSessions)) {
        if (day.startsWith(dateKey)) {
          totalSessions += dayData.count || 0;
          totalFocusMinutes += dayData.totalMinutes || 0;
        }
      }
    }
    
    const html = createStatsHTML(data.cooking || 0, studyTime, entertainmentTime, totalSessions, totalFocusMinutes) + 
                 createPieChart(data.sites, type, dateLabel) +
                 createSitesList(data.sites, categories, true);
    
    statsDiv.innerHTML = html;
    addPieChartListeners();
    addContextMenuListeners();
  });
}

function getWeekKey(date) {
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  return monday.toISOString().split('T')[0];
}

// ============ SHARED FUNCTIONS ============

// ============ FOCUS SESSION FUNCTIONS ============

function renderFocusSession() {
  const view = document.getElementById('focus-view');
  
  // Sync state from storage first
  chrome.storage.local.get(['focusState', 'focusSessions'], (result) => {
    if (result.focusState) {
      focusState = { ...focusState, ...result.focusState };
      const today = new Date().toISOString().split('T')[0];
      if (result.focusSessions && result.focusSessions[today]) {
        focusState.sessionCount = result.focusSessions[today].count || 0;
        focusState.completedToday = result.focusSessions[today].count || 0;
      }
    }
    
    if (!focusState.active) {
      renderFocusSetup();
    } else if (focusState.isBreak) {
      view.innerHTML = renderBreakScreen();
      addBreakListeners();
      if (!focusState.paused) {
        startUITimer();
      }
    } else {
      view.innerHTML = renderFocusActive();
      addFocusActiveListeners();
      if (!focusState.paused) {
        startUITimer();
      }
    }
  });
}

function renderFocusSetup() {
  const focusMinutes = Math.floor(focusState.focusDuration / 60);
  const breakMinutes = Math.floor(focusState.breakDuration / 60);
  const longBreakMinutes = Math.floor(focusState.longBreakDuration / 60);
  
  const today = new Date().toISOString().split('T')[0];
  const sessionsToday = focusState.completedToday || 0;
  
  // Get streak info
  chrome.storage.local.get(['focusStreak'], (result) => {
    const focusStreak = result.focusStreak || { currentStreak: 0, lastDate: null };
    
    let streakHTML = '';
    if (focusStreak.currentStreak > 0) {
      streakHTML = `
        <div class="streak-badge">
          <div>🔥 FOCUS STREAK 🔥</div>
          <div class="streak-number">${focusStreak.currentStreak}</div>
          <div class="streak-text">day${focusStreak.currentStreak > 1 ? 's' : ''} in a row!</div>
        </div>
      `;
    }
    
    const setupHTML = `
      ${streakHTML}
      
      <div class="focus-setup">
        <div class="focus-title">🎯 Start a Focus Session</div>
        
        ${sessionsToday > 0 ? `<div style="text-align: center; margin-bottom: 15px; padding: 10px; background: #c8e6c9; border-radius: 10px; color: #2e7d32; font-weight: bold;">
          🔥 ${sessionsToday} session${sessionsToday > 1 ? 's' : ''} completed today!
        </div>` : ''}
        
        <div class="input-group">
          <label class="input-label">Focus Duration</label>
          <div class="time-inputs">
            <input type="number" id="focusMinutes" class="time-input" value="${focusMinutes}" min="1" max="120">
            <span>minutes</span>
          </div>
          <div class="preset-buttons">
            <button class="preset-btn" data-focus="15">15 min</button>
            <button class="preset-btn" data-focus="25">25 min (Pomodoro)</button>
            <button class="preset-btn" data-focus="45">45 min</button>
            <button class="preset-btn" data-focus="60">60 min</button>
          </div>
        </div>
        
        <div class="input-group">
          <label class="input-label">Break Duration</label>
          <div class="time-inputs">
            <input type="number" id="breakMinutes" class="time-input" value="${breakMinutes}" min="1" max="30">
            <span>minutes</span>
          </div>
          <div class="preset-buttons">
            <button class="preset-btn" data-break="5">5 min</button>
            <button class="preset-btn" data-break="10">10 min</button>
            <button class="preset-btn" data-break="15">15 min</button>
          </div>
        </div>
        
        <div class="input-group">
          <label class="input-label">Long Break (after 4 sessions)</label>
          <div class="time-inputs">
            <input type="number" id="longBreakMinutes" class="time-input" value="${longBreakMinutes}" min="5" max="60">
            <span>minutes</span>
          </div>
          <div class="preset-buttons">
            <button class="preset-btn" data-longbreak="10">10 min</button>
            <button class="preset-btn" data-longbreak="15">15 min</button>
            <button class="preset-btn" data-longbreak="20">20 min</button>
            <button class="preset-btn" data-longbreak="30">30 min</button>
          </div>
        </div>
        
        <button class="start-btn" id="startFocus">🚀 Start Focus Session</button>
      </div>
      
      <div style="text-align: center; padding: 15px; font-size: 12px; color: #5c4033;">
        💡 During focus sessions, all browsing time is counted as <strong>Study</strong>!<br>
        Complete 4 sessions to earn a long break! 🎉
      </div>
    `;
    
    document.getElementById('focus-view').innerHTML = setupHTML;
    addFocusSetupListeners();
  });
}

function renderFocusActive() {
  const minutes = Math.floor(focusState.timeRemaining / 60);
  const seconds = focusState.timeRemaining % 60;
  const progress = ((focusState.focusDuration - focusState.timeRemaining) / focusState.focusDuration) * 100;
  
  const sessionsUntilLongBreak = 4 - (focusState.sessionCount % 4);
  
  return `
    <div class="focus-active">
      <div class="focus-label">🎯 FOCUS MODE ACTIVE</div>
      <div class="focus-timer" id="timerDisplay">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</div>
      
      <div class="session-info">
        <div class="session-stat">📚 Session #${focusState.sessionCount + 1}</div>
        <div class="session-stat">⏱️ ${Math.floor(focusState.focusDuration / 60)} min focus</div>
        <div class="session-stat">🎁 ${sessionsUntilLongBreak} until long break</div>
      </div>
      
      <div style="background: rgba(255,255,255,0.5); height: 10px; border-radius: 5px; overflow: hidden; margin: 15px 0;">
        <div id="progressBar" style="background: #4CAF50; height: 100%; width: ${progress}%; transition: width 1s linear;"></div>
      </div>
      
      <div class="control-buttons">
        <button class="control-btn pause-btn" id="pauseFocus">
          ${focusState.paused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        <button class="control-btn stop-btn" id="stopFocus">⏹️ Stop</button>
      </div>
      
      <div style="text-align: center; margin-top: 15px; font-size: 12px; color: #2e7d32;">
        ✨ All your browsing is being tracked as <strong>Study time</strong>! Keep it up!
      </div>
    </div>
  `;
}

function renderBreakScreen() {
  const minutes = Math.floor(focusState.timeRemaining / 60);
  const seconds = focusState.timeRemaining % 60;
  const breakDur = focusState.isLongBreak ? focusState.longBreakDuration : focusState.breakDuration;
  const progress = ((breakDur - focusState.timeRemaining) / breakDur) * 100;
  
  const breakType = focusState.isLongBreak ? '🎉 LONG BREAK TIME! 🎉' : '☕ BREAK TIME!';
  const breakColor = focusState.isLongBreak ? '#9B72CB' : '#FFD93D';
  
  return `
    <div class="focus-active break-active" style="background: linear-gradient(135deg, ${breakColor === '#9B72CB' ? '#e1bee7 0%, #ce93d8 100%' : '#fff9c4 0%, #fff59d 100%'});">
      <div class="focus-label">${breakType}</div>
      <div class="break-timer" id="timerDisplay">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</div>
      
      <div class="session-info">
        <div class="session-stat">✅ Completed ${focusState.sessionCount} session(s)</div>
        ${focusState.isLongBreak ? '<div class="session-stat">🎁 You earned this long break!</div>' : ''}
      </div>
      
      <div style="background: rgba(255,255,255,0.5); height: 10px; border-radius: 5px; overflow: hidden; margin: 15px 0;">
        <div id="progressBar" style="background: ${breakColor}; height: 100%; width: ${progress}%; transition: width 1s linear;"></div>
      </div>
      
      <div class="control-buttons">
        <button class="control-btn skip-btn" id="skipBreak">⏭️ Skip Break</button>
        <button class="control-btn stop-btn" id="endSession">🏁 End Session</button>
      </div>
      
      <div style="text-align: center; margin-top: 15px; font-size: 12px; color: #5c4033;">
        ${focusState.isLongBreak ? '🌟 Great work! Take a longer breather!' : '🌟 Take a breather! Stretch, hydrate, rest your eyes.'}
      </div>
    </div>
  `;
}

function addFocusSetupListeners() {
  // Preset buttons
  document.querySelectorAll('[data-focus]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('focusMinutes').value = btn.dataset.focus;
    });
  });
  
  document.querySelectorAll('[data-break]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('breakMinutes').value = btn.dataset.break;
    });
  });
  
  document.querySelectorAll('[data-longbreak]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('longBreakMinutes').value = btn.dataset.longbreak;
    });
  });
  
  // Start button
  document.getElementById('startFocus').addEventListener('click', () => {
    const focusMinutes = parseInt(document.getElementById('focusMinutes').value) || 25;
    const breakMinutes = parseInt(document.getElementById('breakMinutes').value) || 5;
    const longBreakMinutes = parseInt(document.getElementById('longBreakMinutes').value) || 10;
    
    console.log('Starting focus session:', focusMinutes, 'min focus,', breakMinutes, 'min break,', longBreakMinutes, 'min long break');
    
    focusState.focusDuration = focusMinutes * 60;
    focusState.breakDuration = breakMinutes * 60;
    focusState.longBreakDuration = longBreakMinutes * 60;
    focusState.timeRemaining = focusState.focusDuration;
    focusState.active = true;
    focusState.isBreak = false;
    focusState.isLongBreak = false;
    focusState.paused = false;
    
    console.log('Sending message to background:', focusState);
    
    // Send to background to start tracking
    chrome.runtime.sendMessage({ 
      action: 'focusSession', 
      state: 'start',
      focusDuration: focusState.focusDuration,
      breakDuration: focusState.breakDuration,
      longBreakDuration: focusState.longBreakDuration,
      sessionCount: focusState.sessionCount,
      completedToday: focusState.completedToday
    }, (response) => {
      console.log('Background response:', response);
      renderFocusSession();
    });
  });
}

function addFocusActiveListeners() {
  document.getElementById('pauseFocus').addEventListener('click', () => {
    focusState.paused = !focusState.paused;
    
    chrome.runtime.sendMessage({ 
      action: 'focusSession', 
      state: focusState.paused ? 'pause' : 'resume',
      isBreak: focusState.isBreak
    }, () => {
      if (!focusState.paused) {
        startUITimer();
      } else {
        clearInterval(focusState.timerInterval);
      }
      renderFocusSession();
    });
  });
  
  document.getElementById('stopFocus').addEventListener('click', () => {
    if (confirm('Are you sure you want to stop this focus session?')) {
      stopFocusSession();
    }
  });
}

function addBreakListeners() {
  document.getElementById('skipBreak').addEventListener('click', () => {
    chrome.runtime.sendMessage({ 
      action: 'focusSession', 
      state: 'skipBreak'
    }, () => {
      chrome.storage.local.get(['focusState'], (result) => {
        focusState = { ...focusState, ...result.focusState };
        renderFocusSession();
      });
    });
  });
  
  document.getElementById('endSession').addEventListener('click', () => {
    stopFocusSession();
  });
}

function startUITimer() {
  clearInterval(focusState.timerInterval);
  
  console.log('Starting UI timer, current state:', focusState);
  
  // Sync with storage every second
  focusState.timerInterval = setInterval(() => {
    chrome.storage.local.get(['focusState'], (result) => {
      if (!result.focusState || !result.focusState.active) {
        console.log('No active focus state, stopping UI timer');
        clearInterval(focusState.timerInterval);
        return;
      }
      
      focusState.timeRemaining = result.focusState.timeRemaining;
      focusState.isBreak = result.focusState.isBreak;
      focusState.sessionCount = result.focusState.sessionCount;
      
      console.log('UI timer tick:', focusState.timeRemaining, 'isBreak:', focusState.isBreak);
      
      // Update display
      const minutes = Math.floor(focusState.timeRemaining / 60);
      const seconds = focusState.timeRemaining % 60;
      const timerElement = document.getElementById('timerDisplay');
      if (timerElement) {
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      
      // Update progress bar
      const progress = focusState.isBreak 
        ? ((focusState.breakDuration - focusState.timeRemaining) / focusState.breakDuration) * 100
        : ((focusState.focusDuration - focusState.timeRemaining) / focusState.focusDuration) * 100;
      
      const progressBar = document.getElementById('progressBar');
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
    });
  }, 1000);
}

function stopFocusSession() {
  clearInterval(focusState.timerInterval);
  
  chrome.runtime.sendMessage({ 
    action: 'focusSession', 
    state: 'stop' 
  }, () => {
    focusState.active = false;
    focusState.paused = false;
    focusState.isBreak = false;
    renderFocusSession();
  });
}

function notifyBackground(action) {
  // This function is no longer used, keeping for compatibility
}

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 200);
  } catch (e) {
    console.log('Audio notification not available');
  }
}

// ============ SHARED FUNCTIONS ============

function addPieChartListeners() {
  document.querySelectorAll('.pie-slice').forEach(slice => {
    slice.addEventListener('mouseenter', () => {
      slice.style.opacity = '0.8';
    });
    
    slice.addEventListener('mouseleave', () => {
      slice.style.opacity = '1';
    });
    
    slice.addEventListener('click', () => {
      const site = slice.dataset.site;
      const percentage = slice.dataset.percentage;
      document.getElementById('chartLabel').textContent = `${percentage}%`;
      document.getElementById('chartSite').textContent = site;
    });
  });
}

function createStatsHTML(cooking, study, entertainment, focusSessions = 0, focusMinutes = 0) {
  const format = (sec) => `${Math.floor(sec/60)}m ${sec%60}s`;
  return `
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-emoji">👨‍🍳</div>
        <div>Cooking</div>
        <div class="stat-time">${format(cooking)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-emoji">📚</div>
        <div>Study</div>
        <div class="stat-time">${format(study)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-emoji">🎮</div>
        <div>Entertainment</div>
        <div class="stat-time">${format(entertainment)}</div>
      </div>
      ${focusSessions > 0 ? `
      <div class="stat-box" style="border-color: #4CAF50;">
        <div class="stat-emoji">🎯</div>
        <div>Focus Sessions</div>
        <div class="stat-time">${focusSessions} (${focusMinutes}m)</div>
      </div>
      ` : ''}
    </div>
  `;
}

function createSitesList(timeData, categories, sortByTime = false) {
  if (Object.keys(timeData).length === 0) {
    return '<div class="sites-list" style="text-align: center;">No data for this period! 🍪</div>';
  }
  
  let entries = Object.entries(timeData);
  
  if (sortByTime) {
    entries = entries.sort((a, b) => b[1] - a[1]);
  }
  
  let html = '<div class="sites-list"><div style="font-weight: bold; margin-bottom: 10px; text-align: center;">📊 All Sites (right-click to categorize)</div>';
  
  for (const [site, seconds] of entries) {
    const minutes = Math.floor(seconds / 60);
    const emoji = site.includes('flavortown.hackclub.com') ? '🍳 ' : '🌐 ';
    const category = categories[site];
    const badge = category === 'study' ? '<span class="category-badge study-badge">Study</span>' :
                  category === 'entertainment' ? '<span class="category-badge entertainment-badge">Entertainment</span>' : '';
    
    html += `<div class="site-item" data-site="${site}">${emoji}<strong>${site}</strong>: ${minutes}m ${seconds % 60}s${badge}</div>`;
  }
  html += '</div>';
  return html;
}

function addContextMenuListeners() {
  document.querySelectorAll('.site-item').forEach(item => {
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, item.dataset.site);
    });
  });
}

function showContextMenu(e, site) {
  if (contextMenu) contextMenu.remove();
  
  contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  contextMenu.style.left = e.pageX + 'px';
  contextMenu.style.top = e.pageY + 'px';
  
  contextMenu.innerHTML = `
    <div data-category="study">📚 Mark as Study</div>
    <div data-category="entertainment">🎮 Mark as Entertainment</div>
    <div data-category="none">❌ Remove Category</div>
  `;
  
  document.body.appendChild(contextMenu);
  
  contextMenu.querySelectorAll('div').forEach(option => {
    option.addEventListener('click', () => {
      const category = option.dataset.category;
      chrome.runtime.sendMessage({ 
        action: 'categorize', 
        site: site, 
        category: category === 'none' ? null : category 
      }, () => {
        if (currentTab === 'timetravel') {
          renderTimeTravel();
        } else {
          loadData();
        }
      });
    });
  });
}

document.addEventListener('click', () => {
  if (contextMenu) {
    contextMenu.remove();
    contextMenu = null;
  }
});

function createPieChart(timeData, period = 'today', customLabel = null) {
  if (Object.keys(timeData).length === 0) return '';
  
  const sortedSites = Object.entries(timeData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const total = sortedSites.reduce((sum, [_, seconds]) => sum + seconds, 0);
  
  const colors = ['#FF6B6B', '#FFA07A', '#FFD93D', '#6BCB77', '#4D96FF', 
                  '#9B72CB', '#FF8DC7', '#FFB6C1', '#87CEEB', '#98D8C8'];
  
  let currentAngle = 0;
  let paths = '';
  let legendHTML = '';
  
  sortedSites.forEach(([site, seconds], index) => {
    const percentage = (seconds / total * 100).toFixed(1);
    const angle = (seconds / total) * 360;
    const endAngle = currentAngle + angle;
    
    const x1 = 100 + 90 * Math.cos((currentAngle - 90) * Math.PI / 180);
    const y1 = 100 + 90 * Math.sin((currentAngle - 90) * Math.PI / 180);
    const x2 = 100 + 90 * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = 100 + 90 * Math.sin((endAngle - 90) * Math.PI / 180);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    paths += `<path d="M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z" 
              fill="${colors[index % colors.length]}" 
              class="pie-slice" 
              data-site="${site}" 
              data-percentage="${percentage}"
              style="cursor: pointer; transition: opacity 0.2s;"/>`;
    
    legendHTML += `<div class="legend-item">
                    <div class="legend-color" style="background: ${colors[index % colors.length]}"></div>
                    <span>${site.length > 15 ? site.substring(0, 15) + '...' : site}</span>
                   </div>`;
    
    currentAngle = endAngle;
  });
  
  let dateLabel = customLabel;
  if (!dateLabel) {
    const dateLabels = {
      'today': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      'week': `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      'month': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    };
    dateLabel = dateLabels[period];
  }
  
  return `
    <div class="chart-container">
      <svg class="pie-chart" viewBox="0 0 200 200" id="pieChart">
        <circle cx="100" cy="100" r="60" fill="white"/>
        ${paths}
        <circle cx="100" cy="100" r="55" fill="#f5e6d3"/>
        <text x="100" y="95" text-anchor="middle" font-size="14" fill="#5c4033" font-weight="bold" id="chartLabel">Click a slice!</text>
        <text x="100" y="110" text-anchor="middle" font-size="11" fill="#5c4033" id="chartSite"></text>
      </svg>
      <div class="date-display">📅 ${dateLabel}</div>
      <div class="legend">${legendHTML}</div>
    </div>
  `;
}

// Initial load
loadData();