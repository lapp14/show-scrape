const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const DIV_SELECTOR = 'div.shows-list div.show-card';

puppeteer.use(StealthPlugin());

const error = (err) => {
  let statusCode = 400;
  const errorMessage = err.message;

  if (err.message.includes('Protocol error') >= 0) {
    statusCode = 405;
  }

  return {
    statusCode,
    body: JSON.stringify({ error: errorMessage }),
  };
};

const textTrim = (text) => {
  return text.replace('\n', '').replace('\t', '').replace('   ', ' ').trim();
};

const scrape = async (profileName) => {
  const url = `https://reverbnation.com/${profileName}/shows`;
  const browser = await puppeteer.launch({ headless: true });
  let response;
  try {
    const page = await browser.newPage();
    await page.goto(url);
    const html = await page.content();
    const $ = cheerio.load(html);
    const shows = [];
    $(DIV_SELECTOR).each(function () {
      const timeCity = textTrim($(this).find('span').eq(1).text()).split('in\n');
      shows.push({
        html: $(this).html(),
        day: textTrim($(this).find('.showtime div').first().text()),
        date: textTrim($(this).find('.showtime div').last().text()),
        venue: textTrim($(this).find('span').first().text()),
        time: textTrim(timeCity[0] || ''),
        city: textTrim(timeCity[1] || ''),
        directions: $(this).find('span[ng-if="show.google_maps_url"] a').attr('href'),
      });
    });

    response = {
      statusCode: 200,
      body: JSON.stringify(shows),
    };

    await browser.close();
  } catch (err) {
    response = error(err);
    await browser.close();
  } finally {
    await browser.close();
  }

  return response;
};

exports.handler = async (event) => {
  if (typeof event !== 'object' || !event.hashasOwnProperty('profile')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Bad request' }),
    };
  }
  return scrape(event.profile);
};
