// Campus Events API
//
// Everything lives in this one file: settings, database, validation, routes and error handling.
// It works, and tests/integration proves it. It is also hard to read, hard to test and
// hard to change safely. Part 1 of the assignment: find out why, then split it into layers.

import express from 'express';
import { logger } from './config/logger.mjs';
import { sequelize } from './db/sequelize.mjs';
import { validate } from './middleware/validate.mjs';
import { Event, Registration } from './models/index.mjs';
import {
  createEventSchema,
  idSchema,
  registrationSchema,
  updateEventSchema
} from './validation/schemas.mjs';

// ---------------------------------------------------------------- app

export const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const start = performance.now();

  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - start)
    });
  });

  next();
});

app.get('/api/health', async (req, res) => {
  await sequelize.authenticate();
  res.status(200).json({ status: 'ok' });
});

app.get('/api/events', async (req, res) => {
  const events = await Event.findAll({
    order: [['startsAt', 'ASC']]
  });

  res.json(events);
});

app.get(
  '/api/events/:id',
  validate(idSchema, 'params'),
  async (req, res) => {
    const { id } = req.validated.params;
    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Event with id ${id} not found`
        }
      });
    }

    const count = await Registration.count({
      where: { eventId: event.id }
    });

    res.status(200).json({
      ...event.toJSON(),
      registered: count,
      spotsLeft: Math.max(event.capacity - count, 0)
    });
  }
);

app.post(
  '/api/events',
  validate(createEventSchema, 'body'),
  async (req, res) => {
    const event = await Event.create(req.validated.body);

    res
      .status(201)
      .location(`/api/events/${event.id}`)
      .json(event);
  }
);

app.patch(
  '/api/events/:id',
  validate(idSchema, 'params'),
  validate(updateEventSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.validated.params;
      const event = await Event.findByPk(id);

      if (!event) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Event with id ${id} not found`
          }
        });
      }

      await event.update(req.validated.body);
      res.status(200).json(event);
    } catch (err) {
      next(err);
    }
  }
);

app.delete(
  '/api/events/:id',
  validate(idSchema, 'params'),
  async (req, res) => {
    const { id } = req.validated.params;
    const deleted = await Event.destroy({
      where: { id }
    });

    if (deleted === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Event with id ${id} not found`
        }
      });
    }

    res.status(204).send();
  }
);

app.get(
  '/api/events/:id/registrations',
  validate(idSchema, 'params'),
  async (req, res) => {
    const { id } = req.validated.params;
    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Event with id ${id} not found`
        }
      });
    }

    const registrations = await Registration.findAll({
      where: { eventId: event.id },
      order: [['createdAt', 'ASC']]
    });

    res.json(registrations);
  }
);

app.post(
  '/api/events/:id/registrations',
  validate(idSchema, 'params'),
  validate(registrationSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.validated.params;
      const participant = req.validated.body;
      const event = await Event.findByPk(id);

      if (!event) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Event with id ${id} not found`
          }
        });
      }

      const existing = await Registration.findOne({
        where: {
          eventId: event.id,
          email: participant.email
        }
      });

      if (existing) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: `${participant.email} is already registered for this event`
          }
        });
      }

      const count = await Registration.count({
        where: { eventId: event.id }
      });

      if (count > event.capacity) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Event is full'
          }
        });
      }

      const registration = await Registration.create({
        eventId: event.id,
        name: participant.name,
        email: participant.email
      });

      logger.info(
        `new registration for ${event.title}: ${participant.name} <${participant.email}>`
      );

      return res.status(201).json(registration);
    } catch (err) {
      next(err);
    }
  }
);

app.get('/api/stats', async (req, res) => {
  const events = await Event.findAll();
  const result = [];

  for (let i = 0; i < events.length; i++) {
    const regs = await Registration.findAll({
      where: { eventId: events[i].id }
    });

    let pct = 0;
    if (events[i].capacity > 0) {
      pct = Math.round((regs.length / events[i].capacity) * 100);
    }

    let status = 'open';
    if (regs.length >= events[i].capacity) {
      status = 'full';
    } else if (new Date(events[i].startsAt) < new Date()) {
      status = 'past';
    }

    result.push({
      id: events[i].id,
      title: events[i].title,
      registered: regs.length,
      capacity: events[i].capacity,
      occupancy: pct + '%',
      status
    });
  }

  res.json(result);
});

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Express recognises an error handler by its FOUR parameters.
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body is not valid JSON'
      }
    });
  }

  logger.error(err.message, { stack: err.stack });
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong'
    }
  });
});
