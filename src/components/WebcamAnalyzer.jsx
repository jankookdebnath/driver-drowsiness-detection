import React, { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Eye landmark indices for MediaPipe FaceMesh
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

// Full eye contour for drawing
const LEFT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_CONTOUR = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

// Mouth contour
const MOUTH_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const MOUTH_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];

// Mouth landmark indices for MAR
const MOUTH = [13, 14, 78, 308];

// Head pose landmark indices
const NOSE = 1;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;
const FOREHEAD = 10;
const CHIN = 152;

// Face silhouette for bounding box
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

// Helper to calculate Euclidean distance between two 3D points
const euclideanDistance = (point1, point2) => {
  return Math.sqrt(
    Math.pow(point1.x - point2.x, 2) +
    Math.pow(point1.y - point2.y, 2) +
    Math.pow(point1.z - point2.z, 2)
  );
};

// Helper to calculate Eye Aspect Ratio (EAR)
const calculateEAR = (eye, landmarks) => {
  const p1 = landmarks[eye[0]];
  const p2 = landmarks[eye[1]];
  const p3 = landmarks[eye[2]];
  const p4 = landmarks[eye[3]];
  const p5 = landmarks[eye[4]];
  const p6 = landmarks[eye[5]];

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0.3;

  const v1 = euclideanDistance(p2, p6);
  const v2 = euclideanDistance(p3, p5);
  const h = euclideanDistance(p1, p4);

  return (v1 + v2) / (2.0 * h);
};

// Helper to calculate Mouth Aspect Ratio (MAR)
const calculateMAR = (landmarks) => {
  const topLip = landmarks[MOUTH[0]];
  const bottomLip = landmarks[MOUTH[1]];
  const leftCorner = landmarks[MOUTH[2]];
  const rightCorner = landmarks[MOUTH[3]];

  if (!topLip || !bottomLip || !leftCorner || !rightCorner) return 0.0;

  const v = euclideanDistance(topLip, bottomLip);
  const h = euclideanDistance(leftCorner, rightCorner);

  return v / h;
};

// Helper to calculate Head Yaw Ratio
const calculateHeadYawRatio = (landmarks) => {
  const nose = landmarks[NOSE];
  const leftCheek = landmarks[LEFT_CHEEK];
  const rightCheek = landmarks[RIGHT_CHEEK];

  if (!nose || !leftCheek || !rightCheek) return 1.0;

  const leftDist = euclideanDistance(nose, leftCheek);
  const rightDist = euclideanDistance(nose, rightCheek);

  return leftDist / rightDist;
};

export default function WebcamAnalyzer({ isRunning, onStateUpdate, nightMode, alertLevel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const requestRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State variables for drowsiness detection (Timer-based)
  const EAR_THRESHOLD = 0.22;
  const closedStartTime = useRef(0);
  const yawnStartTime = useRef(0);
  const distractedStartTime = useRef(0);
  const lastBlinkTime = useRef(Date.now());
  const blinksInLastMinute = useRef([]);
  const marHistory = useRef([]);

  useEffect(() => {
    let active = true;

    const setupMediaPipe = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        
        if (active) {
          setIsLoading(false);
          startCamera();
        }
      } catch (err) {
        console.error("Error loading MediaPipe:", err);
        if (active) setError("Failed to load AI model. Please check connection.");
      }
    };

    setupMediaPipe();

    return () => {
      active = false;
      stopCamera();
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }
    } catch (err) {
      console.error("Webcam access denied:", err);
      setError("Please allow webcam access to use the detection.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  // === Drawing Helpers ===

  const getAlertColor = (level) => {
    switch (level) {
      case 3: return '#ff1744';
      case 2: return '#ef4444';
      case 1: return '#f59e0b';
      default: return '#10b981';
    }
  };

  const drawContour = (ctx, indices, landmarks, w, h, color, lineWidth = 2, fill = false) => {
    if (indices.length < 2) return;
    ctx.beginPath();
    const first = landmarks[indices[0]];
    if (!first) return;
    ctx.moveTo(first.x * w, first.y * h);
    for (let i = 1; i < indices.length; i++) {
      const pt = landmarks[indices[i]];
      if (pt) ctx.lineTo(pt.x * w, pt.y * h);
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };

  const drawBoundingBox = (ctx, landmarks, w, h, color) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const idx of FACE_OVAL) {
      const pt = landmarks[idx];
      if (pt) {
        minX = Math.min(minX, pt.x * w);
        minY = Math.min(minY, pt.y * h);
        maxX = Math.max(maxX, pt.x * w);
        maxY = Math.max(maxY, pt.y * h);
      }
    }

    const padding = 15;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;

    // Draw corner brackets instead of full box (more modern look)
    const cornerLen = 20;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Top-left
    ctx.beginPath();
    ctx.moveTo(minX, minY + cornerLen);
    ctx.lineTo(minX, minY);
    ctx.lineTo(minX + cornerLen, minY);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(maxX - cornerLen, minY);
    ctx.lineTo(maxX, minY);
    ctx.lineTo(maxX, minY + cornerLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(minX, maxY - cornerLen);
    ctx.lineTo(minX, maxY);
    ctx.lineTo(minX + cornerLen, maxY);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(maxX - cornerLen, maxY);
    ctx.lineTo(maxX, maxY);
    ctx.lineTo(maxX, maxY - cornerLen);
    ctx.stroke();

    return { minX, minY, maxX, maxY };
  };

  const drawStateLabel = (ctx, state, bbox, w, alertLvl) => {
    const color = getAlertColor(alertLvl);
    const labels = {
      'Alert': { text: '✓ ALERT', bg: 'rgba(16, 185, 129, 0.85)' },
      'Fatigued': { text: '⚠ FATIGUE DETECTED', bg: 'rgba(245, 158, 11, 0.85)' },
      'Drowsy': { text: '🚨 DROWSY — WAKE UP!', bg: 'rgba(239, 68, 68, 0.9)' },
      'Microsleep': { text: '🔴 MICROSLEEP — CRITICAL!', bg: 'rgba(255, 23, 68, 0.95)' },
      'Yawning / Distracted': { text: '⚠ YAWNING / DISTRACTED', bg: 'rgba(245, 158, 11, 0.85)' },
      'Not Concentrating': { text: '🚨 LOOK AT THE ROAD!', bg: 'rgba(239, 68, 68, 0.9)' },
      'Warning': { text: '? FACE NOT DETECTED', bg: 'rgba(245, 158, 11, 0.75)' },
    };

    const config = labels[state] || labels['Alert'];
    const fontSize = alertLvl >= 2 ? 16 : 14;
    ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;
    const textWidth = ctx.measureText(config.text).width;

    const x = bbox ? Math.max(5, bbox.minX) : 10;
    const y = bbox ? Math.max(25, bbox.minY - 12) : 25;

    // Background pill
    ctx.fillStyle = config.bg;
    const pillPadding = 8;
    const pillHeight = fontSize + pillPadding * 2;
    ctx.beginPath();
    const rx = x - pillPadding;
    const ry = y - fontSize - pillPadding + 2;
    const rw = textWidth + pillPadding * 2;
    ctx.roundRect(rx, ry, rw, pillHeight, 6);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(config.text, x, y);
  };

  const drawHUD = (ctx, metrics, w, h) => {
    const hudX = w - 160;
    let hudY = 25;
    const lineHeight = 20;

    // HUD background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(hudX - 12, 8, 165, lineHeight * 4 + 20, 8);
    ctx.fill();

    ctx.font = "bold 12px 'Roboto Mono', monospace";

    // EAR
    ctx.fillStyle = metrics.ear < 0.22 ? '#ef4444' : '#10b981';
    ctx.fillText(`EAR: ${metrics.ear}`, hudX, hudY);
    hudY += lineHeight;

    // MAR
    ctx.fillStyle = metrics.mar > 0.45 ? '#f59e0b' : '#10b981';
    ctx.fillText(`MAR: ${metrics.mar}`, hudX, hudY);
    hudY += lineHeight;

    // Yaw
    ctx.fillStyle = (metrics.yaw < 0.5 || metrics.yaw > 2.0) ? '#ef4444' : '#10b981';
    ctx.fillText(`YAW: ${metrics.yaw}`, hudX, hudY);
    hudY += lineHeight;

    // Blink Rate
    ctx.fillStyle = (metrics.blinkRate > 20 || metrics.blinkRate < 5) ? '#f59e0b' : '#10b981';
    ctx.fillText(`BPM: ${metrics.blinkRate}`, hudX, hudY);
  };

  // Main prediction loop
  const predict = () => {
    if (!isRunning) {
      // Still draw video frame but no detection
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      requestRef.current = requestAnimationFrame(predict);
      return;
    }

    if (
      videoRef.current &&
      videoRef.current.currentTime > 0 &&
      faceLandmarkerRef.current
    ) {
      const startTimeMs = performance.now();
      const results = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Night mode: draw brightness overlay
      if (nightMode) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        // We'll enhance by drawing a semi-transparent white overlay
        // The actual brightness boost is done via CSS filter on the video
        ctx.restore();
      }

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];

        const leftEAR = calculateEAR(LEFT_EYE, landmarks);
        const rightEAR = calculateEAR(RIGHT_EYE, landmarks);
        const averageEAR = (leftEAR + rightEAR) / 2.0;
        const mar = calculateMAR(landmarks);
        const yawRatio = calculateHeadYawRatio(landmarks);

        // --- Drowsiness & Behavior Logic ---
        let currentState = "Alert";
        const now = performance.now();

        // 1. Check Distraction (Head Pose)
        if (yawRatio < 0.5 || yawRatio > 2.0) {
          if (distractedStartTime.current === 0) distractedStartTime.current = now;
        } else {
          distractedStartTime.current = 0;
        }
        const distractedDuration = distractedStartTime.current > 0 ? now - distractedStartTime.current : 0;

        // 2. Check Yawning or Eating (Mouth Movement)
        marHistory.current.push(mar);
        if (marHistory.current.length > 30) marHistory.current.shift();

        let marVariance = 0;
        if (marHistory.current.length === 30) {
          const mean = marHistory.current.reduce((a, b) => a + b, 0) / 30;
          marVariance = marHistory.current.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 30;
        }

        if (mar > 0.45 || marVariance > 0.0015) {
          if (yawnStartTime.current === 0) yawnStartTime.current = now;
        } else {
          yawnStartTime.current = 0;
        }
        const yawnDuration = yawnStartTime.current > 0 ? now - yawnStartTime.current : 0;

        // 3. Check Eyes
        if (averageEAR < EAR_THRESHOLD) {
          if (closedStartTime.current === 0) closedStartTime.current = now;
        } else {
          if (closedStartTime.current > 0) {
            const blinkDuration = now - closedStartTime.current;
            if (blinkDuration > 50 && blinkDuration < 500) {
               const absoluteNow = Date.now();
               blinksInLastMinute.current.push(absoluteNow);
               lastBlinkTime.current = absoluteNow;
            }
          }
          closedStartTime.current = 0;
        }
        const closedDuration = closedStartTime.current > 0 ? now - closedStartTime.current : 0;

        // Determine final state based on STRICT TIMERS
        if (closedDuration >= 1000) {
          currentState = "Microsleep";
        } else if (closedDuration >= 500) {
          currentState = "Drowsy";
        } else if (yawnDuration >= 600) {
          currentState = "Yawning / Distracted";
        } else if (distractedDuration >= 1500) {
          currentState = "Not Concentrating";
        } else if (closedDuration > 100) {
          currentState = "Fatigued";
        } else {
          currentState = "Alert";
        }

        // Blink rate
        const oneMinuteAgo = Date.now() - 60000;
        blinksInLastMinute.current = blinksInLastMinute.current.filter(time => time > oneMinuteAgo);
        const blinkRate = blinksInLastMinute.current.length;

        if (Date.now() - lastBlinkTime.current > 10000 && currentState === "Alert") {
          currentState = "Fatigued";
        }

        const currentMetrics = {
          ear: averageEAR.toFixed(2),
          mar: mar.toFixed(2),
          yaw: yawRatio.toFixed(2),
          blinkRate,
          isTracking: true,
          closedFramesRatio: Math.min(closedDuration / 1000, 1),
        };

        // --- Draw Rich Overlays ---
        const currentAlertLevel = alertLevel || 0;
        const overlayColor = getAlertColor(currentAlertLevel);

        // 1. Face bounding box (corner brackets)
        const bbox = drawBoundingBox(ctx, landmarks, w, h, overlayColor);

        // 2. Eye contours
        drawContour(ctx, LEFT_EYE_CONTOUR, landmarks, w, h, overlayColor, 2);
        drawContour(ctx, RIGHT_EYE_CONTOUR, landmarks, w, h, overlayColor, 2);

        // 3. Eye landmark points
        ctx.fillStyle = overlayColor;
        [...LEFT_EYE, ...RIGHT_EYE].forEach(index => {
          const point = landmarks[index];
          ctx.beginPath();
          ctx.arc(point.x * w, point.y * h, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        });

        // 4. Mouth contour
        const mouthColor = mar > 0.45 ? '#f59e0b' : 'rgba(255, 255, 255, 0.4)';
        drawContour(ctx, MOUTH_OUTER, landmarks, w, h, mouthColor, 1.5);
        if (mar > 0.3) {
          drawContour(ctx, MOUTH_INNER, landmarks, w, h, mouthColor, 1, true);
        }

        // 5. Head pose indicator (nose to cheeks line)
        const nose = landmarks[NOSE];
        const forehead = landmarks[FOREHEAD];
        const chin = landmarks[CHIN];
        if (nose && forehead && chin) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(forehead.x * w, forehead.y * h);
          ctx.lineTo(nose.x * w, nose.y * h);
          ctx.lineTo(chin.x * w, chin.y * h);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 6. State label overlay
        drawStateLabel(ctx, currentState, bbox, w, currentAlertLevel);

        // 7. HUD (metric values)
        drawHUD(ctx, currentMetrics, w, h);

        // 8. Critical state: red vignette
        if (currentAlertLevel >= 2) {
          const gradient = ctx.createRadialGradient(w/2, h/2, w * 0.3, w/2, h/2, w * 0.7);
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
          gradient.addColorStop(1, `rgba(239, 68, 68, ${currentAlertLevel === 3 ? 0.3 : 0.15})`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
        }

        onStateUpdate(currentState, currentMetrics);

      } else {
        // No face detected
        ctx.font = "bold 16px 'Inter', sans-serif";
        ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
        const text = '⚠ NO FACE DETECTED';
        const textWidth = ctx.measureText(text).width;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(w/2 - textWidth/2 - 12, h/2 - 20, textWidth + 24, 36, 8);
        ctx.fill();
        
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(text, w/2 - textWidth/2, h/2);

        onStateUpdate("Warning", { ear: 0, mar: 0, yaw: 0, blinkRate: 0, isTracking: false, closedFramesRatio: 0 });
      }
    }

    requestRef.current = requestAnimationFrame(predict);
  };

  useEffect(() => {
    if (!isLoading && !error) {
      requestRef.current = requestAnimationFrame(predict);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isLoading, error, isRunning, nightMode, alertLevel]);

  return (
    <div className="video-container">
      {isLoading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Loading AI Model...</p>
        </div>
      )}
      {error && (
        <div className="video-error">
          {error}
        </div>
      )}
      <video
        ref={videoRef}
        className="video-element"
        autoPlay
        playsInline
        muted
        style={{
          display: (isLoading || error) ? 'none' : 'block',
          filter: nightMode ? 'brightness(1.5) contrast(1.2)' : 'none',
        }}
      />
      <canvas
        ref={canvasRef}
        className="canvas-element"
        width={640}
        height={480}
      />
    </div>
  );
}
