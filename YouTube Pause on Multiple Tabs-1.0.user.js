// ==UserScript==
// @name         YouTube Pause on Multiple Tabs
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Pause YouTube video if multiple tabs are open on YouTube
// @author       DakareJrF
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const TAB_KEY_PREFIX = 'yt_tab_';
    const GLOBAL_PAUSED_KEY = 'yt_global_paused';
    const TAB_LIFETIME = 5000; // ms - heartbeat validity duration
    const HEARTBEAT_INTERVAL = 2000; // ms - how often to update heartbeat

    const tabId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    function getVideo() {
        return document.querySelector('video');
    }

    function updateHeartbeat() {
        localStorage.setItem(TAB_KEY_PREFIX + tabId, Date.now().toString());
    }

    function removeHeartbeat() {
        localStorage.removeItem(TAB_KEY_PREFIX + tabId);
    }

    function getActiveTabs() {
        const now = Date.now();
        const activeTabs = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(TAB_KEY_PREFIX)) {
                const timestamp = parseInt(localStorage.getItem(key), 10);
                if (now - timestamp < TAB_LIFETIME) {
                    activeTabs.push(key);
                }
            }
        }
        return activeTabs;
    }

    function syncPlayback() {
        const video = getVideo();
        if (!video) return;

        const activeTabs = getActiveTabs();
        if (activeTabs.length <= 1) return; // Only sync if multiple tabs

        const globalPaused = localStorage.getItem(GLOBAL_PAUSED_KEY) === 'true';
        if (video.paused !== globalPaused) {
            if (globalPaused) {
                video.pause();
                console.log('[YT Sync] Paused video to match global state.');
            } else {
                video.play();
                console.log('[YT Sync] Played video to match global state.');
            }
        }
    }

    function onVideoPause() {
        const activeTabs = getActiveTabs();
        if (activeTabs.length > 1) {
            localStorage.setItem(GLOBAL_PAUSED_KEY, 'true');
        }
    }

    function onVideoPlay() {
        const activeTabs = getActiveTabs();
        if (activeTabs.length > 1) {
            localStorage.setItem(GLOBAL_PAUSED_KEY, 'false');
        }
    }

    updateHeartbeat();
    syncPlayback();

    const video = getVideo();
    if (video) {
        video.addEventListener('pause', onVideoPause);
        video.addEventListener('play', onVideoPlay);
    }

    const heartbeatTimer = setInterval(() => {
        updateHeartbeat();
        syncPlayback();
    }, HEARTBEAT_INTERVAL);

    window.addEventListener('beforeunload', () => {
        removeHeartbeat();
        clearInterval(heartbeatTimer);
    });

    window.addEventListener('storage', (e) => {
        if (e.key === GLOBAL_PAUSED_KEY || (e.key && e.key.startsWith(TAB_KEY_PREFIX))) {
            syncPlayback();
        }
    });

})();
