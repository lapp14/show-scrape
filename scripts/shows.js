const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const DIV_SELECTOR = 'div.shows-list div.show-card';

puppeteer.use(StealthPlugin());

const usage = () => {
  console.log('Script error, usage is: \tnode scripts/shows <profile_name>');
  process.exit(1);
};

const error = (err) => {
  console.log(`Error: ${err.code}`);
};

const textTrim = (text) => {
  return text.replace('\n', '').replace('\t', '').replace('   ', ' ').trim();
};

const scrape = async () => {
  if (process.argv.length !== 3) {
    usage();
  }

  const url = `https://reverbnation.com/${process.argv[2]}/shows`;
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
      shows,
    };
    await browser.close();
  } catch (err) {
    response = {
      error: error(err),
    };
    await browser.close();
  } finally {
    await browser.close();
  }

  return response;
};

(async () => scrape())();
