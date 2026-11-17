import {
  flushPromises,
  mount
} from '@vue/test-utils';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { defineComponent } from 'vue';
import {
  connectToNotifications
} from '../src/api/notifications.js';
import {
  useNotifications
} from '../src/composables/useNotifications.js';

vi.mock('../src/api/notifications.js', () => ({
  connectToNotifications: vi.fn()
}));

const Harness = defineComponent({
  setup() {
    return useNotifications({
      durationMs: 6_000
    });
  },

  template: `
    <div>
      <p
        v-for="toast in toasts"
        :key="toast.id"
      >
        {{ toast.message }}
      </p>
    </div>
  `
});

describe('useNotifications', () => {
  let onNotification;
  let disconnect;

  beforeEach(() => {
    vi.useFakeTimers();

    disconnect = vi.fn();

    vi.mocked(connectToNotifications)
      .mockImplementation((options) => {
        onNotification = options.onNotification;
        return disconnect;
      });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows only one toast for a repeated ID', async () => {
    const wrapper = mount(Harness);

    const notification = {
      notificationId: 'message-123',
      type: 'notification.registration-created',
      payload: {
        eventId: 42,
        eventTitle: 'Campus Coding Night'
      }
    };

    onNotification(notification);
    onNotification(notification);

    await flushPromises();

    expect(wrapper.findAll('p')).toHaveLength(1);

    expect(wrapper.text()).toContain(
      'A new registration was made for ' +
        'Campus Coding Night'
    );

    expect(wrapper.text()).not.toContain('Ada');
    expect(wrapper.text()).not.toContain(
      'ada@example.com'
    );
  });

  it('removes a toast after six seconds', async () => {
    const wrapper = mount(Harness);

    onNotification({
      notificationId: 'message-456',
      type: 'notification.event-created',
      payload: {
        eventId: 43,
        eventTitle: 'Design Workshop'
      }
    });

    await flushPromises();

    expect(wrapper.findAll('p')).toHaveLength(1);

    vi.advanceTimersByTime(6_000);
    await flushPromises();

    expect(wrapper.findAll('p')).toHaveLength(0);
  });

  it('disconnects when the app unmounts', () => {
    const wrapper = mount(Harness);

    wrapper.unmount();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
