import { Router } from 'express';
import {
  createRegistration,
  listRegistrations
} from '../controllers/registration.controller.mjs';
import { validate } from '../middleware/validate.mjs';
import {
  idSchema,
  registrationSchema
} from '../validation/schemas.mjs';

export const registrationRouter = Router();

registrationRouter.get(
  '/:id/registrations',
  validate(idSchema, 'params'),
  listRegistrations
);

registrationRouter.post(
  '/:id/registrations',
  validate(idSchema, 'params'),
  validate(registrationSchema, 'body'),
  createRegistration
);