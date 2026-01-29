# Web Time Tracker Extension

A Chrome Extension that tracks how much time you spend on different websites. So, you can track how much time you spend on social media, work, or entertainment. This extension I made for FlavorTown Hack Club, where users upload their recipes(projects) and share them with the community. I figured it out that users might need this extension to do more than just tracking their time, but also to track their time on the website itself.

## The Goal
The goal of this project is to create a lightweight tool that helps users become aware of their browsing habits without compromising their privacy. All data is processed and stored locally on the user's browser.

## Features (In Progress)
- Calculate time spent per website.
- Save data to local storage.
- Beautiful dashboard to visualize time usage.
- FlavorTown Integration: Identifies usage via Project ID {your_id} using custom HTTP headers.
- User can mark the website as study or procrastination. 
- User can see the percentage of time spent on each website through the visualization of pie chart.
- User can also see time of websites used in this month of week, User can also scroll through past months,weeks or days
- User can also set the pomodoro focus session with break, and this focus session will be counted in the study time.
- Personal Leaderboard to show your top 10 websites ,and Displays your personal records like study streaks, longest focus session, and earned badges
- Personal leaderboard will also Compares this week vs last week to show if you're improving (more study time, less procrastination)
- Personal leaderboard will also show the comparision of your time spent this week and last week. 
- During pomodoro focus sessions, it will block distraction sites. User can also add or remove the distractions site through UI

## Privacy First
Unlike other trackers, this extension:
- **Does NOT** send your data to a server.
- **Does NOT** track your personal information or passwords.
- **Does NOT** use third-party cookies.
Everything stays on your machine.

## Tech Stack
- **Manifest V3** (Chrome Extension API)
- **Vanilla JavaScript**
- **HTML/CSS**

## How to Install
# For FireFox:
1. If you use FireFox, then go to this link to get the extension.
https://addons.mozilla.org/en-US/firefox/addon/sizzle-focus-habit-tracker/
# For Chrome:
For Chrome/Edge:
Download the extension.zip from the Releases page and unzip it.

Open your browser and navigate to chrome://extensions/.

Enable Developer mode (usually a toggle in the top right).

Click Load unpacked and select the folder where you unzipped the files.

## Future Enhancements
- well i want to make it so that user can track how much time they spend on work and on entertainment, but since it have a privacy first approach, i am not sure if i should add this feature :"|
- Integrate with Focus sessions, and my new project STUDYFOCUS

### Note:
This uploaded project on github works for Chrome, if you want to use it on Firefox, please go to this link to get the extension.
https://addons.mozilla.org/en-US/firefox/addon/sizzle-focus-habit-tracker/
Or, you can update the manifest.json file with firefoxjson.txt


