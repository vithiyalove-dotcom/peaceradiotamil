console.log("Peace FM Tamil App Loaded");

// PWA Install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
  console.log("Peace FM Installed as App");
});
