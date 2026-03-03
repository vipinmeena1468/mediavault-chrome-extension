// content.js - Runs in the context of the webpage to extract all media

(function () {
  const results = {
    images: [],
    videos: [],
    audio: [],
    backgroundImages: []
  };

  const seen = new Set();

  function normalizeUrl(url) {
    try {
      return new URL(url, location.href).href;
    } catch {
      return null;
    }
  }

  function addUnique(arr, item) {
    if (!item.url || seen.has(item.url)) return;
    seen.add(item.url);
    arr.push(item);
  }

  function getExt(url) {
    try {
      const path = new URL(url).pathname;
      return path.split('.').pop().split('?')[0].toLowerCase();
    } catch {
      return '';
    }
  }

  function guessType(url) {
    const ext = getExt(url);
    if (['jpg','jpeg','png','gif','webp','svg','bmp','avif','ico'].includes(ext)) return 'image';
    if (['mp4','webm','ogg','mov','avi','mkv','m4v'].includes(ext)) return 'video';
    if (['mp3','wav','ogg','aac','flac','m4a','opus'].includes(ext)) return 'audio';
    return null;
  }

  // 1. <img> tags
  document.querySelectorAll('img').forEach(el => {
    const src = el.currentSrc || el.src;
    const url = normalizeUrl(src);
    if (!url) return;
    addUnique(results.images, {
      url,
      alt: el.alt || '',
      width: el.naturalWidth || el.width || 0,
      height: el.naturalHeight || el.height || 0,
      type: 'image'
    });

    // Also check srcset
    if (el.srcset) {
      el.srcset.split(',').forEach(part => {
        const u = normalizeUrl(part.trim().split(/\s+/)[0]);
        if (u) addUnique(results.images, { url: u, alt: el.alt || '', type: 'image' });
      });
    }
  });

  // 2. <video> tags
  document.querySelectorAll('video').forEach(el => {
    const src = el.currentSrc || el.src;
    if (src) {
      const url = normalizeUrl(src);
      if (url) addUnique(results.videos, { url, type: 'video', duration: el.duration || 0 });
    }
    // poster image
    if (el.poster) {
      const url = normalizeUrl(el.poster);
      if (url) addUnique(results.images, { url, alt: 'Video poster', type: 'image' });
    }
  });

  // 3. <source> tags (inside video/audio/picture)
  document.querySelectorAll('source').forEach(el => {
    const url = normalizeUrl(el.src || el.srcset);
    if (!url) return;
    const parent = el.parentElement?.tagName?.toLowerCase();
    const mime = el.type || '';
    if (parent === 'video' || mime.startsWith('video/')) {
      addUnique(results.videos, { url, type: 'video', mimeType: mime });
    } else if (parent === 'audio' || mime.startsWith('audio/')) {
      addUnique(results.audio, { url, type: 'audio', mimeType: mime });
    } else if (parent === 'picture' || mime.startsWith('image/')) {
      addUnique(results.images, { url, type: 'image', mimeType: mime });
    } else {
      const guessed = guessType(url);
      if (guessed === 'video') addUnique(results.videos, { url, type: 'video' });
      else if (guessed === 'audio') addUnique(results.audio, { url, type: 'audio' });
      else if (guessed === 'image') addUnique(results.images, { url, type: 'image' });
    }
  });

  // 4. <audio> tags
  document.querySelectorAll('audio').forEach(el => {
    const src = el.currentSrc || el.src;
    if (src) {
      const url = normalizeUrl(src);
      if (url) addUnique(results.audio, { url, type: 'audio' });
    }
  });

  // 5. <a> tags pointing to media
  document.querySelectorAll('a[href]').forEach(el => {
    const url = normalizeUrl(el.href);
    if (!url) return;
    const t = guessType(url);
    if (t === 'image') addUnique(results.images, { url, alt: el.textContent.trim(), type: 'image' });
    else if (t === 'video') addUnique(results.videos, { url, type: 'video' });
    else if (t === 'audio') addUnique(results.audio, { url, type: 'audio' });
  });

  // 6. CSS background images from all elements
  const allEls = document.querySelectorAll('*');
  allEls.forEach(el => {
    try {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundImage;
      if (bg && bg !== 'none') {
        const matches = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/g) || [];
        matches.forEach(m => {
          const raw = m.replace(/url\(['"]?/, '').replace(/['"]?\)$/, '');
          const url = normalizeUrl(raw);
          if (url && !url.startsWith('data:')) {
            addUnique(results.backgroundImages, { url, type: 'background', tag: el.tagName.toLowerCase() });
          }
        });
      }
    } catch (e) {}
  });

  // 7. Inline styles with background-image
  document.querySelectorAll('[style]').forEach(el => {
    const style = el.getAttribute('style') || '';
    const matches = style.match(/url\(['"]?([^'")\s]+)['"]?\)/g) || [];
    matches.forEach(m => {
      const raw = m.replace(/url\(['"]?/, '').replace(/['"]?\)$/, '');
      const url = normalizeUrl(raw);
      if (url && !url.startsWith('data:')) {
        addUnique(results.backgroundImages, { url, type: 'background' });
      }
    });
  });

  // 8. meta og:image, twitter:image
  document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"], meta[property="og:video"]').forEach(el => {
    const content = el.getAttribute('content');
    if (!content) return;
    const url = normalizeUrl(content);
    if (!url) return;
    const prop = el.getAttribute('property') || el.getAttribute('name');
    if (prop.includes('video')) addUnique(results.videos, { url, type: 'video', source: 'og:video' });
    else addUnique(results.images, { url, type: 'image', source: prop });
  });

  // 9. data-src lazy loaded images
  document.querySelectorAll('[data-src],[data-lazy],[data-original],[data-srcset]').forEach(el => {
    const attrs = ['data-src','data-lazy','data-original'];
    attrs.forEach(attr => {
      const val = el.getAttribute(attr);
      if (val) {
        const url = normalizeUrl(val);
        if (url) addUnique(results.images, { url, alt: el.alt || '', type: 'image', source: 'lazy' });
      }
    });
  });

  return results;
})();
