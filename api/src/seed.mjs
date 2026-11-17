import { seedDemoData } from './db/seed-demo-data.mjs';
import { runMigrations } from './db/migrator.mjs';
import { sequelize } from './db/sequelize.mjs';
import { Event } from './models/index.mjs';

let seeded = false;

try {
  await runMigrations();

  await sequelize.transaction(async (transaction) => {
    const eventCount = await Event.count({
      transaction
    });

    if (eventCount > 0) {
      return;
    }

    await seedDemoData({
      transaction
    });

    seeded = true;
  });

  console.log(
    seeded
      ? 'Demo data added.'
      : 'Seed skipped: events already exist.'
  );
} finally {
  await sequelize.close();
}