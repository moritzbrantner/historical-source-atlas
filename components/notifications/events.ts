export const NOTIFICATION_MARK_READ_EVENT = 'notifications:mark-read';
export const NOTIFICATION_MARK_ALL_READ_EVENT = 'notifications:mark-all-read';

export function dispatchNotificationMarkedRead(notificationId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_MARK_READ_EVENT, {
      detail: { notificationId },
    }),
  );
}

export function dispatchAllNotificationsMarkedRead() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATION_MARK_ALL_READ_EVENT));
}
