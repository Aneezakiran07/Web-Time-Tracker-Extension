// Load and display all tracked time
chrome.storage.local.get(['timeData'], (result) => {
  const timeData = result.timeData || {};
  const statsDiv = document.getElementById('stats');
  
  //if no data, shows message
  if (Object.keys(timeData).length === 0) {
    statsDiv.textContent = 'No data yet. Browse some sites!';
    return;
  }
  
  // Create a list of sites and time
  let html = '';
  for (const [site, seconds] of Object.entries(timeData)) {
    const minutes = Math.floor(seconds / 60);
    html += `<div><strong>${site}</strong>: ${minutes}m ${seconds % 60}s</div>`;
  }
  
  statsDiv.innerHTML = html;
});