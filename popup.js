chrome.storage.local.get(['timeData', 'cookingTime'], (result) => {
  const timeData = result.timeData || {};
  const cookingTime = result.cookingTime || 0;
  const statsDiv = document.getElementById('stats');
  
  // Show Cooking Time at the top
  const cookingMinutes = Math.floor(cookingTime / 60);
  const cookingSeconds = cookingTime % 60;
  let html = `<div style="background: #ffeb3b; padding: 10px; margin-bottom: 15px; border-radius: 5px;">
    <strong>🍳 Cooking Time:</strong> ${cookingMinutes}m ${cookingSeconds}s
  </div>`;
  
  // Show all sites
  if (Object.keys(timeData).length === 0) {
    html += 'No data yet. Browse some sites!';
  } else {
    html += '<div style="font-size: 12px;">';
    for (const [site, seconds] of Object.entries(timeData)) {
      const minutes = Math.floor(seconds / 60);
      const emoji = site.includes('flavortown.hackclub.com') ? '🍳 ' : '';
      html += `<div style="margin: 5px 0;">${emoji}<strong>${site}</strong>: ${minutes}m ${seconds % 60}s</div>`;
    }
    html += '</div>';
  }
  statsDiv.innerHTML = html;
});