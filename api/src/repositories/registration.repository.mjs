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

export async function findByEventAndEmail(eventId, email) {
  const registration = await Registration.findOne({
    where: {
      eventId,
      email
    }
  });

  return registration?.toJSON() ?? null;
}

export function countByEventId(eventId) {
  return Registration.count({
    where: { eventId }
  });
}

export async function create(data) {
  const registration = await Registration.create(data);
  return registration.toJSON();
}