import { messageTypes } from './message-types.mjs';

function publicEventData(event) {
  return {
    eventId: event.id,
    eventTitle: event.title
  };
}

export function buildEventCreatedNotification(event) {
  return {
    type: messageTypes.eventCreatedNotification,
    aggregateId: String(event.id),
    payload: publicEventData(event)
  };
}

export function buildRegistrationCreatedNotification(event) {
  return {
    type: messageTypes.registrationCreatedNotification,
    aggregateId: String(event.id),
    payload: publicEventData(event)
  };
}