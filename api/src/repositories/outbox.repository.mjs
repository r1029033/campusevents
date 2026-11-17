
import { OutboxMessage } from '../models/index.mjs';

export async function create(data, transaction) {
  const message = await OutboxMessage.create(
    data,
    {
      transaction
    }
  );

  return message.toJSON();
}