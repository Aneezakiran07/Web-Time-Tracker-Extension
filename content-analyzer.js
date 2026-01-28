// YouTube content classification
const EDUCATION_KEYWORDS = [
  'tutorial', 'lecture', 'lesson', 'course', 'learn', 'study', 'education',
  'programming', 'coding', 'mathematics', 'physics', 'chemistry', 'biology',
  'algorithm', 'data structure', 'documentation', 'how to', 'guide',
  'academy', 'university', 'professor', 'instructor', 'educational',
  'explained', 'basics', 'fundamentals', 'introduction to', 'crash course',
  'calculus', 'engineering', 'science', 'research', 'analysis', 'theory',
  'computer science', 'web development', 'machine learning', 'ai tutorial'
];

const DISTRACTION_KEYWORDS = [
  'vlog', 'funny', 'meme', 'react', 'challenge', 'prank', 'gaming',
  'gameplay', 'lets play', 'stream', 'highlights', 'compilation',
  'music video', 'mv', 'official video', 'entertainment', 'shorts',
  'tiktok', 'fails', 'top 10', 'best of', 'funny moments', 'reaction',
  'drama', 'gossip', 'podcast', 'unboxing', 'review', 'haul', 'asmr',
  'mukbang', 'storytime', 'try not to laugh', 'caught on camera'
];

const EDUCATION_CHANNELS = [
  'mit', 'stanford', 'harvard', 'khan academy', 'crashcourse',
  'freecodecamp', 'traversy media', 'corey schafer', 'sentdex',
  '3blue1brown', 'fireship', 'computerphile', 'numberphile',
  'veritasium', 'vsauce', 'kurzgesagt', 'ted-ed', 'academind',
  'net ninja', 'programming with mosh', 'code with harry'
];

function analyzeYouTubeContent(url, title = '', channelName = '') {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  const channelLower = channelName.toLowerCase();
  
  if (urlLower.includes('/shorts/')) {
    return { isEducational: false, confidence: 0.95 };
  }
  
  const isEducationalChannel = EDUCATION_CHANNELS.some(ch => channelLower.includes(ch));
  if (isEducationalChannel) {
    return { isEducational: true, confidence: 0.85 };
  }
  
  let educationScore = 0;
  let distractionScore = 0;
  
  EDUCATION_KEYWORDS.forEach(keyword => {
    if (titleLower.includes(keyword)) educationScore += 2;
    if (channelLower.includes(keyword)) educationScore += 1;
  });
  
  DISTRACTION_KEYWORDS.forEach(keyword => {
    if (titleLower.includes(keyword)) distractionScore += 3;
    if (channelLower.includes(keyword)) distractionScore += 1;
  });
  
  if (educationScore >= 3 && educationScore > distractionScore) {
    const confidence = Math.min(educationScore * 0.15, 0.8);
    return { isEducational: true, confidence };
  } else if (distractionScore > educationScore) {
    const confidence = Math.min(distractionScore * 0.15, 0.85);
    return { isEducational: false, confidence };
  }
  
  return { isEducational: false, confidence: 0.5 };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyzeYouTubeContent };
}
