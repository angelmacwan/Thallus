import { useCallback } from 'react';

const STORAGE_KEY = 'thallus_notif_permission_asked';

function isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Hook for browser push notifications.
 *
 * ensurePermission() — call this in response to a user gesture (button click)
 *   before starting a long-running task. It requests permission if not already
 *   decided and persists the fact that we asked so we don't keep nagging.
 *
 * notify(title, body, options) — fires a notification if permission is granted.
 *   Safe to call even when permission is not granted (no-op).
 */
export function useNotifications() {
    const supported = isSupported();

    const ensurePermission = useCallback(async () => {
        if (!supported) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;
        // 'default' — ask once
        if (localStorage.getItem(STORAGE_KEY)) return false; // already asked, they didn't grant
        try {
            const result = await Notification.requestPermission();
            localStorage.setItem(STORAGE_KEY, result);
            return result === 'granted';
        } catch {
            return false;
        }
    }, [supported]);

    const notify = useCallback(
        (title, body, options = {}) => {
            if (!supported || Notification.permission !== 'granted') return;
            try {
                new Notification(title, {
                    body,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    ...options,
                });
            } catch {
                // Service-worker context may not be available — silent fail
            }
        },
        [supported],
    );

    return { ensurePermission, notify, supported };
}
