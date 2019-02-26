const setup = require('./starter-kit/setup');

exports.handler = async (event, context, callback) => {
  const browser = await setup.getBrowser(context);
  exports.run(browser).then(
    (result) => callback(null, result)
  ).catch(
    (err) => callback(err)
  );
};

exports.run = async (browser) => {
  // implement here
  // this is sample
  const page = await browser.newPage();
  await page.goto('https://baidu.com');
  const screenshot = await page.screenshot({
    clip: {
      x: 200,
      y: 60,
      width: 780,
      height: 450
    }
  });
  await page.close();
  return screenshot;
};
