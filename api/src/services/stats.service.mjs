import { cacheKeys, cacheTtlSeconds } from '../cache/cache-keys.mjs';
import { getJson, setJson } from '../cache/redis-cache.mjs';
import * as eventRepository from '../repositories/event.repository.mjs';
import * as registrationRepository from '../repositories/registration.repository.mjs';

const determineStatus = (event, registered) => {
  if (registered >= event.capacity) {
    return 'full';
  }

  if (new Date(event.startsAt) < new Date()) {
    return 'past';
  }

  return 'open';
};

export async function getStats() {
  const cached = await getJson(cacheKeys.stats);

  if (cached !== null) {
    return cached;
  }

  const events = await eventRepository.findAll();
  const stats = await Promise.all(
    events.map(async (event) => {
      const registered =
        await registrationRepository.countByEventId(event.id);

      const occupancy = event.capacity > 0
        ? Math.round((registered / event.capacity) * 100)
        : 0;

      return {
        id: event.id,
        title: event.title,
        registered,
        capacity: event.capacity,
        occupancy: `${occupancy}%`,
        status: determineStatus(event, registered)
      };
    })
  );

  await setJson(cacheKeys.stats, stats, cacheTtlSeconds);
  return stats;
}
