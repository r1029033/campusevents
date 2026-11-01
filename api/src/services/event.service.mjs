import { AppError } from '../errors/app-error.mjs';
import * as eventRepository from '../repositories/event.repository.mjs';
import * as registrationRepository from '../repositories/registration.repository.mjs';
import {
  cacheKeys,
  cacheTtlSeconds
} from '../cache/cache-keys.mjs';
import {
  deleteKeys,
  getJson,
  setJson
} from '../cache/redis-cache.mjs';

const eventNotFound = (id) =>
  new AppError(
    404,
    'NOT_FOUND',
    `Event with id ${id} not found`
  );

export async function listEvents() {
  const cached = await getJson(cacheKeys.events);

  if (cached !== null) {
    return cached;
  }

  const events = await eventRepository.findAll();

  await setJson(
    cacheKeys.events,
    events,
    cacheTtlSeconds
  );

  return events;
}
export async function getEvent(id) {
  const key = cacheKeys.event(id);
  const cached = await getJson(key);

  if (cached !== null) {
    return cached;
  }

  const event = await eventRepository.findById(id);

  if (!event) {
    throw eventNotFound(id);
  }

  const registered =
    await registrationRepository.countByEventId(id);

  const result = {
    ...event,
    registered,
    spotsLeft: Math.max(event.capacity - registered, 0)
  };

  await setJson(key, result, cacheTtlSeconds);
  return result;
}

export async function createEvent(data) {
  const event = await eventRepository.create(data);

  await deleteKeys(
    cacheKeys.events,
    cacheKeys.stats
  );

  return event;
}

export async function updateEvent(id, data) {
  const event = await eventRepository.updateById(id, data);

  if (!event) {
    throw eventNotFound(id);
  }

  await deleteKeys(
    cacheKeys.events,
    cacheKeys.event(id),
    cacheKeys.stats
  );

  return event;
}

export async function deleteEvent(id) {
  const deleted = await eventRepository.deleteById(id);

  if (!deleted) {
    throw eventNotFound(id);
  }

  await deleteKeys(
    cacheKeys.events,
    cacheKeys.event(id),
    cacheKeys.registrations(id),
    cacheKeys.stats
  );
}
