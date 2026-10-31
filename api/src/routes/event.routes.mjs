import { Router } from 'express';
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  updateEvent
} from '../controllers/event.controller.mjs';
import { validate } from '../middleware/validate.mjs';
import {
  createEventSchema,
  idSchema,
  updateEventSchema
} from '../validation/schemas.mjs';

export const eventRouter = Router();

eventRouter.get('/', listEvents);

eventRouter.get(
  '/:id',
  validate(idSchema, 'params'),
  getEvent
);

eventRouter.post(
  '/',
  validate(createEventSchema, 'body'),
  createEvent
);

eventRouter.patch(
  '/:id',
  validate(idSchema, 'params'),
  validate(updateEventSchema, 'body'),
  updateEvent
);

eventRouter.delete(
  '/:id',
  validate(idSchema, 'params'),
  deleteEvent
);