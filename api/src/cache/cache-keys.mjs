export const cacheKeys = Object.freeze({
  events: 'campus-events:events',
  event: (id) => `campus-events:events:${id}`,
  registrations: (eventId) =>
    `campus-events:events:${eventId}:registrations`,
  stats: 'campus-events:stats'
});

export const cacheTtlSeconds = 60;