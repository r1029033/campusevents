import { logger } from '../config/logger.mjs';
import { AppError } from '../errors/app-error.mjs';
import * as eventRepository from '../repositories/event.repository.mjs';
import * as registrationRepository from '../repositories/registration.repository.mjs';
import {
  publishRegistrationConfirmation
} from '../messaging/mail.publisher.mjs';

const eventNotFound = (id) =>
  new AppError(
    404,
    'NOT_FOUND',
    `Event with id ${id} not found`
  );

export async function listRegistrations(eventId) {
  const event = await eventRepository.findById(eventId);

  if (!event) {
    throw eventNotFound(eventId);
  }

  return registrationRepository.findAllByEventId(eventId);
}

export async function register(eventId, participant) {
  const event = await eventRepository.findById(eventId);

  if (!event) {
    throw eventNotFound(eventId);
  }

  const existing =
    await registrationRepository.findByEventAndEmail(
      eventId,
      participant.email
    );

  if (existing) {
    throw new AppError(
      409,
      'CONFLICT',
      `${participant.email} is already registered for this event`
    );
  }

  const count =
    await registrationRepository.countByEventId(eventId);

  if (count >= event.capacity) {
    throw new AppError(
      409,
      'CONFLICT',
      'Event is full'
    );
  }

  const registration = await registrationRepository.create({
    eventId,
    name: participant.name,
    email: participant.email
  });

  void publishRegistrationConfirmation({
  email: registration.email,
  name: registration.name,
  eventTitle: event.title,
  startsAt: event.startsAt,
  location: event.location
});

  logger.info(
    `new registration for ${event.title}: ` +
    `${participant.name} <${participant.email}>`
  );

  return registration;
}
