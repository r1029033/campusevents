import { cacheKeys, cacheTtlSeconds } from '../cache/cache-keys.mjs';
import { deleteKeys, getJson, setJson } from '../cache/redis-cache.mjs';
import { logger } from '../config/logger.mjs';
import { AppError } from '../errors/app-error.mjs';
import * as eventRepository from '../repositories/event.repository.mjs';
import * as registrationRepository from '../repositories/registration.repository.mjs';
import { UniqueConstraintError } from 'sequelize';
import { sequelize } from '../db/sequelize.mjs';
import { messageTypes } from '../messaging/message-types.mjs';
import * as outboxRepository from '../repositories/outbox.repository.mjs';

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

  const key = cacheKeys.registrations(eventId);
  const cached = await getJson(key);

  if (cached !== null) {
    return cached;
  }

  const registrations =
    await registrationRepository.findAllByEventId(eventId);

  await setJson(key, registrations, cacheTtlSeconds);
  return registrations;
}

export async function register(eventId, participant) {
  let result;

  try {
    result = await sequelize.transaction(
      async (transaction) => {
        const event =
          await eventRepository.findByIdForUpdate(
            eventId,
            transaction
          );

        if (!event) {
          throw eventNotFound(eventId);
        }

        const existing =
          await registrationRepository.findByEventAndEmail(
            eventId,
            participant.email,
            transaction
          );

        if (existing) {
          throw new AppError(
            409,
            'CONFLICT',
            `${participant.email} is already registered ` +
              'for this event'
          );
        }

        const count =
          await registrationRepository.countByEventId(
            eventId,
            transaction
          );

        if (count >= event.capacity) {
          throw new AppError(
            409,
            'CONFLICT',
            'Event is full'
          );
        }

        const registration =
          await registrationRepository.create(
            {
              eventId,
              name: participant.name,
              email: participant.email
            },
            transaction
          );

        await outboxRepository.create(
          {
            type:
              messageTypes.registrationConfirmationEmail,
            aggregateId: String(registration.id),
            payload: {
              email: registration.email,
              name: registration.name,
              eventTitle: event.title,
              startsAt: event.startsAt,
              location: event.location
            }
          },
          transaction
        );

        return {
          event,
          registration
        };
      }
    );
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new AppError(
        409,
        'CONFLICT',
        `${participant.email} is already registered ` +
          'for this event'
      );
    }

    throw err;
  }

  const {
    event,
    registration
  } = result;

  await deleteKeys(
    cacheKeys.event(eventId),
    cacheKeys.registrations(eventId),
    cacheKeys.stats
  );


  logger.info(
    `new registration for ${event.title}: ` +
      `${participant.name} <${participant.email}>`
  );

  return registration;
}
