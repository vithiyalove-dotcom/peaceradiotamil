// DOM Elements
const audio = document.getElementById('radio');
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

// Status Management
function setStatus(state, message) {
  status.className = 'status';
  if (state === 'live') {
    status.classList.add('live');
    status.textContent = 'Live';
  } else if (state === 'error') {
    status.classList.add('error');
    status.textContent = message || 'Error';
  } else {
    status.textContent = 'Offline';
  }
}

function showLoading(show) {
  loading.style.display = show ? 'flex' : 'none';
}

// Play Button Handler
playBtn.addEventListener('click', async () => {
  try {
    showLoading(true);
    playBtn.disabled = true;
    
    await audio.play();
    
    setStatus('live');
    showLoading(false);
    playBtn.disabled = false;
    
    // Update Media Session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Peace FM Tamil',
        artist: 'Live Radio',
        album: 'Peace Radio',
        artwork: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });
    }
    
  } catch (err) {
    console.error('Playback error:', err);
    showLoading(false);
    playBtn.disabled = false;
    
    if (err.name === 'NotAllowedError') {
      alert('தயவுசெய்து Play பட்டனை மீண்டும் கிளிக் செய்யவும். உலாவி autoplay-ஐ தடுத்துள்ளது.');
    } else {
      setStatus('error', 'பிழை');
      alert('ஸ்ட்ரீம் இணைக்க முடியவில்லை. இணைய இணைப்பை சரிபார்க்கவும்.');
    }
  }
});

// Stop Button Handler
stopBtn.addEventListener('click', () => {
  audio.pause();
  audio.currentTime = 0;
  setStatus('offline');
  songTitle.textContent = '—';
  listeners.textContent = 'கேட்போர்: —';
});

// Audio Event Listeners
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
  if (audio.currentTime === 0) {
    setStatus('offline');
  }
});

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installPrompt.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`Install outcome: ${outcome}`);
  deferredPrompt = null;
  installPrompt.style.display = 'none';
});

dismissBtn.addEventListener('click', () => {
  installPrompt.style.display = 'none';
  localStorage.setItem('installDismissed', 'true');
});

// Check if already dismissed
if (localStorage.getItem('installDismissed') === 'true') {
  installPrompt.style.display = 'none';
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// Optional: Metadata Polling (if server supports)
// This is a placeholder - implement based on your backend
function fetchMetadata() {
  // Implement metadata fetching from your streaming server
  // Example: fetch current song info, listener count, etc.
}

// Poll metadata every 10 seconds
setInterval(fetchMetadata, 10000);
