/**
 * Thin wrapper around the browser's desktop Notification API. Never blocks
 * or throws on unsupported browsers / denied permission — the caller
 * should pair this with an in-page fallback (e.g. a toast), since some
 * browsers suppress desktop notifications while the tab itself is focused,
 * which is exactly when a user is likely to notice this during testing.
 */

export async function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

export function notifyAfk(message: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification("Cato", { body: message });
}
