// ============================================================================
// Music Frequency Player — Enhanced v2 (index8)
// Web Audio API music player with waveform visualizer,
// frequency band meters, volume + mute, progress seek, EQ presets,
// fullscreen mode, and keyboard shortcuts.
// ============================================================================

// Track metadata - Using local audio assets
const tracks = [
  
  {
    name: "Powersound (VIP)",
    genre: "ELEPS",
    file: "assets/music/ELEPS-POWERSOUND-VIP.mp3"
  },
  {
    name: "Final Boss",
    genre: "Nitro Fun",
    file: "assets/music/Nitro-Fun-by-Final-Boss.mp3"
  },
  {
    name: "Feral",
    genre: "meganeko",
    file: "assets/music/meganeko-Feral.mp3"
  },
  {
    name: "Alpha-0",
    genre: "Optie Animation",
    file: "assets/music/Aleph-0.mp3"
  },
  {
    name: "Sentinel",
    genre: "Noisestorm",
    file: "assets/music/Noisestorm-Sentinel.mp3"
  },
  {
    name: "The Master",
    genre: "Teminite x Boom Kitty",
    file: "assets/music/Teminite-x-Boom-Kitty-The-Master.mp3"
  }
];

// ------------------------------------------------- Audio nodes
let audioCtx = null;
let analyser = null;
let gainNode = null;
let eqFilter = null;      // BiquadFilterNode between gain and analyser
let mediaSource = null;
let dataArray = null;
let bufferLength = 0;
let currentTrackIndex = -1;
let isPlaying = false;
let audioElement = null;
let animationFrameId = null;

// ------------------------------------------------- UI refs
const canvas = document.getElementById('freqCanvas');
const ctx = canvas.getContext('2d');

// Progress
const progressTrack = document.getElementById('progressTrack');
const progressFill = document.getElementById('progressFill');
const progressThumb = document.getElementById('progressThumb');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const currentTrackTitle = document.getElementById('currentTrackTitle');

// Music transport controls
const previousTrackButton = document.getElementById('previousTrackButton');
const playPauseButton = document.getElementById('playPauseButton');
const playPauseIcon = document.getElementById('playPauseIcon');
const nextTrackButton = document.getElementById('nextTrackButton');
const transportControls = document.querySelector('.transport-controls');
const transportControlsSlot = document.querySelector('.transport-controls-slot');

let transportScrollFrame = null;

function updateFloatingTransport() {
  const shouldFloat = transportControlsSlot.getBoundingClientRect().bottom <= 0;
  transportControls.classList.toggle('is-floating', shouldFloat);
  transportScrollFrame = null;
}

function requestFloatingTransportUpdate() {
  if (transportScrollFrame === null) {
    transportScrollFrame = requestAnimationFrame(updateFloatingTransport);
  }
}

window.addEventListener('scroll', requestFloatingTransportUpdate, { passive: true });
window.addEventListener('resize', requestFloatingTransportUpdate);
requestFloatingTransportUpdate();

// Band meters
const bandEls = {
  bass: document.getElementById('val-bass'),
  mid: document.getElementById('val-mid'),
  treble: document.getElementById('val-treble')
};

// Is user dragging the seek bar?
let isSeeking = false;

const DEFAULT_EQ = { type: 'peaking', frequency: 1000, Q: 1, gain: 0 };
let currentVolume = 0.8;
let volumeBeforeMute = currentVolume;

// ------------------------------------------------- Canvas resize
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(rect.width * dpr, 1);
  canvas.height = Math.max(rect.height * dpr, 1);
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ------------------------------------------------- Time formatting
function formatTime(seconds) {
  if (!seconds || seconds < 0 || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ------------------------------------------------- Audio init chain
// AudioContext → GainNode → EQ Biquad → Analyser → destination
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    gainNode = audioCtx.createGain();
    gainNode.gain.value = currentVolume;

    eqFilter = audioCtx.createBiquadFilter();
    eqFilter.type = DEFAULT_EQ.type;
    eqFilter.frequency.value = DEFAULT_EQ.frequency;
    eqFilter.Q.value = DEFAULT_EQ.Q;
    eqFilter.gain.value = DEFAULT_EQ.gain;

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    gainNode.connect(eqFilter);
    eqFilter.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// ------------------------------------------------- Load & play a track
async function playAudioTrack(trackIndex) {
  if (!Number.isInteger(trackIndex) || !tracks[trackIndex]) return;

  stopAudioTrack();
  initAudio();

  const track = tracks[trackIndex];
  currentTrackIndex = trackIndex;
  let player = null;

  try {
    player = new Audio();
    audioElement = player;
    player.crossOrigin = 'anonymous';
    player.preload = 'metadata';
    player.loop = false;
    player.volume = 1; // we control volume via gainNode

    mediaSource = audioCtx.createMediaElementSource(player);
    mediaSource.connect(gainNode);

    const syncSelectedTrackProgress = () => {
      if (audioElement === player) syncProgressFromAudio();
    };
    player.addEventListener('loadedmetadata', syncSelectedTrackProgress);
    player.addEventListener('durationchange', syncSelectedTrackProgress);
    player.addEventListener('timeupdate', syncSelectedTrackProgress);
    player.src = track.file;

    await player.play();
    if (audioElement !== player) return;
    isPlaying = true;

    player.onended = () => {
      if (audioElement === player && isPlaying && currentTrackIndex === trackIndex) {
        const nextTrackIndex = (trackIndex + 1) % tracks.length;
        playAudioTrack(nextTrackIndex);
      }
    };

    player.onerror = (e) => {
      console.error('Audio playback error:', e);
      if (audioElement !== player) return;
      stopAudioTrack();
      updateUI();
    };

    updateUI();
  } catch (error) {
    console.error('Failed to play audio:', error);
    if (audioElement === player) {
      stopAudioTrack();
      updateUI();
    }
  }
}

function stopAudioTrack() {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement.onended = null;
    audioElement.onerror = null;
    audioElement = null;
  }
  if (mediaSource) {
    try { mediaSource.disconnect(); } catch (e) {}
    mediaSource = null;
  }
  isPlaying = false;
  currentTrackIndex = -1;
}

// ------------------------------------------------- Toggle Track Play / Stop
function toggleTrack(index) {
  if (!Number.isInteger(index) || !tracks[index]) return;

  const isCurrentTrack = currentTrackIndex === index;

  if (isCurrentTrack && isPlaying) {
    // Stop the active track from its thumbnail control
    stopAudioTrack();
    updateUI();
  } else if (isCurrentTrack && audioElement) {
    // Resume the selected track
    audioElement.play().then(() => {
      isPlaying = true;
      updateUI();
    }).catch(() => { playAudioTrack(index); });
  } else {
    // Stop the previous track and load the selected track's MP3
    playAudioTrack(index);
    updateUI();
  }
}

// ------------------------------------------------- Previous / Play-Pause / Next
function playPreviousTrack() {
  const previousIndex = currentTrackIndex === -1
    ? tracks.length - 1
    : (currentTrackIndex - 1 + tracks.length) % tracks.length;
  playAudioTrack(previousIndex);
}

function playNextTrack() {
  const nextIndex = currentTrackIndex === -1
    ? 0
    : (currentTrackIndex + 1) % tracks.length;
  playAudioTrack(nextIndex);
}

async function togglePlayback() {
  if (!audioElement || currentTrackIndex === -1) {
    await playAudioTrack(0);
    return;
  }

  if (isPlaying) {
    // Pause without disconnecting the source from the frequency analyser.
    audioElement.pause();
    isPlaying = false;
    updateUI();
    return;
  }

  const player = audioElement;
  try {
    initAudio();
    await player.play();
    if (audioElement !== player) return;
    isPlaying = true;
    updateUI();
  } catch (error) {
    console.error('Failed to resume audio:', error);
  }
}

previousTrackButton.addEventListener('click', playPreviousTrack);
playPauseButton.addEventListener('click', togglePlayback);
nextTrackButton.addEventListener('click', playNextTrack);

// ------------------------------------------------- Volume & mute
function setVolume(value) {
  const v = Math.max(0, Math.min(1, parseFloat(value)));
  currentVolume = v;
  if (v > 0) volumeBeforeMute = v;
  if (gainNode) gainNode.gain.value = v;
}

function toggleMute() {
  if (!gainNode) return;
  const currentlyMuted = gainNode.gain.value === 0;
  if (currentlyMuted) {
    setVolume(volumeBeforeMute);
  } else {
    setVolume(0);
  }
}

// ------------------------------------------------- Progress seeking
function formatSeekPosition(value) {
  return Math.max(0, Math.min(100, value));
}

function renderProgress(percent) {
  const p = formatSeekPosition(percent);
  progressFill.style.width = `${p}%`;
  progressThumb.style.left = `calc(${p}% - 6px)`;
  progressTrack.setAttribute('aria-valuenow', p);
  return p;
}

function setProgressFromPercent(percent) {
  const p = renderProgress(percent);
  if (audioElement && isFinite(audioElement.duration)) {
    audioElement.currentTime = (p / 100) * audioElement.duration;
    currentTimeEl.textContent = formatTime(audioElement.currentTime);
  }
}

function syncProgressFromAudio() {
  if (!audioElement) {
    if (!isSeeking) renderProgress(0);
    currentTimeEl.textContent = '0:00';
    durationEl.textContent = '0:00';
    return;
  }

  const duration = audioElement.duration;
  const hasDuration = isFinite(duration) && duration > 0;
  currentTimeEl.textContent = formatTime(audioElement.currentTime);
  durationEl.textContent = hasDuration ? formatTime(duration) : '0:00';

  if (!isSeeking && hasDuration) {
    renderProgress((audioElement.currentTime / duration) * 100);
  }
}

progressTrack.addEventListener('mousedown', (e) => {
  isSeeking = true;
  seekFromEvent(e);
});
window.addEventListener('mousemove', (e) => {
  if (!isSeeking) return;
  seekFromEvent(e);
});
window.addEventListener('mouseup', () => {
  isSeeking = false;
});

progressTrack.addEventListener('touchstart', (e) => {
  isSeeking = true;
  seekFromTouch(e);
}, { passive: false });
window.addEventListener('touchmove', (e) => {
  if (!isSeeking) return;
  seekFromTouch(e);
}, { passive: false });
window.addEventListener('touchend', () => { isSeeking = false; });

function seekFromEvent(e) {
  const rect = progressTrack.getBoundingClientRect();
  let p = ((e.clientX - rect.left) / rect.width) * 100;
  setProgressFromPercent(p);
}
function seekFromTouch(e) {
  const rect = progressTrack.getBoundingClientRect();
  const touch = e.touches[0] || e.changedTouches[0];
  let p = ((touch.clientX - rect.left) / rect.width) * 100;
  setProgressFromPercent(p);
}

// Keyboard on progress bar
progressTrack.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { setProgressFromPercent(parseFloat(progressTrack.getAttribute('aria-valuenow') || 0) + 5); e.preventDefault(); }
  if (e.key === 'ArrowLeft')  { setProgressFromPercent(parseFloat(progressTrack.getAttribute('aria-valuenow') || 0) - 5); e.preventDefault(); }
});

// ------------------------------------------------- Update play/pause UI
function updateUI() {
  tracks.forEach((_, idx) => {
    const trackEl = document.getElementById(`track-${idx}`);
    const controlEl = document.getElementById(`track-control-${idx}`);
    const iconEl = document.getElementById(`icon-${idx}`);

    if (idx === currentTrackIndex && isPlaying) {
      trackEl.classList.add('active');
      controlEl.setAttribute('aria-label', `Stop ${tracks[idx].name}`);
      controlEl.setAttribute('aria-pressed', 'true');
      iconEl.className = 'bi bi-stop-fill thumbnail-action-icon';
    } else {
      trackEl.classList.remove('active');
      controlEl.setAttribute('aria-label', `Play ${tracks[idx].name}`);
      controlEl.setAttribute('aria-pressed', 'false');
      iconEl.className = 'bi bi-play-fill thumbnail-action-icon';
    }
  });

  const selectedTrackIndex = currentTrackIndex === -1 ? 0 : currentTrackIndex;
  const selectedTrack = tracks[selectedTrackIndex];
  const previousTrack = tracks[(selectedTrackIndex - 1 + tracks.length) % tracks.length];
  const nextTrack = tracks[(selectedTrackIndex + 1) % tracks.length];

  currentTrackTitle.textContent = selectedTrack.name;
  currentTrackTitle.title = selectedTrack.name;
  playPauseIcon.className = isPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill';
  playPauseButton.classList.toggle('transport-button-primary', !isPlaying);
  playPauseButton.setAttribute('aria-label', `${isPlaying ? 'Pause' : 'Play'} ${selectedTrack.name}`);
  playPauseButton.setAttribute('aria-pressed', String(isPlaying));
  previousTrackButton.setAttribute('aria-label', `Play previous track: ${previousTrack.name}`);
  nextTrackButton.setAttribute('aria-label', `Play next track: ${nextTrack.name}`);

  syncProgressFromAudio();
}

// ------------------------------------------------- Band energy computation
// analyser frequency bins: bin i corresponds to freq = i * sampleRate / fftSize
function getBandEnergy(band) {
  if (!dataArray) return 0;
  const sampleRate = audioCtx.sampleRate;
  const fftSize = analyser.fftSize;
  const freqResolution = sampleRate / fftSize;

  let lowBin, highBin;
  switch (band) {
    case 'bass':   lowBin = 20;   highBin = 250;  break;
    case 'mid':    lowBin = 250;  highBin = 4000; break;
    case 'treble': lowBin = 4000; highBin = 20000; break;
    default: return 0;
  }

  const start = Math.floor(lowBin / freqResolution);
  const end = Math.floor(highBin / freqResolution);
  let sum = 0;
  let count = 0;
  for (let i = start; i <= end && i < dataArray.length; i++) {
    sum += dataArray[i];
    count++;
  }
  if (count === 0) return 0;
  const avg = sum / count;
  return Math.round((avg / 255) * 100);
}

// ------------------------------------------------- Draw visualizer
function drawVisualizer() {
  animationFrameId = requestAnimationFrame(drawVisualizer);

  const dpr = window.devicePixelRatio || 1;
  const displayWidth = canvas.width / dpr;
  const displayHeight = canvas.height / dpr;

  // Clear background - deep dark gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
  bgGradient.addColorStop(0, '#06080a');
  bgGradient.addColorStop(0.5, '#080b0e');
  bgGradient.addColorStop(1, '#0a0d12');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  // Background grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  const gridRows = 6;
  for (let i = 1; i < gridRows; i++) {
    const y = (displayHeight / gridRows) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(displayWidth, y);
    ctx.stroke();
  }

  // Reference threshold line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, displayHeight * 0.38);
  ctx.lineTo(displayWidth, displayHeight * 0.38);
  ctx.stroke();
  ctx.setLineDash([]);

  // Vertical logarithmic frequency grid lines
  const gridCols = [0.08, 0.18, 0.3, 0.45, 0.6, 0.75, 0.88];
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  gridCols.forEach((ratio) => {
    ctx.beginPath();
    ctx.moveTo(displayWidth * ratio, 0);
    ctx.lineTo(displayWidth * ratio, displayHeight);
    ctx.stroke();
  });

  // Get frequency data if playing, else idle ambient wave
  if (analyser && isPlaying) {
    analyser.getByteFrequencyData(dataArray);

    // Update band meters
    const b = getBandEnergy('bass');
    const m = getBandEnergy('mid');
    const t = getBandEnergy('treble');
    animateBand('bass', b);
    animateBand('mid', m);
    animateBand('treble', t);
  } else {
    if (!dataArray) dataArray = new Uint8Array(128);
    const time = Date.now() * 0.002;
    for (let i = 0; i < dataArray.length; i++) {
      const val = Math.sin(i * 0.1 + time) * 12 + Math.cos(i * 0.05 - time) * 8 + 10;
      dataArray[i] = Math.max(0, Math.min(255, val));
    }
    animateBand('bass', 12);
    animateBand('mid', 10);
    animateBand('treble', 8);
  }

  drawWaveform(displayWidth, displayHeight);
}

// Smooth previous band values for meter animation
const bandSmooth = { bass: 0, mid: 0, treble: 0 };
function animateBand(band, target) {
  bandSmooth[band] += (target - bandSmooth[band]) * 0.25;
  const v = Math.round(bandSmooth[band]);
  const el = bandEls[band];
  if (!el) return;
  el.textContent = `${v}`;
}

// ---- Time-domain oscilloscope
function drawWaveform(w, h) {
  const count = analyser ? analyser.fftSize : 512;
  const buffer = new Uint8Array(count);

  if (analyser && isPlaying) {
    analyser.getByteTimeDomainData(buffer);
  } else {
    const time = Date.now() * 0.002;
    for (let i = 0; i < count; i++) {
      const idleWave = Math.sin(i * 0.035 + time) * 5 + Math.sin(i * 0.012 - time) * 3;
      buffer[i] = 128 + idleWave;
    }
  }

  const sliceWidth = w * 1.0 / count;
  let x = 0;

  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const gradient = ctx.createLinearGradient(0, 0, w, 0);
  gradient.addColorStop(0, 'rgba(255, 59, 48, 0.9)');
  gradient.addColorStop(0.5, 'rgba(220, 38, 38, 1)');
  gradient.addColorStop(1, 'rgba(153, 27, 27, 0.9)');
  ctx.strokeStyle = gradient;

  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const v = buffer[i] / 255.0;
    const y = h / 2 + (v - 0.5) * h * 0.75;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.stroke();

  // Glow
  ctx.shadowColor = 'rgba(255, 59, 48, 0.5)';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Center line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
}

// ------------------------------------------------- Start animation loop on load
window.onload = function () {
  updateUI();
  drawVisualizer();
};

// ------------------------------------------------- Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ignore if typing into an input/select
  const target = document.activeElement;
  const typing = target.tagName === 'INPUT' || target.tagName === 'SELECT' ||
    target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON';
  if (typing) return;

  switch (e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      togglePlayback();
      break;
    case 'arrowleft':
      e.preventDefault();
      playPreviousTrack();
      break;
    case 'arrowright':
      e.preventDefault();
      playNextTrack();
      break;
    case 'arrowup':
      e.preventDefault();
      setVolume(Math.min(1, currentVolume + 0.1));
      break;
    case 'arrowdown':
      e.preventDefault();
      setVolume(Math.max(0, currentVolume - 0.1));
      break;
    case 'm':
      toggleMute();
      break;
  }
});
