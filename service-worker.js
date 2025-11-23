// app.js - browser logic (DOM, playback, metadata, PWA prompt, SW register)

// DOM Elements
const audio = document.getElementById('radio');
const radioSource = document.getElementById('radioSource');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const loading = document.getElementById('loading');
const songTitle = document.getElementById('songTitle');
const listeners = document.getElementById('listeners');
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');
const dismissBtn = document.getElementById('dismissBtn');

let deferredPrompt;

// Helper: set status
function setStatus(state, message) {
  status.className = 'status';
  if (state === 'live') {
    status.classList.add('live');
    status.textContent = 'Live 🔴';
  } else if (state === 'error') {
    status.classList.add('error');
    status.textContent = message || 'Error';
  } else if (state === 'offline') {
    status.textContent = 'Offline';
  } else {
    status.textContent = 'Offline';
  }
}

function showLoading(show) {
  loading.style.display = show ? 'flex' : 'none';
}

// PLAY handler
playBtn.addEventListener('click', async () => {
  playBtn.disabled = true;
  showLoading(true);

  try {
    // Attempt to play. If autoplay blocked, browser will throw NotAllowedError
    await audio.play();
    setStatus('live');
    showLoading(false);
    playBtn.disabled = false;

    // fetch metadata immediately
    fetchMetadata();

    // Setup media session if available
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songTitle.textContent || 'Peace FM Tamil',
        artist: 'Peace Radio',
        album: 'Peace Radio',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', async () => { await audio.play(); });
      navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); });
    }

  } catch (err) {
    console.error('Playback error:', err);
    showLoading(false);
    playBtn.disabled = false;

    if (err.name === 'NotAllowedError') {
      alert('உலாவி autoplay-ஐ தடுத்துள்ளது — Play பட்டனை மீண்டும் அழுத்தவும்.');
    } else {
      setStatus('error', 'பிழை');
      alert('ஸ்ட்ரீம் இணைக்க முடியவில்லை. இணைய இணைப்பை சரிபார்க்கவும்.');
    }
  }
});

// STOP handler - DO NOT set currentTime for live streams
stopBtn.addEventListener('click', () => {
  try {
    audio.pause();
  } catch (e) {
    console.warn('Error while pausing:', e);
  }
  setStatus('offline');
  songTitle.textContent = 'Peace Radio Tamil';
  listeners.textContent = 'கேட்போர்: —';
});

// Audio event listeners
audio.addEventListener('playing', () => {
  setStatus('live');
  showLoading(false);
});

audio.addEventListener('waiting', () => {
  showLoading(true);
});

audio.addEventListener('error', (e) => {
  console.error('Audio error:', e);
  setStatus('error', 'இணைப்பு பிழை');
  showLoading(false);
  playBtn.disabled = false;
});

audio.addEventListener('pause', () => {
  // if paused manually keep offline label
  if (audio.paused) setStatus('offline');
});

// Robust metadata fetch
async function fetchMetadata() {
  const statusUrl = '/api/status'; // proxied endpoint on worker
  try {
    const res = await fetch(statusUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('Status fetch failed');

    const data = await res.json();
    // different icecast formats: try to find icestats.source or sources
    let source = null;
    if (data.icestats) {
      source = data.icestats.source || data.icestats;
    } else if (data.icestats && data.icestats.source) {
      source = data.icestats.source;
    } else {
      // fallback: maybe direct object or array
      source = data.source || data;
    }

    if (Array.isArray(source)) source = source[0];

    if (source) {
      if (source.title) songTitle.textContent = source.title;
      else if (source.server_name) songTitle.textContent = source.server_name;

      if (typeof source.listeners !== 'undefined') {
        listeners.textContent = `கேட்போர்: ${source.listeners}`;
      }
    }
  } catch (err) {
    console.log('Metadata fetch error:', err);
    // leave defaults if failed
  }
}

// Poll metadata every 15s while playing
setInterval(() => {
  if (!audio.paused) fetchMetadata();
}, 15000);

// PWA install prompt handling
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (localStorage.getItem('installDismissed') !== 'true') {
    installPrompt.style.display = 'block';
  }
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('Install outcome:', outcome);
  deferredPrompt = null;
  installPrompt.style.display = 'none';
});

dismissBtn.addEventListener('click', () => {
  installPrompt.style.display = 'none';
  localStorage.setItem('installDismissed', 'true');
});

// Service Worker registration (ensure sw file at root)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// Optional: quickly check stream reachable (non-blocking)
async function quickHealthCheck() {
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    if (res.ok) {
      // nothing else; metadata fetch will update UI
    }
  } catch (e) {
    console.warn('Health check failed:', e);
  }
}
quickHealthCheck();
