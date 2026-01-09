let contextMenu = null;
let currentTab = 'today';

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    currentTab = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(currentTab + '-content').classList.add('active');
    loadData();
  });
});

function loadData() {
  chrome.storage.local.get(['dailyData', 'weeklyData', 'monthlyData', 'categories'], (result) => {
    const dailyData = result.dailyData || {};
    const weeklyData = result.weeklyData || {};
    const monthlyData = result.monthlyData || {};
    const categories = result.categories || {};
    
    if (currentTab === 'today') {
      renderToday(dailyData, categories);
    } else if (currentTab === 'week') {
      renderWeek(weeklyData, categories);
    } else if (currentTab === 'month') {
      renderMonth(monthlyData, categories);
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
               createSitesList(data.sites, categories, true); // true = sort by time
  
  document.getElementById('today-content').innerHTML = html;
  addPieChartListeners();
  addContextMenuListeners();
}
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
function renderWeek(weeklyData, categories) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekKey = monday.toISOString().split('T')[0];
  
  const data = weeklyData[weekKey] || { cooking: 0, sites: {} };
  
  let studyTime = 0, procrastinationTime = 0;
  
  for (const [site, seconds] of Object.entries(data.sites)) {
    if (categories[site] === 'study') studyTime += seconds;
    if (categories[site] === 'procrastination') procrastinationTime += seconds;
  }
  
  const html = createStatsHTML(data.cooking || 0, studyTime, procrastinationTime) +
               createPieChart(data.sites, 'week');
  
  document.getElementById('week-content').innerHTML = html;
  addPieChartListeners();
}

function renderMonth(monthlyData, categories) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const data = monthlyData[monthKey] || { cooking: 0, sites: {} };
  
  let studyTime = 0, procrastinationTime = 0;
  
  for (const [site, seconds] of Object.entries(data.sites)) {
    if (categories[site] === 'study') studyTime += seconds;
    if (categories[site] === 'procrastination') procrastinationTime += seconds;
  }
  
  const html = createStatsHTML(data.cooking || 0, studyTime, procrastinationTime) +
               createPieChart(data.sites, 'month');
  
  document.getElementById('month-content').innerHTML = html;
  addPieChartListeners();
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
  
  // Sort by time if requested
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
        loadData();
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

function createPieChart(timeData, period = 'today') {
  if (Object.keys(timeData).length === 0) return '';
  
  // Sort sites by time (descending)
  const sortedSites = Object.entries(timeData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10 sites
  
  const total = sortedSites.reduce((sum, [_, seconds]) => sum + seconds, 0);
  
  // Color palette (cute pastel colors)
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
  
  const dateLabels = {
    'today': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    'week': `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    'month': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  };
  
  return `
    <div class="chart-container">
      <svg class="pie-chart" viewBox="0 0 200 200" id="pieChart">
        <circle cx="100" cy="100" r="60" fill="white"/>
        ${paths}
        <circle cx="100" cy="100" r="55" fill="#f5e6d3"/>
        <text x="100" y="95" text-anchor="middle" font-size="14" fill="#5c4033" font-weight="bold" id="chartLabel">Click a slice!</text>
        <text x="100" y="110" text-anchor="middle" font-size="11" fill="#5c4033" id="chartSite"></text>
      </svg>
      <div class="date-display">📅 ${dateLabels[period]}</div>
      <div class="legend">${legendHTML}</div>
    </div>
  `;
}
// Initial load
loadData();