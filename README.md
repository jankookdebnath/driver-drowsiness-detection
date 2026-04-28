# 🚗 Driver Drowsiness Detection System

### AI-Powered Real-Time Safety Monitor with ML Classification & Emergency Alerts

An advanced, production-grade driver drowsiness detection system that leverages real-time computer vision and machine learning to monitor driver alertness and prevent road accidents. Built with React, MediaPipe FaceLandmarker, and a custom neural network classifier, this system provides multi-dimensional facial analysis with instant visual, audio, and SMS-based emergency notifications.

## 🔑 Key Features

**🧠 AI-Powered Face Analysis**
- Real-time Eye Aspect Ratio (EAR) tracking for drowsiness and microsleep detection
- Mouth Aspect Ratio (MAR) monitoring for yawning, eating, and drinking detection
- Head Pose Estimation (Yaw Ratio) for distraction and lack-of-concentration alerts
- Blink rate analysis for fatigue pattern recognition

**🤖 Custom ML Neural Network**
- Lightweight feedforward neural network (5→12→6 architecture) implemented from scratch — no external ML libraries
- Starts with domain-knowledge-encoded weights, then refines through online backpropagation learning
- Automatically transitions from rule-based to ML-based prediction as it learns driver-specific facial patterns
- Live training progress, accuracy tracking, and confidence scoring displayed in the dashboard

**🚨 Multi-Level Alert System**
- **Level 1 (Warning):** Soft audio beeps for early fatigue and yawning
- **Level 2 (Danger):** Loud siren alarm with screen edge glow for drowsiness and distraction
- **Level 3 (Critical):** Piercing continuous alarm + Text-to-Speech "WAKE UP!" + full-screen flash + SMS notification to emergency contacts

**📊 Comprehensive Monitoring Dashboard**
- Tabbed interface: Real-time Metrics | Alert History | Session Statistics
- SVG donut chart safety score calculated from driving session data
- Event counters for drowsy episodes, microsleeps, yawns, and distractions
- Continuous driving timer with automatic break reminders at 30, 60, and 90 minutes

**📁 Data Logging & Export**
- Persistent event logging with localStorage for cross-session data retention
- One-click CSV export with timestamps, states, alert levels, and all sensor metrics
- Complete session analytics for post-drive review

**📱 Emergency SMS Notifications**
- Twilio-integrated SMS alerts sent to family or emergency contacts during critical states
- Browser push notifications for instant local alerts
- Netlify serverless function for secure API key handling

**📹 Live Camera Feed with Detection Overlay**
- Face bounding box with color-coded corner brackets
- Eye and mouth contour visualization
- Floating HUD with real-time EAR, MAR, Yaw, and blink rate values
- State label badges directly on the video feed
- Red vignette effect during critical states

**🌙 Night Mode**
- Brightness and contrast enhancement for low-light driving conditions

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 19 | UI Framework |
| Vite 8 | Build Tool |
| MediaPipe FaceLandmarker | AI Face Detection |
| Custom Neural Network | ML Classification |
| Web Audio API | Multi-level audio alerts |
| Web Speech API | Text-to-Speech warnings |
| Twilio REST API | SMS notifications |
| Netlify Functions | Serverless backend |
| localStorage | Persistent data logging |

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/jankookdebnath/driver-drowsiness-detection.git

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🌐 Live Demo

[https://driver-drowsiness-detection.netlify.app](https://driver-drowsiness-detection.netlify.app)

## 📄 License

MIT License
