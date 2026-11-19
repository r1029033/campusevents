import { AppError } from '../errors/app-error.mjs';
import * as eventService from '../services/event.service.mjs';
import * as registrationService from '../services/registration.service.mjs';

const normalizeTitle = (title) => title.trim().toLocaleLowerCase();

function isUpcoming(event, now) {
  return new Date(event.startsAt).getTime() >= now.getTime();
}

export async function listUpcomingEvents(now = new Date()) {
  const events = await eventService.listEvents();
  return events.filter((event) => isUpcoming(event, now));
}

export async function listPastEvents(now = new Date()) {
  const events = await eventService.listEvents();
  return events.filter((event) => !isUpcoming(event, now));
}

async function resolveEvent(reference) {
  const events = await eventService.listEvents();
  const numericId = Number(reference);

  if (Number.isInteger(numericId) && numericId > 0) {
    return events.find((event) => event.id === numericId) ?? null;
  }

  const normalizedReference = normalizeTitle(reference);
  const matches = events.filter(
    (event) => normalizeTitle(event.title) === normalizedReference
  );

  if (matches.length > 1) {
    throw new AppError(
      409,
      'AMBIGUOUS_EVENT',
      'More than one event has that title. Use the event ID instead.'
    );
  }

  return matches[0] ?? null;
}

export async function registerForEvent(reference, participant) {
  const event = await resolveEvent(reference);

  if (!event) {
    throw new AppError(
      404,
      'NOT_FOUND',
      `Event "${reference}" not found`
    );
  }

  const registration = await registrationService.register(
    event.id,
    participant
  );

  return { event, registration };
}
