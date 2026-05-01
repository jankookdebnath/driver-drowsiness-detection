# Driver Drowsiness Detection System 🚗💤

- **Live Demo / Website:** (https://driver-drowsiness-system.surge.sh/)*
- **GitHub Repository:** [https://github.com/jankookdebnath/driver-drowsiness-detection](https://github.com/jankookdebnath/driver-drowsiness-detection)

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

### What Was Used & Why
- **Frontend Framework: React.js 19 & Vite** 
  - *Why:* React provides an efficient, component-based architecture for managing complex state (like alert levels, timers, and UI toggles) seamlessly. Vite is used as the build tool because of its incredibly fast Hot Module Replacement (HMR) and optimized build process, which is essential for a high-performance computer vision app.
- **Styling: Vanilla CSS**
  - *Why:* Keeps the project lightweight and avoids the overhead of large CSS frameworks, ensuring the browser can dedicate maximum resources to processing video frames.
- **Computer Vision / AI: Google's `@mediapipe/tasks-vision`**
  - *Why:* MediaPipe offers state-of-the-art machine learning models optimized for the web. By utilizing its WebAssembly (Wasm) backend, we achieve near-native performance for 3D face landmark detection directly in the browser. This eliminates the need for a backend Python server, ensuring zero latency and 100% data privacy.
- **Audio Generation: Native Web Audio API**
  - *Why:* Instead of loading static MP3 files which can have playback delays, the Web Audio API programmatically synthesizes a dual-tone square wave alarm. This allows for immediate, harsh, and loud alerts that are specifically designed to jolt a driver awake.
- **Icons: `lucide-react`**
  - *Why:* Provides clean, consistent, and lightweight SVG icons for the dashboard interface.

### How They Interconnect (The Data Flow)
1. **Video Capture:** The application requests webcam access, and the standard HTML5 `<video>` element continuously captures the live feed.
2. **AI Processing:** On every animation frame (`requestAnimationFrame`), the current video frame is piped into the **MediaPipe** WebAssembly module.
3. **Feature Extraction:** MediaPipe processes the frame using a pre-trained TensorFlow Lite face model and outputs a dense array of 478 3D facial landmarks.
4. **Mathematical Analysis:** The **React** `WebcamAnalyzer` component ingests these landmarks. It calculates precise geometrical metrics in real-time: Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR), MAR variance, and Head Yaw Ratio.
5. **State Management & Logic:** These mathematical ratios are compared against predefined strict thresholds. If a threshold is breached (e.g., EAR < 0.22 for more than 1000ms), React's state management (`useState`, `useRef`) updates the application state.
6. **Triggering Alerts:** This state change triggers instant UI updates (red flashing screens, warning text) and signals the **Web Audio API** logic in `App.jsx` to activate the synthesized siren, alerting the driver immediately.

## Demo Screenshots
*(Add your screenshots here! Example: `![Dashboard View](link-to-image)`)*

## Local Development
1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:5173`
