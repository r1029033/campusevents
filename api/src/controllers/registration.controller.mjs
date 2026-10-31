import * as registrationService from '../services/registration.service.mjs';

export async function listRegistrations(req, res) {
  const registrations =
    await registrationService.listRegistrations(
      req.validated.params.id
    );

  res.json(registrations);
}

export async function createRegistration(req, res) {
  const registration = await registrationService.register(
    req.validated.params.id,
    req.validated.body
  );

  res.status(201).json(registration);
}