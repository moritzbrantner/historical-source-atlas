'use client';

export function postNotificationRead(notificationId: string) {
  return fetch(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'POST',
    },
  );
}
