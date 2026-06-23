// Inbox frontend integration with backend
// This file intentionally does not contain mock message data.
// Message lists are rendered server-side; JS wires UI actions to backend endpoints.

const CSRF_TOKEN = (document.querySelector('meta[name="csrf-token"]') || {}).content || null;

// Notifications: poll server for unread count and show in-page toast when new messages arrive
let lastUnreadCount = null;
async function fetchUnreadCount() {
    try {
        const res = await fetch('/api/messages/unread', { credentials: 'same-origin' });
        if (!res.ok) return null;
        const j = await res.json();
        return (j && typeof j.unread === 'number') ? j.unread : null;
    } catch (e) {
        return null;
    }
}

function showToast(text) {
    const existing = document.querySelector('.inbox-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'inbox-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.add('visible'); }, 20);
    setTimeout(() => { t.classList.remove('visible'); setTimeout(()=>t.remove(),300); }, 5000);
}

async function pollUnreadLoop() {
    const count = await fetchUnreadCount();
    if (count === null) return;
    if (lastUnreadCount === null) lastUnreadCount = count;
    if (count > lastUnreadCount) {
        const diff = count - lastUnreadCount;
        showToast(`You have ${diff} new message${diff>1?'s':''}`);
        lastUnreadCount = count;
    } else {
        lastUnreadCount = count;
    }
}

// Polling removed: relying on Socket.IO for real-time notifications

// Socket.IO real-time notifications
async function initSocketNotifications() {
    if (!window.currentUserId) {
        console.debug('initSocketNotifications: no currentUserId, socket not initialized');
        return;
    }
    // load socket.io client if missing
    if (typeof io === 'undefined') {
        await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = '/socket.io/socket.io.js';
            s.onload = resolve;
            s.onerror = resolve;
            document.head.appendChild(s);
        });
    }
    if (typeof io === 'undefined') return;
    try {
        const socket = io();
        socket.on('connect', () => {
            console.debug('socket connected, registering user', window.currentUserId);
            socket.emit('register', window.currentUserId);
        });
        socket.on('connect_error', (err) => console.warn('socket connect_error', err));
        socket.on('new_message', (data) => {
            console.debug('received new_message', data);
            // immediate UI notification
            showToast('You have a new message');
            // increment cached unread count when possible
            if (typeof lastUnreadCount === 'number') lastUnreadCount = lastUnreadCount + 1;
        });
    } catch (e) {
        console.warn('initSocketNotifications error', e);
    }
}

initSocketNotifications();

// =====================================
// DELETE MODE
// =====================================

let showCheckboxes = false;

function toggleDelete() {

    const checkboxes =
        document.querySelectorAll('.checkbox');

    const deleteBtn =
        document.querySelector('.deleteBtn');

    // SECOND CLICK = DELETE
    if (showCheckboxes) {

        deleteSelectedMessages();

    } else {

            checkboxes.forEach(box => {
                box.classList.add('show');
            });

        showCheckboxes = true;
        if (deleteBtn) {
            deleteBtn.classList.add('confirm');
            deleteBtn.setAttribute('aria-label', 'Confirm delete');
        }

    }
}

function exitDeleteMode() {

    const checkboxes =
        document.querySelectorAll('.checkbox');

    checkboxes.forEach(box => {
        const input = box.querySelector('input');
        if (input) input.checked = false;
        box.classList.remove('show');
    });

    showCheckboxes = false;

    const del = document.querySelector('.deleteBtn');
    if (del) {
        del.classList.remove('confirm');
        del.setAttribute('aria-label', 'Delete messages');
    }
}


// =====================================
// DELETE SELECTED
// =====================================

async function deleteSelectedMessages() {

    const selectedIds = [];

    document.querySelectorAll('li').forEach(li => {

        const checkboxLabel = li.querySelector('.checkbox');
        const checkbox = checkboxLabel ? checkboxLabel.querySelector('input') : null;
        if (checkbox && checkbox.checked) {
            selectedIds.push(li.dataset.id);
        }

    });

    if (!selectedIds.length) {

        exitDeleteMode();
        return;

    }

    try {


        // Send individual DELETE requests to backend for each message
        for (const id of selectedIds) {
            const headers = { 'Content-Type': 'application/json' };
            if (CSRF_TOKEN) headers['x-csrf-token'] = CSRF_TOKEN;
            const res = await fetch(`/dashboard/message/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers
            });

            if (!res.ok) {
                // try to parse JSON error
                let msg = 'Could not delete some messages.';
                try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) {}
                throw new Error(msg);
            }

            const li = document.querySelector(`li[data-id="${id}"]`);
            if (li) li.remove();
        }

        exitDeleteMode();

    } catch (err) {

        alert(err.message || 'Could not delete messages.');

    }

}

function openMessage(messageId) {
    if (showCheckboxes) return;
    // Navigate to server-rendered message view
    if (!messageId) return;
    window.location.href = `/dashboard/message/${encodeURIComponent(messageId)}`;
}

function returnBack() {
    if (showCheckboxes) {
        exitDeleteMode();
        return;
    }
    // If we're on a message view, navigate explicitly to the inbox and force a fresh load
    try {
        const path = window.location.pathname || '';
        if (path.includes('/dashboard/message')) {
            // force reload from server to refresh unread counts
            window.location.href = '/dashboard/inbox?_=' + Date.now();
            return;
        }
    } catch (e) {
        // fall back to history.back()
    }
    history.back();
}

let selectedPlatform = "instagram";

// Card style history for undo/restore
let cardHistory = [];
let originalCardClasses = null;

function moveIndicator(platform){

    const positions = {
        instagram:0,
        snapchat:1,
        tiktok:2,
        whatsapp:3,
        facebook:4
    };

    const indicator = document.querySelector(".tab-indicator");
    if (!indicator) return;
    // remove any existing pos-* class
    indicator.classList.remove('pos-0','pos-1','pos-2','pos-3','pos-4');
    const posClass = `pos-${positions[platform]}`;
    indicator.classList.add(posClass);
}

document
.querySelectorAll("#platformTabs span")
.forEach(tab=>{

    tab.addEventListener("click",()=>{

        document
        .querySelectorAll("#platformTabs span")
        .forEach(t=>{
            t.classList.remove("active");
        });

        tab.classList.add("active");

        selectedPlatform =
        tab.dataset.platform;

        moveIndicator(selectedPlatform);

        updateReplyButton();

    });

});

function updateReplyButton() {

    const names = {
        instagram: "Instagram",
        snapchat: "Snapchat",
        tiktok: "TikTok",
        whatsapp: "WhatsApp",
        facebook: "Facebook"
    };

    const replyBtn = document.getElementById("replyBtn");
    if (!replyBtn) return;
    const span = replyBtn.querySelector('span');
    if (span) {
        span.textContent = `Reply via ${names[selectedPlatform]}`;
    } else {
        replyBtn.textContent = `Reply via ${names[selectedPlatform]}`;
    }

}

async function screenshotCard() {
    const card = document.querySelector('.card');
    if (!card || typeof html2canvas === 'undefined') return;
    try {
        // Clone the card so we can adjust DOM for canvas rendering without touching the live UI
        const clone = card.cloneNode(true);

        // Remove dynamic classes that may interfere
        clone.style.width = getComputedStyle(card).width;
        clone.style.height = getComputedStyle(card).height;
        clone.style.margin = '0';
        clone.style.position = 'relative';

        // Find inner and original backgrounds
        const origInner = card.querySelector('.inner_card');
        const cloneInner = clone.querySelector('.inner_card');
        // If original used clip-path which html2canvas sometimes ignores, emulate with a notch element
        if (cloneInner) {
            // remove clip-path so clone renders cleanly
            cloneInner.style.clipPath = 'none';
            cloneInner.style.webkitClipPath = 'none';

            // Create notch element that shows the outer card behind the inner card
            const notch = document.createElement('div');
            notch.className = 'screenshot-notch';
            // size and position
            notch.style.position = 'absolute';
            notch.style.left = '0';
            notch.style.right = '0';
            notch.style.top = '0';
            notch.style.height = '36px';
            notch.style.pointerEvents = 'none';
            // match outer card background (use computed style from original)
            const cardBg = getComputedStyle(card).backgroundImage || getComputedStyle(card).background || 'transparent';
            notch.style.background = cardBg;
            // give a smooth curved bottom edge to emulate the notch
            notch.style.borderBottomLeftRadius = '24px';
            notch.style.borderBottomRightRadius = '24px';
            notch.style.boxShadow = 'inset 0 -6px 12px rgba(0,0,0,0.06)';

            // ensure clone is positioned to allow absolute notch
            clone.style.overflow = 'visible';
            cloneInner.style.position = 'relative';
            // insert notch before the inner content
            cloneInner.insertBefore(notch, cloneInner.firstChild);
        }

        // Place clone into an offscreen container so it inherits fonts etc.
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.pointerEvents = 'none';
        container.appendChild(clone);
        document.body.appendChild(container);

        // Render with transparent background to preserve outer transparency
        const canvas = await html2canvas(clone, { backgroundColor: null, useCORS: true, scale: window.devicePixelRatio || 1 });

        // cleanup
        container.remove();

        const link = document.createElement('a');
        link.download = 'dmme-message.png';
        link.href = canvas.toDataURL();
        link.click();
    } catch (e) {
        console.error('screenshot failed', e);
    }
}

function replyToMessage() {
    const urls = {
        instagram: 'https://instagram.com',
        snapchat: 'https://snapchat.com',
        tiktok: 'https://tiktok.com',
        whatsapp: 'https://wa.me/',
        facebook: 'https://facebook.com'
    };
    const url = urls[selectedPlatform] || 'https://instagram.com';
    window.open(url, '_blank');
}



// selectedPlatform = message.platform;

// If a server-rendered `message` object exists, initialize platform UI.
if (typeof message !== 'undefined' && message) {
    document.querySelectorAll("#platformTabs span").forEach(tab => {
        tab.classList.remove("active");
        if (tab.dataset.platform === message.platform) {
            tab.classList.add("active");
        }
    });

    selectedPlatform = message.platform || "instagram";
    moveIndicator(selectedPlatform);
    updateReplyButton();
} else {
    // ensure UI has sensible defaults
    moveIndicator(selectedPlatform);
    updateReplyButton();
}

// DOM event bindings for elements that previously used inline handlers
function initInboxBindings() {
    const btnBack = document.getElementById('btnBack');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnDeleteToggle = document.getElementById('btnDeleteToggle');
    const msgItems = Array.from(document.querySelectorAll('.msg-item'));
    const btnChangeColor = document.getElementById('btnChangeColor');
    const btnScreenshot = document.getElementById('btnScreenshot');
    const replyBtn = document.getElementById('replyBtn');

    if (btnBack) btnBack.addEventListener('click', returnBack);
    if (btnRefresh) btnRefresh.addEventListener('click', () => window.location.reload());
    if (btnDeleteToggle) btnDeleteToggle.addEventListener('click', toggleDelete);

    msgItems.forEach(li => li.addEventListener('click', () => {
        const id = li.dataset.id;
        if (id) openMessage(id);
    }));

    if (btnChangeColor) {
        // ensure first click always advances the palette
        btnChangeColor.addEventListener('click', (e) => {
            if (e.shiftKey) {
                restoreOriginalStyle();
                return;
            }
            // Force change even if no palette present
            changeCardColor();
        });
        // right-click restores previous style
        btnChangeColor.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            restorePreviousStyle();
        });
    }
    if (btnScreenshot) btnScreenshot.addEventListener('click', screenshotCard);
    if (replyBtn) replyBtn.addEventListener('click', replyToMessage);
}

// Initialize immediately if DOM is ready, otherwise wait for DOMContentLoaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInboxBindings);
} else {
    initInboxBindings();
}

// Simple card color changer used by the UI
function changeCardColor() {
    const inner = document.querySelector('.card .inner_card');
    const card = inner ? inner.closest('.card') : document.querySelector('.card');
    if (!card) return;
    const classes = ['palette-2','palette-1','palette-3'];
    // store original classes first time
    if (!originalCardClasses) originalCardClasses = card.className;
    // push previous state
    cardHistory.push(card.className);

    const current = classes.find(c => card.classList.contains(c));
    let nextIdx = 0;
    if (!current) {
        nextIdx = 0;
    } else {
        const curIdx = classes.indexOf(current);
        nextIdx = (curIdx + 1) % classes.length;
    }
    classes.forEach(c => card.classList.remove(c));
    card.classList.add(classes[nextIdx]);
}

function restorePreviousStyle() {
    const inner = document.querySelector('.card .inner_card');
    const card = inner ? inner.closest('.card') : document.querySelector('.card');
    if (!card) return;
    if (!cardHistory.length) return;
    const prev = cardHistory.pop();
    card.className = prev;
}

function restoreOriginalStyle() {
    const inner = document.querySelector('.card .inner_card');
    const card = inner ? inner.closest('.card') : document.querySelector('.card');
    if (!card) return;
    if (originalCardClasses) {
        card.className = originalCardClasses;
        // clear history
        cardHistory = [];
        originalCardClasses = null;
    }
}