/* Shared site branding: use the logo and banner configured in the music archive admin. */
(async function () {
  try {
    const response = await fetch('/api/site', { cache: 'no-store' });
    if (!response.ok) return;
    const settings = await response.json();
    if (settings.logo) {
      document.querySelectorAll('.brand, .wordmark').forEach((link) => {
        const image = document.createElement('img');
        image.className = link.classList.contains('wordmark') ? 'logo-img' : 'portfolio-logo-img';
        image.src = settings.logo;
        image.alt = 'Stephen Wood';
        link.replaceChildren(image);
      });
    }
    if (settings.banner) {
      const banner = document.querySelector('#portfolio-banner');
      if (banner) {
        banner.src = settings.banner;
        banner.hidden = false;
        banner.classList.add('is-loaded');
      }
    }
  } catch (_) {
    // Keep the text logo and clean layout if site settings are unavailable.
  }
})();
