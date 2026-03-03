// popup.js

let allData = { images: [], videos: [], audio: [], backgroundImages: [] };
let currentTab = 'images';
let selected = new Set();
let isListMode = false;
let searchQuery = '';

const $ = id => document.getElementById(id);

// ── Toasts ──────────────────────────────────────────────────────
function showToast(msg, duration = 2000) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

// ── Scan ─────────────────────────────────────────────────────────
$('scanBtn').addEventListener('click', async () => {
  const btn = $('scanBtn');
  btn.disabled = true;
  btn.textContent = 'Scanning…';
  selected.clear();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    $('pageInfo').textContent = new URL(tab.url).hostname;

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    allData = result.result || { images: [], videos: [], audio: [], backgroundImages: [] };
    updateCounts();
    renderGrid();
  } catch (err) {
    showToast('⚠ Could not scan this page', 3000);
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Scan Page';
  }
});

// ── Tab switching ─────────────────────────────────────────────────
document.querySelectorAll('.stat-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.stat-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentTab = chip.dataset.tab;
    selected.clear();
    renderGrid();
  });
});

// ── Counts ────────────────────────────────────────────────────────
function updateCounts() {
  $('imgCount').textContent = allData.images.length;
  $('vidCount').textContent = allData.videos.length;
  $('audCount').textContent = allData.audio.length;
  $('bgCount').textContent = allData.backgroundImages.length;
}

// ── Render ────────────────────────────────────────────────────────
function currentItems() {
  const items = allData[currentTab] || [];
  if (!searchQuery) return items;
  return items.filter(i => i.url.toLowerCase().includes(searchQuery));
}

function filename(url) {
  try {
    const p = new URL(url).pathname;
    return decodeURIComponent(p.split('/').pop()) || 'file';
  } catch { return 'file'; }
}

function renderGrid() {
  const grid = $('mediaGrid');
  const empty = $('emptyState');
  const items = currentItems();

  if (items.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'flex';
    empty.innerHTML = `<div class="icon">🔍</div><p>No ${currentTab} found</p><small>Try scanning another page or check the other tabs.</small>`;
    $('selectionInfo').textContent = '0 selected';
    return;
  }

  grid.style.display = 'grid';
  empty.style.display = 'none';
  grid.className = 'grid' + (isListMode ? ' list-mode' : '');
  grid.innerHTML = '';

  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'media-card' + (selected.has(item.url) ? ' selected' : '');

    const check = document.createElement('div');
    check.className = 'select-check';
    check.textContent = selected.has(item.url) ? '✓' : '';

    let thumb;
    const isImg = currentTab === 'images' || currentTab === 'backgroundImages';
    if (isImg) {
      thumb = document.createElement('img');
      thumb.className = 'card-thumb';
      thumb.src = item.url;
      thumb.alt = item.alt || '';
      thumb.loading = 'lazy';
      thumb.onerror = () => {
        thumb.style.display = 'none';
        const ph = document.createElement('div');
        ph.className = 'card-thumb placeholder';
        ph.textContent = currentTab === 'backgroundImages' ? '🎨' : '🖼';
        card.insertBefore(ph, card.querySelector('.card-info'));
      };
    } else {
      thumb = document.createElement('div');
      thumb.className = 'card-thumb placeholder';
      thumb.textContent = currentTab === 'videos' ? '🎬' : '🎵';
    }

    const info = document.createElement('div');
    info.className = 'card-info';

    const urlEl = document.createElement('div');
    urlEl.className = 'card-url';
    urlEl.textContent = filename(item.url);
    urlEl.title = item.url;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const dlBtn = document.createElement('button');
    dlBtn.className = 'card-btn';
    dlBtn.textContent = '⬇ Save';
    dlBtn.addEventListener('click', e => { e.stopPropagation(); downloadFile(item.url); });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'card-btn';
    copyBtn.textContent = '⎘ URL';
    copyBtn.addEventListener('click', e => {
      e.stopPropagation();
      navigator.clipboard.writeText(item.url).then(() => {
        copyBtn.classList.add('copied');
        copyBtn.textContent = '✓ Copied';
        setTimeout(() => { copyBtn.classList.remove('copied'); copyBtn.textContent = '⎘ URL'; }, 1500);
      });
    });

    actions.appendChild(dlBtn);
    actions.appendChild(copyBtn);
    info.appendChild(urlEl);
    info.appendChild(actions);

    card.appendChild(check);
    card.appendChild(thumb);
    card.appendChild(info);

    card.addEventListener('click', () => {
      if (selected.has(item.url)) {
        selected.delete(item.url);
        card.classList.remove('selected');
        check.textContent = '';
      } else {
        selected.add(item.url);
        card.classList.add('selected');
        check.textContent = '✓';
      }
      updateSelectionInfo();
    });

    grid.appendChild(card);
  });

  updateSelectionInfo();
}

function updateSelectionInfo() {
  $('selectionInfo').textContent = `${selected.size} selected`;
}

// ── Search ────────────────────────────────────────────────────────
$('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase().trim();
  renderGrid();
});

// ── Select All ────────────────────────────────────────────────────
$('selectAllBtn').addEventListener('click', () => {
  const items = currentItems();
  if (selected.size === items.length) {
    selected.clear();
  } else {
    items.forEach(i => selected.add(i.url));
  }
  renderGrid();
});

// ── View Toggle ───────────────────────────────────────────────────
$('viewToggleBtn').addEventListener('click', () => {
  isListMode = !isListMode;
  $('viewToggleBtn').textContent = isListMode ? '⊞' : '☰';
  renderGrid();
});

// ── Download ──────────────────────────────────────────────────────
function downloadFile(url) {
  chrome.runtime.sendMessage({ action: 'downloadFile', url, filename: filename(url) }, res => {
    if (res?.success) showToast('⬇ Download started');
    else showToast('⚠ Download failed');
  });
}

// ── ZIP Download ──────────────────────────────────────────────────
$('zipBtn').addEventListener('click', async () => {
  const toDownload = selected.size > 0
    ? [...selected]
    : currentItems().map(i => i.url);

  if (toDownload.length === 0) {
    showToast('Nothing to download. Scan a page first!');
    return;
  }

  showToast(`⏳ Fetching ${toDownload.length} files…`, 5000);

  try {
    // Dynamically import JSZip from CDN
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    const usedNames = new Map();

    const fetches = toDownload.map(async (url, i) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const blob = await resp.blob();
        let name = filename(url) || `file_${i}`;
        // Deduplicate filenames
        if (usedNames.has(name)) {
          const count = usedNames.get(name) + 1;
          usedNames.set(name, count);
          const parts = name.split('.');
          if (parts.length > 1) {
            name = parts.slice(0, -1).join('.') + `_${count}.` + parts[parts.length - 1];
          } else {
            name = name + `_${count}`;
          }
        } else {
          usedNames.set(name, 1);
        }
        zip.file(name, blob);
      } catch (e) {
        console.warn('Failed to fetch:', url, e);
      }
    });

    await Promise.all(fetches);

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const zipUrl = URL.createObjectURL(zipBlob);

    // Trigger download
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `mediavault_${currentTab}_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(zipUrl), 5000);

    showToast(`✓ ZIP ready with ${toDownload.length} files!`, 3000);
  } catch (err) {
    console.error(err);
    showToast('⚠ ZIP failed. Check console.', 3000);
  }
});

function loadJSZip() {
  return new Promise((resolve, reject) => {
    if (window.JSZip) return resolve(window.JSZip);
    const script = document.createElement('script');
    script.src = 'jszip.min.js';
    script.onload = () => resolve(window.JSZip);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
