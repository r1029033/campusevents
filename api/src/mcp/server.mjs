import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { AppError } from '../errors/app-error.mjs';
import {
  listPastEvents,
  listUpcomingEvents,
  registerForEvent
} from './event-tools.mjs';

function eventSummary(event) {
  return {
    id: event.id,
    title: event.title,
    location: event.location,
    startsAt: new Date(event.startsAt).toISOString(),
    capacity: event.capacity
  };
}

function eventListResult(events, label) {
  const summaries = events.map(eventSummary);
  const text = summaries.length === 0
    ? `There are no ${label} events.`
    : JSON.stringify(summaries, null, 2);

  return {
    content: [{ type: 'text', text }],
    structuredContent: { events: summaries }
  };
}

function toolError(error) {
  const message = error instanceof AppError
    ? error.message
    : 'The request could not be completed.';

  return {
    isError: true,
    content: [{ type: 'text', text: message }]
  };
}

export function createCampusEventsMcpServer() {
  const server = new McpServer({
    name: 'campus-events',
    version: '1.0.0'
  });

  server.registerTool(
    'list_upcoming_events',
    {
      description: 'List events that start now or in the future.'
    },
    async () => {
      const events = await listUpcomingEvents();
      return eventListResult(events, 'upcoming');
    }
  );

  server.registerTool(
    'list_past_events',
    {
      description: 'List events whose start time has already passed.'
    },
    async () => {
      const events = await listPastEvents();
      return eventListResult(events, 'past');
    }
  );

  server.registerTool(
    'register_for_event',
    {
      description:
        'Register one person for an event by event ID or exact title. ' +
        'A confirmation email is sent to the supplied address.',
      inputSchema: z.object({
        event: z.string()
          .trim()
          .min(1)
          .describe('Event ID or exact event title'),
        name: z.string()
          .trim()
          .min(2)
          .max(100)
          .describe('Name of the person to register'),
        email: z.email()
          .toLowerCase()
          .describe('Email that receives the confirmation')
      })
    },
    async ({ event, name, email }) => {
      try {
        const result = await registerForEvent(event, { name, email });

        return {
          content: [{
            type: 'text',
            text:
              `${name} is registered for ${result.event.title}. ` +
              'A confirmation email has been queued.'
          }],
          structuredContent: {
            registrationId: result.registration.id,
            event: eventSummary(result.event)
          }
        };
      } catch (error) {
        return toolError(error);
      }
    }
  );

  return server;
}
