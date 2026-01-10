let contextMenu = null;
let currentTab = 'today';
let timeTravelView = 'daily'; // daily, weekly, monthly
let selectedDate = new Date();
let calendarMonth = new Date();

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
  
  let studyTime = 0, procrastinationTime = 0;
  
  for (const [site, seconds] of Object.entries(data.sites)) {
    if (categories[site] === 'study') studyTime += seconds;
    if (categories[site] === 'procrastination') procrastinationTime += seconds;
  }
  
  const html = createStatsHTML(data.cooking || 0, studyTime, procrastinationTime) + 
               createPieChart(data.sites) +
               createSitesList(data.sites, categories, true);
  
  document.getElementById('today-content').innerHTML = html;
  addPieChartListeners();
  addContextMenuListeners();
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
  
  let studyTime = 0, procrastinationTime = 0;
  
  for (const [site, seconds] of Object.entries(data.sites)) {
    if (categories[site] === 'study') studyTime += seconds;
    if (categories[site] === 'procrastination') procrastinationTime += seconds;
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
  
  const html = createStatsHTML(data.cooking || 0, studyTime, procrastinationTime) + 
               createPieChart(data.sites, type, dateLabel) +
               createSitesList(data.sites, categories, true);
  
  statsDiv.innerHTML = html;
  addPieChartListeners();
  addContextMenuListeners();
}

function getWeekKey(date) {
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  return monday.toISOString().split('T')[0];
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

function createStatsHTML(cooking, study, procrastination) {
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
        <div class="stat-emoji">😴</div>
        <div>Procrastination</div>
        <div class="stat-time">${format(procrastination)}</div>
      </div>
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
                  category === 'procrastination' ? '<span class="category-badge procrastination-badge">Procrastination</span>' : '';
    
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
    <div data-category="procrastination">😴 Mark as Procrastination</div>
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