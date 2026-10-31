import { Event } from '../models/index.mjs';

export async function findAll() {
  const events = await Event.findAll({
    order: [['startsAt', 'ASC']]
  });

  return events.map((event) => event.toJSON());
}

export async function findById(id) {
  const event = await Event.findByPk(id);
  return event?.toJSON() ?? null;
}

export async function create(data) {
  const event = await Event.create(data);
  return event.toJSON();
}

export async function updateById(id, data) {
  const event = await Event.findByPk(id);

  if (!event) {
    return null;
  }

  await event.update(data);
  return event.toJSON();
}

export async function deleteById(id) {
  const deleted = await Event.destroy({
    where: { id }
  });

  return deleted > 0;
}