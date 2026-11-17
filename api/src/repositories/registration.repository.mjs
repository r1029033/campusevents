import { Registration } from '../models/index.mjs';

export async function findAllByEventId(eventId) {
  const registrations = await Registration.findAll({
    where: { eventId },
    order: [['createdAt', 'ASC']]
  });

  return registrations.map((registration) =>
    registration.toJSON()
  );
}

export async function findByEventAndEmail(
  eventId,
  email,
  transaction
) {
  const registration = await Registration.findOne({
    where: {
      eventId,
      email
    },
    transaction
  });

  return registration?.toJSON() ?? null;
}

export function countByEventId(eventId, transaction) {
  return Registration.count({
    where: {
      eventId
    },
    transaction
  });
}

export async function create(data, transaction) {
  const registration = await Registration.create(
    data,
    {
      transaction
    }
  );

  return registration.toJSON();
}