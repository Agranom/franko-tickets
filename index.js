require('dotenv').config();

const { updateShowTitleAndNotify } = require('./src/search-new-shows');

exports.frankoTickets = async (req, res) => {
  if (req.method === 'POST') {
    console.log('Running cron job...');
    await updateShowTitleAndNotify();
  }

  res.send();
};
