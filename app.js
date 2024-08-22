require('dotenv').config();
const cron = require('node-cron');
const { updateShowTitleAndNotify } = require('./src/search-new-shows');

cron.schedule('0 * * * *', async () => {
  console.log('Running cron job...');
  await updateShowTitleAndNotify();
});

(async () => await updateShowTitleAndNotify())();