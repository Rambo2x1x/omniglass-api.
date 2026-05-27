const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to be local to the backend folder
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
