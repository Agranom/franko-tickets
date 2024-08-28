const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');

const fetchLatestShow = async () => {
  try {
    const { data } = await axios.get('http://tickets.ft.org.ua/web/afisha');
    const $ = cheerio.load(data);

    // Select the last show's relevant tags
    const lastShow = $('tr').last(); // Assuming each show is within a `tr` tag

    // Extract details
    const link = lastShow.find('td.left.for-info h3.left a').attr('href');
    const title = lastShow.find('td.left.for-info h3.left a').text().trim();
    const imgSrc = lastShow.find('td.left a img').attr('src');
    const dateTime = lastShow.find('td.left.for-info h4').text().trim();

    return { link, title, imgSrc, dateTime };
  } catch (error) {
    console.error('Error fetching the webpage:', error);
    return null;
  }
};

const sendTelegramMessage = async (lastShow) => {
  try {
    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      photo: lastShow.imgSrc,
      caption: `*Нова вистава:* "${lastShow.title}" \n*Дата та час:* ${lastShow.dateTime} \n[Посилання](${lastShow.link})`,
      parse_mode: 'Markdown',
    });
    console.log(`Message successfully sent!`);
  } catch (e) {
    console.error(`Couldn't send telegram message`, e.message);
  }
};

const updateShowTitleAndNotify = async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();

    const lastShow = await fetchLatestShow();

    if (lastShow) {

      const showRecord = await client.db().collection('TheatreShow').findOne();

      if (!showRecord || showRecord.title !== lastShow.title) {

        await sendTelegramMessage(lastShow);

        await client.db()
          .collection('TheatreShow')
          .findOneAndUpdate({ _id: showRecord?._id }, { $set: { title: lastShow.title } }, { upsert: true });
        console.log(`Data updated`);
      }
      console.log(`No updates found`);
    }
  } catch (e) {
    console.error(`Couldn't update and notify`, e);
    throw new Error(e);
  } finally {
    await client.close();
  }

};

module.exports = { updateShowTitleAndNotify };