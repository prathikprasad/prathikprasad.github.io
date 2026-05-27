// ==========================================================================
// AetherVision - Core Application Logic
// ==========================================================================

// Wait for MediaPipe libraries to load
function waitForMediaPipe() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds with 500ms intervals
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.FilesetResolver && window.HandLandmarker && window.FaceLandmarker) {
        clearInterval(checkInterval);
        console.log("✅ MediaPipe libraries loaded from global scope");
        resolve(true);
        return;
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn("⚠️ MediaPipe libraries not found - ORB issue detected");
        
        // Check if it's the ORB issue
        if (window.MediaPipeLoadFailed) {
          const loaderStatus = document.getElementById("loader-status");
          if (loaderStatus) {
            loaderStatus.innerHTML = `<span style="color: #ffaa00;">⚠️ Local Development Limitation</span><br>MediaPipe CDN blocked by browser security (ORB).<br><br>This works when deployed to GitHub Pages!<br><br><button id="deploy-btn" style="padding: 10px 16px; background: #9d00ff; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 12px; margin-top: 10px;">Deploy to GitHub Pages</button><br><span style="font-size:0.75rem; margin-top: 8px; display: block;">Or run: npm install && npm run build</span>`;
            
            const deployBtn = document.getElementById("deploy-btn");
            if (deployBtn) {
              deployBtn.onclick = () => {
                alert("Push your code to GitHub, then enable GitHub Pages in your repo settings to deploy automatically!");
              };
            }
          }
          resolve(false);
          return;
        }
        
        resolve(false);
      }
    }, 500);
  });
}

// Start initialization after MediaPipe loads or timeout
waitForMediaPipe().then((loaded) => {
  if (loaded) {
    console.log("🚀 Starting initialization...");
    init();
  } else {
    console.warn("⚠️ Cannot initialize without MediaPipe libraries");
  }
});

// HTML Elements
const video = document.getElementById("webcam");
const canvas = document.getElementById("output-canvas");
const ctx = canvas.getContext("2d");

const loadingOverlay = document.getElementById("loading-overlay");
const loaderStatus = document.getElementById("loader-status");
const loaderProgress = document.getElementById("loader-progress");

const calibrationOverlay = document.getElementById("calibration-overlay");
const calPointsContainer = document.getElementById("cal-points-container");
const startCalBtn = document.getElementById("start-calibration-btn");
const skipCalBtn = document.getElementById("skip-calibration-btn");
const btnCalibrate = document.getElementById("btn-calibrate");
const gazePointer = document.getElementById("gaze-pointer");

const toggleCameraBtn = document.getElementById("toggle-camera-btn");
const valLatency = document.getElementById("val-latency");
const valFps = document.getElementById("val-fps");
const valHandsCount = document.getElementById("val-hands-count");
const valBlinks = document.getElementById("val-blinks");
const valGazeDir = document.getElementById("val-gaze-dir");
const valGazeX = document.getElementById("val-gaze-x");
const valGazeY = document.getElementById("val-gaze-y");
const vectorCursor = document.getElementById("vector-cursor");
const barDistance = document.getElementById("bar-distance");
const lblDistance = document.getElementById("lbl-distance");

const gestureIndicatorWrap = document.getElementById("gesture-indicator-wrap");
const valGesture = document.getElementById("val-gesture");
const systemStatusText = document.getElementById("system-status-text");

// Toggles & Preferences
const chkFaceMesh = document.getElementById("chk-facemesh");
const chkHands = document.getElementById("chk-hands");
const chkIrises = document.getElementById("chk-irises");
const chkGazeLine = document.getElementById("chk-gazeline");
const chkBounding = document.getElementById("chk-bounding");
const chkGazePtr = document.getElementById("chk-gazeptr");

// Application State
let handLandmarker = null;
let faceLandmarker = null;
let cameraActive = false;
let stream = null;
let activeTheme = "cyberpunk";
let lastVideoTime = -1;
let lastTimestamp = 0;
let modelFps = 0.0;
let lastFpsUpdate = 0;
let frameCount = 0;

// Blink tracking
let blinkCount = 0;
let eyesClosed = false;
const BLINK_THRESHOLD = 0.085; // Height/Width aspect ratio threshold

// Gaze calibration & mapping
let isCalibrating = false;
let calibrationStep = 0;
let isCollectingSamples = false;
let sampleFramesCollected = 0;
const SAMPLES_TO_COLLECT = 25; // number of frames to average per dot
let currentSamples = { rx: 0, ry: 0 };
let calibrationData = []; // [{ targetX, targetY, rx, ry }]
let gazeModel = null; // trained { Wx, Wy } coefficients
let currentGazeRatios = { rx: 0.5, ry: 0.5 }; // raw ratios

// Gesture Tracking
let currentGesture = "No Hand";

// SVGs for gestures
const gestureSVGs = {
  "Fist": `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10a2 2 0 0 0-2-2h-.01"></path><path d="M7.5 12h9a2.5 2.5 0 0 0 2.5-2.5V9a2.5 2.5 0 0 0-2.5-2.5H16"></path><path d="M16 6.5h-9A3.5 3.5 0 0 0 3.5 10v7.5A3 3 0 0 0 6.5 20h8a3 3 0 0 0 3-3v-4"></path><path d="M8.5 14h5a1.5 1.5 0 0 0 1.5-1.5v0a1.5 1.5 0 0 0-1.5-1.5h-5"></path></svg>`,
  "Open Hand": `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4.5"></path><path d="M6 10V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v9a7 7 0 0 0 7 7h1a8 8 0 0 0 8-8v-3a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2"></path></svg>`,
  "Victory": `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12V8a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v4"></path><path d="M14 11V6a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v5"></path><path d="M10 13V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path><path d="M6 13V11a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6a5 5 0 0 0 5 5h1a6 6 0 0 0 6-6v-1"></path></svg>`,
  "Pointing": `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14V5a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v9"></path><path d="M14 13V9a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v5"></path><path d="M10 15V11a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"></path><path d="M6 15v-2a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6a5 5 0 0 0 5 5h1a6 6 0 0 0 6-6v-3"></path></svg>`,
  "Thumbs Up": `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`,
  "Active Hand": `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4.5"></path><path d="M6 10V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v9a7 7 0 0 0 7 7h1a8 8 0 0 0 8-8v-3a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2"></path></svg>`,
  "No Hand": `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4.5"></path><path d="M6 10V8c0-.62-.28-1.18-.73-1.55l7.98 7.98"></path><path d="M9.1 14.2A7 7 0 0 0 15 17h1a8 8 0 0 0 8-8v-3a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2"></path></svg>`
};

// Connections maps for drawing facial features
const faceConnections = {
  silhouette: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  rightEye: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  leftEyebrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightEyebrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  lipsOuter: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 95]
};

const handConnections = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17] // Knuckles connection
];

// Setup Theme Styles dictionary
const themeStyles = {
  cyberpunk: {
    faceLines: "rgba(157, 0, 255, 0.45)",
    faceLineWidth: 1,
    eyeLines: "rgba(0, 240, 255, 0.6)",
    irisFill: "#00f0ff",
    irisGlow: "rgba(0, 240, 255, 0.5)",
    gazeRay: "#ff007f",
    handLines: "rgba(0, 240, 255, 0.6)",
    handJoint: "#ff007f",
    boundingBox: "rgba(255, 0, 127, 0.5)"
  },
  hologram: {
    faceLines: "rgba(0, 216, 255, 0.35)",
    faceLineWidth: 0.8,
    eyeLines: "rgba(57, 255, 20, 0.6)",
    irisFill: "#39ff14",
    irisGlow: "rgba(57, 255, 20, 0.5)",
    gazeRay: "#00d8ff",
    handLines: "rgba(0, 216, 255, 0.5)",
    handJoint: "#39ff14",
    boundingBox: "rgba(0, 216, 255, 0.4)"
  },
  minimalist: {
    faceLines: "rgba(255, 255, 255, 0.12)",
    faceLineWidth: 0.5,
    eyeLines: "rgba(255, 255, 255, 0.4)",
    irisFill: "#ffffff",
    irisGlow: "rgba(255, 255, 255, 0.2)",
    gazeRay: "#ffffff",
    handLines: "rgba(255, 255, 255, 0.3)",
    handJoint: "#ffffff",
    boundingBox: "rgba(255, 255, 255, 0.15)"
  }
};

// Initialize Application
async function init() {
  try {
    // Display more detailed progress
    console.log("🚀 Starting AetherVision initialization...");
    
    updateLoader("Loading WebAssembly Core...", 25);
    console.log("📦 Fetching MediaPipe WebAssembly...");
    
    try {
      const vision = await Promise.race([
        window.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout loading WebAssembly (30s)")), 30000)
        )
      ]);
      console.log("✅ WebAssembly loaded successfully");

      updateLoader("Loading Hand Tracking Model...", 50);
      console.log("📥 Loading Hand Landmarker model...");
      
      try {
        handLandmarker = await Promise.race([
          window.HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout loading Hand model (60s)")), 60000)
          )
        ]);
        console.log("✅ Hand model loaded (GPU)");
      } catch (err) {
        console.warn("⚠️ GPU delegate failed, trying CPU...", err.message);
        updateLoader("Hand Model Loading (CPU)...", 55);
        handLandmarker = await window.HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        console.log("✅ Hand model loaded (CPU fallback)");
      }

      updateLoader("Loading Face Tracking Model...", 75);
      console.log("📥 Loading Face Landmarker model...");
      
      try {
        faceLandmarker = await Promise.race([
          window.FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            outputFaceBlendshapes: false
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout loading Face model (60s)")), 60000)
          )
        ]);
        console.log("✅ Face model loaded (GPU)");
      } catch (err) {
        console.warn("⚠️ GPU delegate failed, trying CPU...", err.message);
        updateLoader("Face Model Loading (CPU)...", 80);
        faceLandmarker = await window.FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          outputFaceBlendshapes: false
        });
        console.log("✅ Face model loaded (CPU fallback)");
      }

      updateLoader("Requesting camera permission...", 90);
      console.log("📹 Requesting camera access...");
      
      await startCamera();
      console.log("✅ Camera started successfully");

      // Hide loader with a fade
      loadingOverlay.classList.add("fade-out");
      systemStatusText.textContent = "Tracking Active";
      console.log("🎉 AetherVision initialization complete!");

    } catch (networkError) {
      console.error("❌ Network/Resource loading failed:", networkError);
      throw networkError;
    }

  } catch (error) {
    console.error("❌ Initialization failed:", error);
    console.error("Error stack:", error.stack);
    loaderStatus.style.color = "#ff0055";
    let errorMsg = error.message || "Unknown error";
    
    // Specific error handling
    if (errorMsg.includes("Permission denied") || errorMsg.includes("NotAllowedError")) {
      errorMsg = "📷 Camera permission denied. Please allow camera access in browser settings.";
    } else if (errorMsg.includes("NotFoundError") || errorMsg.includes("NotAllowed")) {
      errorMsg = "📷 No camera found or permission denied.";
    } else if (errorMsg.includes("Timeout")) {
      errorMsg = "⏱️ Loading took too long. Check internet connection or try again.";
    } else if (errorMsg.includes("Failed to fetch") || errorMsg.includes("404")) {
      errorMsg = "🌐 Failed to download AI models. Check internet or try a different CDN.";
    }
    
    loaderStatus.innerHTML = `<span style="color: #ff0055;">ERROR</span><br>${errorMsg}<br><br><button id="retry-btn" style="padding: 8px 16px; background: #9d00ff; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button><br><span style="font-size:0.75rem; margin-top: 8px; display: block;">Check browser console (F12) for details</span>`;
    
    // Add retry button functionality
    setTimeout(() => {
      const retryBtn = document.getElementById("retry-btn");
      if (retryBtn) {
        retryBtn.onclick = () => {
          console.log("🔄 User clicked retry...");
          location.reload();
        };
      }
    }, 500);
  }
}

function updateLoader(text, progress) {
  loaderStatus.textContent = text;
  loaderProgress.style.width = `${progress}%`;
}

// Camera controls
async function startCamera() {
  if (cameraActive) return;
  
  const constraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user"
    },
    audio: false
  };

  try {
    console.log("🎥 Requesting camera access with constraints:", constraints);
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("✅ Camera stream obtained:", stream);
    
    video.srcObject = stream;
    cameraActive = true;

    // Wait for metadata with timeout
    return new Promise((resolve, reject) => {
      const metadataTimeout = setTimeout(() => {
        reject(new Error("Timeout waiting for camera metadata (10s)"));
      }, 10000);

      video.addEventListener("loadedmetadata", () => {
        clearTimeout(metadataTimeout);
        console.log("✅ Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight);
        
        resizeCanvas();
        video.play()
          .then(() => {
            console.log("✅ Video playback started");
            requestAnimationFrame(renderLoop);
            resolve();
          })
          .catch(err => {
            clearTimeout(metadataTimeout);
            console.error("❌ Error starting video playback:", err);
            reject(err);
          });
      }, { once: true });

      video.addEventListener("error", (e) => {
        clearTimeout(metadataTimeout);
        console.error("❌ Video element error:", e);
        reject(new Error("Video element error: " + e));
      }, { once: true });
    });
  } catch (error) {
    console.error("❌ Camera access failed:", error);
    cameraActive = false;
    stream = null;
    throw error;
  }
}

function stopCamera() {
  if (!cameraActive) return;
  if (stream) {
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
  }
  video.srcObject = null;
  cameraActive = false;
  console.log("✅ Camera stopped");
}

function resizeCanvas() {
  if (video.videoWidth && video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    console.log("📐 Canvas resized to:", canvas.width, "x", canvas.height);
  }
}

// Event Listeners
window.addEventListener("resize", resizeCanvas);

// Camera Toggle Button
toggleCameraBtn.addEventListener("click", () => {
  if (cameraActive) {
    stopCamera();
    toggleCameraBtn.classList.remove("active");
    toggleCameraBtn.querySelector("span").textContent = "Camera Off";
    systemStatusText.textContent = "Camera Paused";
    systemStatusText.previousElementSibling.className = "status-indicator offline";
  } else {
    startCamera();
    toggleCameraBtn.classList.add("active");
    toggleCameraBtn.querySelector("span").textContent = "Webcam On";
    systemStatusText.textContent = "Tracking Active";
    systemStatusText.previousElementSibling.className = "status-indicator online";
  }
});

// Theme Selectors
document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
    const selectedBtn = e.currentTarget;
    selectedBtn.classList.add("active");
    
    const theme = selectedBtn.dataset.theme;
    document.body.className = `theme-${theme}`;
    activeTheme = theme;
  });
});

// Calibration triggers
btnCalibrate.addEventListener("click", startGazeCalibration);
startCalBtn.addEventListener("click", runCalibrationSequence);
skipCalBtn.addEventListener("click", () => {
  calibrationOverlay.classList.add("hidden");
  isCalibrating = false;
});

// Calibration implementation
function startGazeCalibration() {
  isCalibrating = true;
  calibrationStep = 0;
  calibrationData = [];
  calibrationOverlay.classList.remove("hidden");
  document.querySelector(".calibration-instruction").classList.remove("hidden");
  calPointsContainer.classList.add("hidden");
}

function runCalibrationSequence() {
  document.querySelector(".calibration-instruction").classList.add("hidden");
  calPointsContainer.classList.remove("hidden");
  showNextCalibrationDot();
}

function showNextCalibrationDot() {
  // Hide all dots
  document.querySelectorAll(".cal-dot").forEach(dot => {
    dot.classList.remove("active");
    dot.style.display = "none";
  });

  const nextDot = document.getElementById(`cal-pt-${calibrationStep + 1}`);
  if (nextDot) {
    nextDot.style.display = "flex";
    nextDot.classList.add("active");
    
    // Set up click handler once
    nextDot.onclick = () => {
      nextDot.onclick = null; // disable clicks
      nextDot.style.pointerEvents = "none";
      
      // Start sample collection
      isCollectingSamples = true;
      sampleFramesCollected = 0;
      currentSamples = { rx: 0, ry: 0 };
      
      // Visual indicator on the dot (simulated sample collection progress)
      let ticks = 0;
      const interval = setInterval(() => {
        ticks++;
        nextDot.style.transform = `scale(${1 + (ticks * 0.05)})`;
        if (ticks >= 10) {
          clearInterval(interval);
          
          // Complete point sample collection
          isCollectingSamples = false;
          nextDot.style.transform = "";
          nextDot.style.pointerEvents = "auto";
          
          // Save calibration coordinates
          const rect = nextDot.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();
          // Normalize coordinate relative to video canvas space
          const targetX = ((rect.left + rect.width / 2) - canvasRect.left) / canvasRect.width * canvas.width;
          const targetY = ((rect.top + rect.height / 2) - canvasRect.top) / canvasRect.height * canvas.height;
          
          const rx = currentSamples.rx / sampleFramesCollected;
          const ry = currentSamples.ry / sampleFramesCollected;
          
          calibrationData.push({ targetX, targetY, rx, ry });
          
          calibrationStep++;
          if (calibrationStep >= 5) {
            finishCalibration();
          } else {
            showNextCalibrationDot();
          }
        }
      }, 50);
    };
  }
}

function finishCalibration() {
  calPointsContainer.classList.add("hidden");
  calibrationOverlay.classList.add("hidden");
  isCalibrating = false;
  
  // Train model
  gazeModel = trainGazeModel(calibrationData);
  if (gazeModel) {
    console.log("Gaze model trained successfully:", gazeModel);
    btnCalibrate.classList.add("active");
    btnCalibrate.querySelector("span").textContent = "Recalibrate Gaze";
  } else {
    console.warn("Failed to train gaze model.");
  }
}

// 3D Linear Regression model using Least Squares fitting
function trainGazeModel(data) {
  const n = data.length;
  if (n < 3) return null;

  let s_1 = n;
  let s_rx = 0, s_ry = 0;
  let s_rx2 = 0, s_ry2 = 0, s_rxry = 0;
  let s_tx = 0, s_ty = 0;
  let s_rx_tx = 0, s_ry_tx = 0;
  let s_rx_ty = 0, s_ry_ty = 0;

  for (let i = 0; i < n; i++) {
    const pt = data[i];
    s_rx += pt.rx;
    s_ry += pt.ry;
    s_rx2 += pt.rx * pt.rx;
    s_ry2 += pt.ry * pt.ry;
    s_rxry += pt.rx * pt.ry;
    
    s_tx += pt.targetX;
    s_ty += pt.targetY;
    s_rx_tx += pt.rx * pt.targetX;
    s_ry_tx += pt.ry * pt.targetX;
    s_rx_ty += pt.rx * pt.targetY;
    s_ry_ty += pt.ry * pt.targetY;
  }

  // Linear system matrix A (X^T * X)
  const A = [
    [s_1, s_rx, s_ry],
    [s_rx, s_rx2, s_rxry],
    [s_ry, s_rxry, s_ry2]
  ];

  const Bx = [s_tx, s_rx_tx, s_ry_tx];
  const By = [s_ty, s_rx_ty, s_ry_ty];

  const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
              A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
              A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  if (Math.abs(det) < 1e-7) {
    return null;
  }

  // Calculate 3x3 Inverse
  const invA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  invA[0][0] = (A[1][1] * A[2][2] - A[1][2] * A[2][1]) / det;
  invA[0][1] = (A[0][2] * A[2][1] - A[0][1] * A[2][2]) / det;
  invA[0][2] = (A[0][1] * A[1][2] - A[0][2] * A[1][1]) / det;
  
  invA[1][0] = (A[1][2] * A[2][0] - A[1][0] * A[2][2]) / det;
  invA[1][1] = (A[0][0] * A[2][2] - A[0][2] * A[2][0]) / det;
  invA[1][2] = (A[0][2] * A[1][0] - A[0][0] * A[1][2]) / det;
  
  invA[2][0] = (A[1][0] * A[2][1] - A[1][1] * A[2][0]) / det;
  invA[2][1] = (A[0][1] * A[2][0] - A[0][0] * A[2][1]) / det;
  invA[2][2] = (A[0][0] * A[1][1] - A[0][1] * A[1][0]) / det;

  const Wx = [
    invA[0][0] * Bx[0] + invA[0][1] * Bx[1] + invA[0][2] * Bx[2],
    invA[1][0] * Bx[0] + invA[1][1] * Bx[1] + invA[1][2] * Bx[2],
    invA[2][0] * Bx[0] + invA[2][1] * Bx[1] + invA[2][2] * Bx[2]
  ];

  const Wy = [
    invA[0][0] * By[0] + invA[0][1] * By[1] + invA[0][2] * By[2],
    invA[1][0] * By[0] + invA[1][1] * By[1] + invA[1][2] * By[2],
    invA[2][0] * By[0] + invA[2][1] * By[1] + invA[2][2] * By[2]
  ];

  return { Wx, Wy };
}

// Predict screen coordinates based on eye ratio and regression coefficients
function predictGaze(rx, ry) {
  if (gazeModel) {
    const { Wx, Wy } = gazeModel;
    const x = Wx[0] + Wx[1] * rx + Wx[2] * ry;
    const y = Wy[0] + Wy[1] * rx + Wy[2] * ry;
    return { x, y };
  } else {
    // Fallback: Map the ranges. Normal screen mirrors the camera, so larger xRatio means looking left?
    // Let's calibrate roughly: xRatio centered at ~0.5. Range is approx [0.38, 0.62].
    // rx = 0.5 -> center (canvas.width / 2)
    // ry = 0.5 -> center (canvas.height / 2). Range is approx [0.42, 0.58].
    const normX = (rx - 0.38) / (0.62 - 0.38 || 1);
    const normY = (ry - 0.42) / (0.58 - 0.42 || 1);
    
    // Clamp values slightly
    const clampedX = Math.max(0, Math.min(1, normX));
    const clampedY = Math.max(0, Math.min(1, normY));

    // Mirroring correction (Since camera and canvas are flipped in scaleX(-1), looking left on screen
    // means iris moves left on canvas, which in mirror is looking right)
    return {
      x: (1 - clampedX) * canvas.width,
      y: clampedY * canvas.height
    };
  }
}

// Main Frame Rendering Loop
function renderLoop() {
  if (!cameraActive) return;

  try {
    const startTimeMs = performance.now();
    let latency = 0;

    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;

      // Running models - use monotonically increasing timestamp
      const now = performance.now();
      const timestamp = Math.max(Math.round(now), lastTimestamp + 1);
      lastTimestamp = timestamp;
      let handResult = { landmarks: [], handednesses: [] };
      let faceResult = { faceLandmarks: [] };

      try {
        handResult = handLandmarker.detectForVideo(video, timestamp);
      } catch (err) {
        console.error("HandLandmarker error:", err);
      }

      try {
        faceResult = faceLandmarker.detectForVideo(video, timestamp);
      } catch (err) {
        console.error("FaceLandmarker error:", err);
      }

      latency = Math.round(performance.now() - startTimeMs);
      if (valLatency) valLatency.textContent = latency;

    // Clear and redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get Active Theme Style
    const style = themeStyles[activeTheme];

    // Face mesh drawing & gaze tracking
    let faceLandmarks = faceResult.faceLandmarks;
    if (faceLandmarks && faceLandmarks.length > 0) {
      const landmarks = faceLandmarks[0];
      
      // Calculate eye metrics
      const eyeMetrics = getEyeMetrics(landmarks);
      if (eyeMetrics) {
        currentGazeRatios = { rx: eyeMetrics.xRatio, ry: eyeMetrics.yRatio };
        
        // Handle blink detection
        handleBlinkDetection(eyeMetrics.ear);
        
        // Gather samples during calibration
        if (isCollectingSamples) {
          currentSamples.rx += eyeMetrics.xRatio;
          currentSamples.ry += eyeMetrics.yRatio;
          sampleFramesCollected++;
        }

        // Calculate gaze direction relative to center offset
        const dx = eyeMetrics.xRatio - 0.5;
        const dy = eyeMetrics.yRatio - 0.5;
        
        // Update gaze analytics dashboard
          if (valGazeX) valGazeX.textContent = dx.toFixed(2);
          if (valGazeY) valGazeY.textContent = dy.toFixed(2);
          
          // Offset range mapping: dx ranges from [-0.12, 0.12]
          const limitX = Math.max(-1, Math.min(1, dx / 0.12));
          const limitY = Math.max(-1, Math.min(1, dy / 0.08));
          
          // Set vector dashboard visualizer coordinates (range [-50%, 50%] mapped to absolute px of 80px container)
          if (vectorCursor) vectorCursor.style.transform = `translate(-50%, -50%) translate(${limitX * 30}px, ${limitY * 30}px)`;

          // Determine Textual Gaze direction
          let dir = "Center";
          if (Math.abs(limitX) > 0.4 || Math.abs(limitY) > 0.4) {
            const vDir = limitY < -0.4 ? "Up" : (limitY > 0.4 ? "Down" : "");
            const hDir = limitX < -0.4 ? "Right" : (limitX > 0.4 ? "Left" : ""); // Correct for mirrored view
            dir = `${vDir} ${hDir}`.trim();
          }
          if (valGazeDir) valGazeDir.textContent = dir || "Center";

          // Compute gaze point on screen
          const gazePoint = predictGaze(eyeMetrics.xRatio, eyeMetrics.yRatio);
          if (gazePoint && chkGazePtr && chkGazePtr.checked) {
            if (gazePointer) {
              gazePointer.classList.remove("hidden");
              // Project gaze position based on canvas scale and overlay coordinates
              const canvasRect = canvas.getBoundingClientRect();
              
              // Calculate screen coordinates (relative to the canvas container viewport)
              const pointerX = (gazePoint.x / canvas.width) * canvasRect.width;
              const pointerY = (gazePoint.y / canvas.height) * canvasRect.height;
              
              gazePointer.style.left = `${pointerX}px`;
              gazePointer.style.top = `${pointerY}px`;
            }
          } else {
            if (gazePointer) gazePointer.classList.add("hidden");
          }

          // Draw Gaze Rays from Irises
          if (chkGazeLine && chkGazeLine.checked) {
            drawGazeRays(ctx, landmarks, dx, dy, style);
          }
        }

        // Draw Face Mesh lines
        if (chkFaceMesh && chkFaceMesh.checked) {
          ctx.strokeStyle = style.faceLines;
          ctx.lineWidth = style.faceLineWidth;
          
          // Draw key loops
          drawPath(ctx, landmarks, faceConnections.silhouette, true);
          drawPath(ctx, landmarks, faceConnections.leftEyebrow, false);
          drawPath(ctx, landmarks, faceConnections.rightEyebrow, false);
          drawPath(ctx, landmarks, faceConnections.lipsOuter, true);
        }

        // Draw eyes outer boundary and irises
        if ((chkFaceMesh && chkFaceMesh.checked) || (chkIrises && chkIrises.checked)) {
          ctx.strokeStyle = style.eyeLines;
          ctx.lineWidth = 1;
          drawPath(ctx, landmarks, faceConnections.leftEye, true);
          drawPath(ctx, landmarks, faceConnections.rightEye, true);
        }

        if (chkIrises && chkIrises.checked) {
          drawIrisHighlight(ctx, landmarks, style);
        }
      } else {
        if (gazePointer) gazePointer.classList.add("hidden");
        if (valGazeDir) valGazeDir.textContent = "No Face";
      }

      // Hands Mesh and gesture tracking
      let handLandmarksList = handResult.landmarks;
      let handHandednessList = handResult.handednesses;
      if (valHandsCount) valHandsCount.textContent = handLandmarksList ? handLandmarksList.length : 0;

      if (handLandmarksList && handLandmarksList.length > 0) {
        let primaryHandIndex = 0;
        
        // Calculate distances & draw skeletons for all hands
        for (let h = 0; h < handLandmarksList.length; h++) {
          const handLandmarks = handLandmarksList[h];
          
          // Draw Hand Skeleton
          if (chkHands && chkHands.checked) {
            drawHandSkeleton(ctx, handLandmarks, style);
          }

          // Draw Bounding Boxes
          if (chkBounding && chkBounding.checked) {
            let handednessText = "Unknown";
            try {
              if (handHandednessList && handHandednessList[h] && handHandednessList[h].length > 0) {
                handednessText = handHandednessList[h][0].categoryName;
              }
            } catch (e) { /* ignore */ }
            drawHandBoundingBox(ctx, handLandmarks, handednessText, style);
          }
        }

        // Detect Gestures on primary hand (first index)
        const primaryHandLandmarks = handLandmarksList[primaryHandIndex];
        if (primaryHandLandmarks && primaryHandLandmarks.length >= 21) {
          const gesture = detectGesture(primaryHandLandmarks);
          updateGestureIndicator(gesture);

          // Estimate distance for primary hand
          try {
            const distanceMet = estimateHandDistance(primaryHandLandmarks);
            if (barDistance) barDistance.style.width = `${distanceMet.pct}%`;
            if (lblDistance) lblDistance.textContent = distanceMet.label;
          } catch (e) {
            console.error("Distance estimation error:", e);
          }
        }
      } else {
        updateGestureIndicator("No Hand");
        if (barDistance) barDistance.style.width = "0%";
        if (lblDistance) lblDistance.textContent = "Not detected";
      }

      // FPS Calculations
      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 1000) {
        modelFps = ((frameCount * 1000) / (now - lastFpsUpdate)).toFixed(1);
        if (valFps) valFps.textContent = modelFps;
        frameCount = 0;
        lastFpsUpdate = now;
      }
    }
  } catch (error) {
    console.error("RenderLoop error:", error);
  }

    // Draw right iris glow
    ctx.beginPath();
    ctx.arc(rightIris.x * canvas.width, rightIris.y * canvas.height, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;
  }
}

// Draw Gaze Laser ray
function drawGazeRays(ctx, landmarks, dx, dy, style) {
  const leftIris = landmarks[468];
  const rightIris = landmarks[473];

  if (leftIris && rightIris) {
    ctx.strokeStyle = style.gazeRay;
    ctx.lineWidth = 2;
    
    // Project vector (dx, dy). Since we want lasers projecting outward, let's scale
    const scale = 500;
    
    // Left eye ray (dx is negative when looking right, positive when looking left. Adjust to project outwards)
    const lxStart = leftIris.x * canvas.width;
    const lyStart = leftIris.y * canvas.height;
    const lxEnd = lxStart - dx * scale; // flip x to align with looking direction in mirrored view
    const lyEnd = lyStart + dy * scale;
    
    ctx.beginPath();
    ctx.moveTo(lxStart, lyStart);
    ctx.lineTo(lxEnd, lyEnd);
    ctx.stroke();

    // Right eye ray
    const rxStart = rightIris.x * canvas.width;
    const ryStart = rightIris.y * canvas.height;
    const rxEnd = rxStart - dx * scale;
    const ryEnd = ryStart + dy * scale;
    
    ctx.beginPath();
    ctx.moveTo(rxStart, ryStart);
    ctx.lineTo(rxEnd, ryEnd);
    ctx.stroke();
  }
}

// Draw hand skeleton
function drawHandSkeleton(ctx, landmarks, style) {
  ctx.strokeStyle = style.handLines;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";

  // Draw bones
  for (let i = 0; i < handConnections.length; i++) {
    const jointA = landmarks[handConnections[i][0]];
    const jointB = landmarks[handConnections[i][1]];
    if (!jointA || !jointB) continue;

    ctx.beginPath();
    ctx.moveTo(jointA.x * canvas.width, jointA.y * canvas.height);
    ctx.lineTo(jointB.x * canvas.width, jointB.y * canvas.height);
    ctx.stroke();
  }

  // Draw joints
  ctx.fillStyle = style.handJoint;
  for (let j = 0; j < landmarks.length; j++) {
    const joint = landmarks[j];
    ctx.beginPath();
    ctx.arc(joint.x * canvas.width, joint.y * canvas.height, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Draw hand bounding boxes with digital overlay stats
function drawHandBoundingBox(ctx, landmarks, label, style) {
  let minX = canvas.width, maxX = 0;
  let minY = canvas.height, maxY = 0;

  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    const x = pt.x * canvas.width;
    const y = pt.y * canvas.height;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // Padding
  const pad = 12;
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  const width = maxX - minX;
  const height = maxY - minY;

  ctx.strokeStyle = style.boundingBox;
  ctx.lineWidth = 1.5;
  
  // Draw corners instead of complete box for a futuristic tech look
  const cLen = Math.min(20, width / 4);
  
  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(minX + cLen, minY);
  ctx.lineTo(minX, minY);
  ctx.lineTo(minX, minY + cLen);
  ctx.stroke();

  // Top-right corner
  ctx.beginPath();
  ctx.moveTo(maxX - cLen, minY);
  ctx.lineTo(maxX, minY);
  ctx.lineTo(maxX, minY + cLen);
  ctx.stroke();

  // Bottom-left corner
  ctx.beginPath();
  ctx.moveTo(minX + cLen, maxY);
  ctx.lineTo(minX, maxY);
  ctx.lineTo(minX, maxY - cLen);
  ctx.stroke();

  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(maxX - cLen, maxY);
  ctx.lineTo(maxX, maxY);
  ctx.lineTo(maxX, maxY - cLen);
  ctx.stroke();

  // Label text background
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(minX, minY - 24, 90, 20);

  // Label
  ctx.fillStyle = style.handLines;
  ctx.font = "bold 9px 'Space Mono', monospace";
  ctx.fillText(label.toUpperCase(), minX + 6, minY - 10);
}

// Compute eye aspect ratios for gaze mapping and blink tracking
function getEyeMetrics(landmarks) {
  // Left eye corners/borders (in mirror: right side eye)
  const l33 = landmarks[33];
  const l133 = landmarks[133];
  const l159 = landmarks[159];
  const l145 = landmarks[145];
  const l468 = landmarks[468]; // left iris center

  // Right eye corners/borders (in mirror: left side eye)
  const r263 = landmarks[263];
  const r362 = landmarks[362];
  const r386 = landmarks[386];
  const r374 = landmarks[374];
  const r473 = landmarks[473]; // right iris center

  if (!l33 || !l133 || !l159 || !l145 || !l468 || !r263 || !r362 || !r386 || !r374 || !r473) {
    return null;
  }

  // Bounding X/Y for Left Eye
  const lMinX = Math.min(l33.x, l133.x);
  const lMaxX = Math.max(l33.x, l133.x);
  const lMinY = Math.min(l159.y, l145.y);
  const lMaxY = Math.max(l159.y, l145.y);

  // Bounding X/Y for Right Eye
  const rMinX = Math.min(r263.x, r362.x);
  const rMaxX = Math.max(r263.x, r362.x);
  const rMinY = Math.min(r386.y, r374.y);
  const rMaxY = Math.max(r386.y, r374.y);

  // Eye ratio calculations
  const rxL = (l468.x - lMinX) / (lMaxX - lMinX || 1);
  const ryL = (l468.y - lMinY) / (lMaxY - lMinY || 1);

  const rxR = (r473.x - rMinX) / (rMaxX - rMinX || 1);
  const ryR = (r473.y - rMinY) / (rMaxY - rMinY || 1);

  // Average eye ratios
  const xRatio = (rxL + rxR) / 2;
  const yRatio = (ryL + ryR) / 2;

  // Eye Aspect Ratio (EAR) for blink detection
  const earL = Math.hypot(l159.x - l145.x, l159.y - l145.y) / Math.hypot(l33.x - l133.x, l33.y - l133.y || 1);
  const earR = Math.hypot(r386.x - r374.x, r386.y - r374.y) / Math.hypot(r263.x - r362.x, r263.y - r362.y || 1);
  const ear = (earL + earR) / 2;

  return { xRatio, yRatio, ear };
}

// Track blinks and count them
function handleBlinkDetection(ear) {
  if (ear < BLINK_THRESHOLD) {
    eyesClosed = true;
  } else {
    if (eyesClosed) {
      // Transition from closed to open counts as a blink
      blinkCount++;
      if (valBlinks) {
        valBlinks.textContent = blinkCount;
        
        // Visual pulse trigger on the blink box
        const blinkBox = valBlinks.parentElement;
        if (blinkBox) {
          blinkBox.style.borderColor = "var(--accent-secondary)";
          setTimeout(() => {
            blinkBox.style.borderColor = "var(--panel-border)";
          }, 150);
        }
      }
      eyesClosed = false;
    }
  }
}

// Estimate distance of hand to camera based on palm dimension relative to screen
function estimateHandDistance(landmarks) {
  // distance between wrist (0) and middle finger base (9)
  const dx = landmarks[0].x - landmarks[9].x;
  const dy = landmarks[0].y - landmarks[9].y;
  const palmDist = Math.hypot(dx, dy); // ratio of camera screen size

  // Map palmDist [0.08, 0.28] to percentage [0, 100]
  const pct = Math.max(0, Math.min(100, Math.round((palmDist - 0.08) / (0.28 - 0.08) * 100)));
  
  let label = "Medium";
  if (pct < 30) label = "Far Away";
  else if (pct > 75) label = "Very Close";

  return { pct, label: `${label} (${pct}%)` };
}

// Detect hand gestures
function detectGesture(landmarks) {
  // Verify vertical relative extensions (y index decrease is up)
  const indexOpen = landmarks[8].y < landmarks[6].y;
  const middleOpen = landmarks[12].y < landmarks[10].y;
  const ringOpen = landmarks[16].y < landmarks[14].y;
  const pinkyOpen = landmarks[20].y < landmarks[18].y;

  // Thumb Open: Distance between thumb tip (4) and index finger base (5)
  // compared against index knuckle to pip spacing as baseline
  const indexBaseToPip = Math.hypot(landmarks[5].x - landmarks[6].x, landmarks[5].y - landmarks[6].y);
  const thumbTipToIndexBase = Math.hypot(landmarks[4].x - landmarks[5].x, landmarks[4].y - landmarks[5].y);
  const thumbOpen = thumbTipToIndexBase > indexBaseToPip * 1.55;

  const openCount = (indexOpen ? 1 : 0) + (middleOpen ? 1 : 0) + (ringOpen ? 1 : 0) + (pinkyOpen ? 1 : 0) + (thumbOpen ? 1 : 0);

  // Gesture mapping
  if (openCount === 0) {
    return "Fist";
  } else if (openCount === 5) {
    return "Open Hand";
  } else if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
    return "Victory";
  } else if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen && !thumbOpen) {
    return "Pointing";
  } else if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    // Thumb is open, other fingers are folded, verify pointing upward
    if (landmarks[4].y < landmarks[2].y) {
      return "Thumbs Up";
    }
  }

  // Generic counts fallbacks
  if (openCount === 1) return "Pointing";
  if (openCount === 2) return "Victory";
  return "Active Hand";
}

// Update the Hand Gesture HUD Display
function updateGestureIndicator(gesture) {
  if (gesture === currentGesture) return;
  
  currentGesture = gesture;
  if (valGesture) valGesture.textContent = gesture;
  
  // Use innerHTML on wrapper instead of outerHTML to avoid losing DOM reference
  if (gestureIndicatorWrap) {
    gestureIndicatorWrap.innerHTML = gestureSVGs[gesture] || '';
    
    if (gesture !== "No Hand") {
      gestureIndicatorWrap.classList.add("active");
      setTimeout(() => {
        gestureIndicatorWrap.classList.remove("active");
      }, 250);
    }
  }
}

// Start Application is now handled in the dynamic import above
