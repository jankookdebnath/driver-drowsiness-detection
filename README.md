# Driver Drowsiness Detection System 🚗💤

## Problem Statement
Fatigued and distracted driving is a leading cause of severe road traffic accidents worldwide. Often, drivers fail to realize they are slipping into a microsleep or becoming dangerously distracted until it is too late. This project aims to prevent such incidents by providing an active, privacy-first, real-time monitoring system that instantly alerts drivers the moment their concentration drops, their eyes close, or they look away from the road.

## Features & Real-Time Monitoring
- **100% Privacy & Local Processing:** Uses WebAssembly to process all video frames entirely inside the browser. No video data is ever sent to a server.
- **Drowsiness & Microsleep Detection:** Tracks eye closure duration to instantly detect fatigue, drowsiness, and critical microsleeps.
- **Yawning & Eating Detection:** Analyzes mouth aspect ratios and variance over time to detect yawning or distracting behaviors like eating and drinking.
- **Distraction Tracking:** Calculates 3D head pose yaw ratios to ensure the driver is keeping their eyes on the road.
- **Harsh Audio Alarm:** Generates a high-pitched, dual-tone square wave siren specifically designed to jolt the brain awake instantly.
- **Timer-Based Accuracy:** Detection thresholds are based on strict real-time timers (e.g., eyes closed for exactly > 1000ms), rather than variable frame rates, ensuring high accuracy across all devices.

## How It Detects Motion & Behavior
The core of the system relies on mathematical analysis of 478 3D facial landmarks:
1. **Eye Aspect Ratio (EAR):** Computes the vertical vs. horizontal distance of the eye contours. An EAR threshold of `< 0.22` triggers closure timers.
2. **Mouth Aspect Ratio (MAR):** Computes the opening width of the lips. A threshold of `> 0.45` detects wide yawns.
3. **MAR Variance:** Tracks the statistical variance of the mouth over the last 1 second to detect rapid fluctuations indicative of chewing or talking.
4. **Head Yaw Ratio:** Compares the distance from the nose tip to the left and right cheeks to calculate which direction the head is facing, triggering an alert if the driver looks away for > 1.5 seconds.

## Alert Sound Architecture
The alarm does not rely on external MP3 files. It dynamically synthesizes an alarm using the native **Web Audio API**. It utilizes multiple `square` wave oscillators alternating between **2500Hz and 3500Hz**—the peak sensitivity range for the human ear (similar to a smoke detector). The audio signal is digitally overdriven (`gain = 3.0`) to create harsh clipping, guaranteeing maximum irritation to wake the driver.

## Tech Stack & Architecture
- **Frontend:** React.js 19, Vite, Vanilla CSS.
- **Backend:** None required. The entire pipeline operates client-side.
- **AI Library:** Google's `@mediapipe/tasks-vision`.
- **Icons:** `lucide-react`.

**How they interconnect:** The HTML5 `<video>` element captures the webcam feed and passes the frames to the **MediaPipe** WebAssembly module. MediaPipe (using a pre-trained TensorFlow Lite face model) outputs 3D landmark arrays. These arrays are ingested by the **React** `WebcamAnalyzer` component every animation frame, calculating the EAR/MAR/Yaw mathematical ratios. The resulting state triggers UI updates and signals the **Web Audio API** logic in `App.jsx` to fire the alarm.

## Demo Screenshots
*(Add your screenshots here! Example: `![Dashboard View](link-to-image)`)*

## Local Development
1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:5173`
