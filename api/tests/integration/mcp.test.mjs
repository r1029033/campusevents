import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createTestApp, validEvent } from '../helpers/testApp.mjs';

const authorization = 'Bearer test-mcp-api-key';

function mcpRequest(app, body) {
  return request(app)
    .post('/mcp')
    .set('Authorization', authorization)
    .set('Accept', 'application/json, text/event-stream')
    .send(body);
}

function callTool(app, name, args = {}) {
  return mcpRequest(app, {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name, arguments: args }
  });
}

function parseMcpResponse(response) {
  if (response.body?.jsonrpc) {
    return response.body;
  }

  const dataLine = response.text
    .split('\n')
    .find((line) => line.startsWith('data: '));

  assert.ok(dataLine, 'Expected an MCP JSON or SSE response');
  return JSON.parse(dataLine.slice('data: '.length));
}

describe('MCP API', () => {
  let app;

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  it('rejects requests without the API key', async () => {
    const response = await request(app)
      .post('/mcp')
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

    assert.equal(response.status, 401);
    assert.equal(response.headers['www-authenticate'], 'Bearer');
  });

  it('only accepts POST requests', async () => {
    const response = await request(app).get('/mcp');

    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, 'POST');
  });

  it('lists the three campus event tools', async () => {
    const response = await mcpRequest(app, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    });

    assert.equal(response.status, 200);
    const message = parseMcpResponse(response);
    assert.deepEqual(
      message.result.tools.map((tool) => tool.name),
      [
        'list_upcoming_events',
        'list_past_events',
        'register_for_event'
      ]
    );
  });

  it('separates upcoming and past events', async () => {
    await request(app).post('/api/events').send(validEvent({
      title: 'Future Event'
    }));
    await request(app).post('/api/events').send(validEvent({
      title: 'Past Event',
      startsAt: new Date(Date.now() - 86_400_000).toISOString()
    }));

    const upcoming = await callTool(app, 'list_upcoming_events');
    const past = await callTool(app, 'list_past_events');
    const upcomingMessage = parseMcpResponse(upcoming);
    const pastMessage = parseMcpResponse(past);

    assert.deepEqual(
      upcomingMessage.result.structuredContent.events
        .map((event) => event.title),
      ['Future Event']
    );
    assert.deepEqual(
      pastMessage.result.structuredContent.events
        .map((event) => event.title),
      ['Past Event']
    );
  });

  it('registers a person by exact event title', async () => {
    await request(app).post('/api/events').send(validEvent({
      title: 'MCP Workshop'
    }));

    const response = await callTool(app, 'register_for_event', {
      event: 'MCP Workshop',
      name: 'Ada Lovelace',
      email: 'ada@example.com'
    });

    assert.equal(response.status, 200);
    const message = parseMcpResponse(response);
    assert.equal(message.result.isError, undefined);
    assert.equal(
      message.result.structuredContent.event.title,
      'MCP Workshop'
    );

    const registrations = await request(app)
      .get('/api/events/1/registrations');
    assert.equal(registrations.body.length, 1);
    assert.equal(registrations.body[0].email, 'ada@example.com');
  });
});
