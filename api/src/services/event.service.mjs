import { AppError } from '../errors/app-error.mjs';
import * as eventRepository from '../repositories/event.repository.mjs';
import * as registrationRepository from '../repositories/registration.repository.mjs';

const eventNotFound = (id) =>
  new AppError(
    404,
    'NOT_FOUND',
    `Event with id ${id} not found`
  );

export function listEvents() {
  return eventRepository.findAll();
}

export async function getEvent(id) {
  const event = await eventRepository.findById(id);

  if (!event) {
    throw eventNotFound(id);
  }

  const registered = await registrationRepository.countByEventId(id);

  return {
    ...event,
    registered,
    spotsLeft: Math.max(event.capacity - registered, 0)
  };
}

export function createEvent(data) {
  return eventRepository.create(data);
}

export async function updateEvent(id, data) {
  const event = await eventRepository.updateById(id, data);

  if (!event) {
    throw eventNotFound(id);
  }

  return event;
}

export async function deleteEvent(id) {
  const deleted = await eventRepository.deleteById(id);

  if (!deleted) {
    throw eventNotFound(id);
  }
}