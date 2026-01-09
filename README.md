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
- 

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
1. Clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the folder where you cloned this repo.

## Future Enhancements
- Add weekly/monthly reports.
- well i want to make it so that user can track how much time they spend on work and on entertainment, but since it have a privacy first approach, i am not sure if i should add this feature :"|
