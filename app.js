// Configuration - REPLACE WITH YOUR API GATEWAY URL
const API_URL = 'https://1av0tf5af2.execute-api.us-east-1.amazonaws.com/links';

// State
let allLinks = [];
let currentFilter = '';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearFilterBtn = document.getElementById('clearFilter');
const tagCloud = document.getElementById('tagCloud');
const linksContainer = document.getElementById('linksContainer');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const emptyState = document.getElementById('emptyState');
const statsElement = document.getElementById('stats');
const linkCount = document.getElementById('linkCount');

// PWA Install
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');
const dismissBtn = document.getElementById('dismissBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadLinks();
    setupEventListeners();
    setupPWA();
});

// Setup Event Listeners
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    clearFilterBtn.addEventListener('click', clearFilter);
    retryBtn.addEventListener('click', loadLinks);
}

// Load Links from API
async function loadLinks() {
    showLoading();

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.success) {
            allLinks = data.links || [];
            renderLinks(allLinks);
            renderTagCloud(allLinks);
            updateStats(allLinks.length);
            hideLoading();
        } else {
            throw new Error(data.error || 'Failed to load links');
        }

    } catch (err) {
        console.error('Error loading links:', err);
        showError(err.message);
    }
}

// Render Links
function renderLinks(links) {
    linksContainer.innerHTML = '';

    if (links.length === 0) {
        showEmptyState();
        return;
    }

    hideEmptyState();

    links.forEach(link => {
        const card = createLinkCard(link);
        linksContainer.appendChild(card);
    });
}

// Create Link Card
function createLinkCard(link) {
    const card = document.createElement('div');
    card.className = 'link-card';

    // Format date
    const date = new Date(link.createdAt);
    const formattedDate = formatDate(date);

    // Create card HTML
    card.innerHTML = `
        <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-url">
            ${getDomain(link.url)}
        </a>
        ${link.note ? `<p class="link-note">${escapeHtml(link.note)}</p>` : ''}
        <div class="link-tags">
            ${link.tags.map(tag => `<span class="link-tag">#${tag}</span>`).join('')}
        </div>
        <div class="link-meta">
            <span class="link-date">${formattedDate}</span>
            <span class="link-source">📱 ${link.source}</span>
        </div>
    `;

    // Click card to open link
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'A') {
            window.open(link.url, '_blank');
        }
    });

    return card;
}

// Render Tag Cloud
function renderTagCloud(links) {
    const tagCounts = {};

    // Count tags
    links.forEach(link => {
        link.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    // Sort by count
    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20); // Top 20 tags

    tagCloud.innerHTML = '';

    sortedTags.forEach(([tag, count]) => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `#${tag} <span class="tag-count">(${count})</span>`;
        chip.addEventListener('click', () => filterByTag(tag));
        tagCloud.appendChild(chip);
    });
}

// Handle Search
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    currentFilter = query;

    if (query === '') {
        renderLinks(allLinks);
        return;
    }

    // Filter links by tag
    const filtered = allLinks.filter(link =>
        link.tags.some(tag => tag.includes(query))
    );

    renderLinks(filtered);
    updateStats(filtered.length, allLinks.length);
}

// Filter by Tag
function filterByTag(tag) {
    searchInput.value = tag;
    currentFilter = tag;

    const filtered = allLinks.filter(link =>
        link.tags.includes(tag)
    );

    renderLinks(filtered);
    updateStats(filtered.length, allLinks.length);
}

// Clear Filter
function clearFilter() {
    searchInput.value = '';
    currentFilter = '';
    renderLinks(allLinks);
    updateStats(allLinks.length);
}

// Update Stats
function updateStats(count, total = null) {
    console.log("from update stat", count, total);
    if (total !== null && total !== count) {
        linkCount.textContent = `${count} of ${total} links`;
    } else {
        linkCount.textContent = `${count} link${count !== 1 ? 's' : ''}`;
    }
}

// Show/Hide States
function showLoading() {
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    emptyState.classList.add('hidden');
    linksContainer.innerHTML = '';
    statsElement.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
    console.log("loading classList", loading.classList)
    statsElement.classList.remove('hidden');
}

function showError(message) {
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    errorMessage.textContent = message;
    linksContainer.innerHTML = '';
    statsElement.classList.add('hidden');
}

function showEmptyState() {
    emptyState.classList.remove('hidden');
}

function hideEmptyState() {
    emptyState.classList.add('hidden');
}

// Utility Functions
function getDomain(url) {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch {
        return url;
    }
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;

    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// PWA Setup
function setupPWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered:', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
    }

    // Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        console.log(`Install outcome: ${outcome}`);
        deferredPrompt = null;
        hideInstallPrompt();
    });

    dismissBtn.addEventListener('click', hideInstallPrompt);
}

function showInstallPrompt() {
    installPrompt.classList.remove('hidden');
}

function hideInstallPrompt() {
    installPrompt.classList.add('hidden');
}