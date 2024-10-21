const axios = require('axios');
const { MongoClient } = require('mongodb');
const { sendEmail } = require('./send-email');

const baseUrl = 'https://sales.ft.org.ua/events';

const months = {
  'Січень': '01', 'Лютий': '02', 'Березень': '03', 'Квітень': '04',
  'Травень': '05', 'Червень': '06', 'Липень': '07', 'Серпень': '08',
  'Вересень': '09', 'Жовтень': '10', 'Листопад': '11', 'Грудень': '12',
};

function convertUkrainianDateToJSDate(ukrainianDate) {
  try {
    // Split the input string
    const [month, year] = ukrainianDate.split(' ');

    // Replace the month with its numeric value
    const monthNumber = months[month];

    // Return a new Date object with year and month
    // We use the first day of the month as a default day
    return new Date(`${year}-${monthNumber}-01`);
  } catch (e) {
    console.error('convertUkrainianDateToJSDate failed', e);
    return null;
  }
}

const getTotal = async () => {
  const { data } = await axios.get(baseUrl);

  return data.pagination.total * data.pagination.per_page;
};

const getAllShows = async () => {
  const total = await getTotal();
  const { data } = await axios.get(`https://sales.ft.org.ua/events?per_page=${total}`);

  return data?.events || [];
};

const getShowFromEvent = (event) => {
  // const { data } = await axios.get(`https://sales.ft.org.ua/events?page=${lastPageNum}`);
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
  const { id: showId, route: link, name: title, image: imgSrc, event_date: dateTime, month_year: monthYear } = event;

  return { showId, link, title, imgSrc, dateTime, monthYear };
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

    const allEvents = await getAllShows();
    const allNotifiedEvents = await client.db().collection('theatreshows').find().toArray();
    const unnotifiedEvents = allEvents
      .filter(({ id }) => !allNotifiedEvents.some(({ showId }) => showId === id));

    if (!unnotifiedEvents.length) {
      console.log(`No updates found`);
      return;
    }


    for (const event of unnotifiedEvents) {
      const show = getShowFromEvent(event);
      if (show) {
        await sendTelegramMessage(show);

        show.exp = convertUkrainianDateToJSDate(show.monthYear);
        await client.db().collection('theatreshows').insertOne(show);
      }
    }

    console.log(`${unnotifiedEvents.length} events were have been added`);
  } catch (e) {
    console.error(`Couldn't update and notify`, e);
    await sendEmail('Franko tickets parsing error', e.message);
  } finally {
    await client.close();
  }

};

module.exports = { updateShowTitleAndNotify };