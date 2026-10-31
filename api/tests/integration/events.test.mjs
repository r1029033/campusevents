import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createTestApp, validEvent } from '../helpers/testApp.mjs';

// Integration tests: real Express app + real (in-memory) SQLite database.
// They only talk HTTP, so they don't care how the code behind the URLs is organised.
const inDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

describe('Events API', () => {
  let app;

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('GET /events lists the events by start date, soonest first', async () => {
    await request(app).post('/api/events').send(validEvent({ title: 'Later', startsAt: inDays(20) }));
    await request(app).post('/api/events').send(validEvent({ title: 'Sooner', startsAt: inDays(2) }));

    const res = await request(app).get('/api/events');

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((e) => e.title), ['Sooner', 'Later']);
  });

  it('POST /events creates an event and returns 201 + Location', async () => {
    const res = await request(app).post('/api/events').send(validEvent());

    assert.equal(res.status, 201);
    assert.equal(res.headers.location, `/api/events/${res.body.id}`);
    assert.equal(res.body.title, 'Backend Bootcamp');
  });

  it('POST /events returns 400 with details for invalid input', async () => {
    const res = await request(app).post('/api/events').send(validEvent({ title: 'x', capacity: 0 }));

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('title'));
    assert.ok(fields.includes('capacity'));
  });

  it('POST /events returns 400 for malformed JSON', async () => {
    const res = await request(app).post('/api/events').set('Content-Type', 'application/json').send('{ "title": ');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_JSON');
  });

  it('GET /events/:id returns the event with registered and spotsLeft', async () => {
    const created = await request(app).post('/api/events').send(validEvent({ capacity: 3 }));

    const res = await request(app).get(`/api/events/${created.body.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Backend Bootcamp');
    assert.equal(res.body.registered, 0);
    assert.equal(res.body.spotsLeft, 3);
  });

  it('GET /events/:id returns 404 for an unknown event', async () => {
    const res = await request(app).get('/api/events/999');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('GET /events/:id returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/events/abc');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('PATCH /events/:id updates only the given fields', async () => {
    const created = await request(app).post('/api/events').send(validEvent());

    const res = await request(app).patch(`/api/events/${created.body.id}`).send({ capacity: 50 });

    assert.equal(res.status, 200);
    assert.equal(res.body.capacity, 50);
    assert.equal(res.body.title, 'Backend Bootcamp');
  });

  it('PATCH /events/:id returns 400 when there is nothing to update', async () => {
    const created = await request(app).post('/api/events').send(validEvent());

    const res = await request(app).patch(`/api/events/${created.body.id}`).send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('PATCH /events/:id returns 404 for an unknown event', async () => {
    const res = await request(app).patch('/api/events/999').send({ capacity: 50 });

    assert.equal(res.status, 404);
  });

  it('DELETE /events/:id returns 204, then 404', async () => {
    const created = await request(app).post('/api/events').send(validEvent());

    const first = await request(app).delete(`/api/events/${created.body.id}`);
    const second = await request(app).delete(`/api/events/${created.body.id}`);

    assert.equal(first.status, 204);
    assert.equal(second.status, 404);
  });

  describe('registrations', () => {
    it('registers a participant and updates spotsLeft', async () => {
      const created = await request(app).post('/api/events').send(validEvent({ capacity: 5 }));
      const id = created.body.id;

      const res = await request(app).post(`/api/events/${id}/registrations`).send({ name: 'Ada', email: 'ADA@example.com' });
      const event = await request(app).get(`/api/events/${id}`);

      assert.equal(res.status, 201);
      assert.equal(res.body.email, 'ada@example.com');
      assert.equal(event.body.spotsLeft, 4);
    });

    it('returns 409 when all event places are taken', async () => {
      const created = await request(app)
        .post('/api/events')
        .send(validEvent({ capacity: 1 }));

      const url =
        `/api/events/${created.body.id}/registrations`;

      const first = await request(app)
        .post(url)
        .send({
          name: 'Ada',
          email: 'ada@example.com'
        });

      const second = await request(app)
        .post(url)
        .send({
          name: 'Grace',
          email: 'grace@example.com'
        });

      assert.equal(first.status, 201);
      assert.equal(second.status, 409);
      assert.equal(second.body.error.code, 'CONFLICT');
      assert.equal(second.body.error.message, 'Event is full');
    });

    it('returns 409 when the same email registers twice', async () => {
      const created = await request(app).post('/api/events').send(validEvent());
      const url = `/api/events/${created.body.id}/registrations`;

      await request(app).post(url).send({ name: 'Ada', email: 'ada@example.com' });
      const res = await request(app).post(url).send({ name: 'Ada again', email: 'ada@example.com' });

      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'CONFLICT');
    });

    it('returns 400 with details for an invalid email', async () => {
      const created = await request(app).post('/api/events').send(validEvent());

      const res = await request(app).post(`/api/events/${created.body.id}/registrations`).send({ name: 'Ada', email: 'not-an-email' });

      assert.equal(res.status, 400);
      assert.deepEqual(res.body.error.details.map((d) => d.field), ['email']);
    });

    it('returns 404 when registering for an unknown event', async () => {
      const res = await request(app).post('/api/events/999/registrations').send({ name: 'Ada', email: 'ada@example.com' });

      assert.equal(res.status, 404);
    });

    it('lists the registrations of an event in the order they came in', async () => {
      const created = await request(app).post('/api/events').send(validEvent());
      const url = `/api/events/${created.body.id}/registrations`;
      await request(app).post(url).send({ name: 'Ada', email: 'ada@example.com' });
      await request(app).post(url).send({ name: 'Grace', email: 'grace@example.com' });

      const res = await request(app).get(url);

      assert.equal(res.status, 200);
      assert.deepEqual(res.body.map((r) => r.name), ['Ada', 'Grace']);
    });

    it('returns 404 for the registrations of an unknown event', async () => {
      const res = await request(app).get('/api/events/999/registrations');

      assert.equal(res.status, 404);
    });
  });

  describe('stats', () => {
    it('shows occupancy and status per event', async () => {
      const open = await request(app).post('/api/events').send(validEvent({ title: 'Open', capacity: 4 }));
      const full = await request(app).post('/api/events').send(validEvent({ title: 'Full', capacity: 1 }));
      await request(app).post('/api/events').send(validEvent({ title: 'Past', startsAt: inDays(-3) }));
      await request(app).post(`/api/events/${open.body.id}/registrations`).send({ name: 'Ada', email: 'ada@example.com' });
      await request(app).post(`/api/events/${full.body.id}/registrations`).send({ name: 'Ada', email: 'ada@example.com' });

      const res = await request(app).get('/api/stats');
      const byTitle = Object.fromEntries(res.body.map((row) => [row.title, row]));

      assert.equal(res.status, 200);
      assert.deepEqual(
        { registered: byTitle.Open.registered, occupancy: byTitle.Open.occupancy, status: byTitle.Open.status },
        { registered: 1, occupancy: '25%', status: 'open' }
      );
      assert.equal(byTitle.Full.status, 'full');
      assert.equal(byTitle.Past.status, 'past');
    });
  });

  it('unknown routes return 404 JSON', async () => {
    const res = await request(app).get('/api/does-not-exist');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
