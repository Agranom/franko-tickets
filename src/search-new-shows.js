const axios = require('axios');
const { MongoClient } = require('mongodb');
const { sendEmail } = require('./send-email');

const getLastPageNumber = async () => {
  const { data } = await axios.get('https://sales.ft.org.ua/events');

  return data.pagination.total;
};

const getLatestShow = async () => {
  const lastPageNum = await getLastPageNumber();
  const { data } = await axios.get(`https://sales.ft.org.ua/events?page=${lastPageNum}`);
  // Event object
  // {
  //   "id": 5104,
  //   "name": "Земля",
  //   "month_year": "Жовтень 2024",
  //   "event_date": "Чт, 31 Жовтня 18:00",
  //   "event_duration": {
  //   "minutes": 75,
  //     "genitive_minutes": "ХВИЛИН"
  // },
  //   "image": "https://ft.org.ua/storage/performance/35/7d16c1efa8e9e35215c29a18afc12c4512397025.jpg",
  //   "route": "https://sales.ft.org.ua/events/5104"
  // }
  const lastEvent = data.events.at(-1);
  const { id: showId, route: link, name: title, image: imgSrc, event_date: dateTime } = lastEvent;

  return { showId, link, title, imgSrc, dateTime };
};

const sendTelegramMessage = async (lastShow) => {
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    photo: lastShow.imgSrc,
    caption: `*Нова вистава:* "${lastShow.title}" \n*Дата та час:* ${lastShow.dateTime} \n[Посилання](${lastShow.link})`,
    parse_mode: 'Markdown',
  });
  console.log(`Message successfully sent!`);
};

const updateShowTitleAndNotify = async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();

    const lastShow = await getLatestShow();

    if (lastShow) {

      const showRecord = await client.db().collection('TheatreShow').findOne({ showId: lastShow.showId });

      if (!showRecord) {

        await sendTelegramMessage(lastShow);

        await client.db().collection('TheatreShow').deleteMany({});
        await client.db().collection('TheatreShow').insertOne(lastShow);

        console.log(`Data updated`);
      } else {
        console.log(`No updates found`);
      }
    }
  } catch (e) {
    console.error(`Couldn't update and notify`, e);
    await sendEmail('Franko tickets parsing error', e.message);
  } finally {
    await client.close();
  }

};

module.exports = { updateShowTitleAndNotify };