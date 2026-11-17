import {
  onMounted,
  onUnmounted,
  ref
} from 'vue';
import {
  connectToNotifications
} from '../api/notifications.js';

const defaultDurationMs = 6_000;

function toastMessage(notification) {
  const title = notification.payload?.eventTitle;

  if (
    typeof title !== 'string' ||
    title.trim() === ''
  ) {
    return null;
  }

  switch (notification.type) {
    case 'notification.event-created':
      return `New event created: ${title}`;

    case 'notification.registration-created':
      return `A new registration was made for ${title}`;

    default:
      return null;
  }
}

export function useNotifications({
  durationMs = defaultDurationMs
} = {}) {
  const toasts = ref([]);
  const seenIds = new Set();
  const timers = new Map();

  let disconnect = () => {};

  function removeToast(notificationId) {
    toasts.value = toasts.value.filter(
      (toast) => toast.id !== notificationId
    );

    const timer = timers.get(notificationId);

    if (timer) {
      clearTimeout(timer);
      timers.delete(notificationId);
    }
  }

  function receiveNotification(notification) {
    const notificationId =
      notification?.notificationId;

    if (
      typeof notificationId !== 'string' ||
      notificationId.trim() === '' ||
      seenIds.has(notificationId)
    ) {
      return;
    }

    const message = toastMessage(notification);

    if (!message) {
      return;
    }

    seenIds.add(notificationId);

    toasts.value = [
      ...toasts.value,
      {
        id: notificationId,
        type: notification.type,
        message
      }
    ];

    const timer = setTimeout(() => {
      removeToast(notificationId);
    }, durationMs);

    timers.set(notificationId, timer);
  }

  onMounted(() => {
    disconnect = connectToNotifications({
      onNotification: receiveNotification
    });
  });

  onUnmounted(() => {
    disconnect();

    for (const timer of timers.values()) {
      clearTimeout(timer);
    }

    timers.clear();
  });

  return {
    toasts,
    removeToast
  };
}
