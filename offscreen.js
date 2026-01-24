// Listen for messages to play sounds
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'playSound') {
    const soundUrl = chrome.runtime.getURL(`sounds/${message.soundFile}`);
    const audio = new Audio(soundUrl);
    audio.play().catch(err => console.log('Offscreen audio error:', err));
  }
});