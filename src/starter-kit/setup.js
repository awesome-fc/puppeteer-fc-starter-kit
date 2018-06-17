const OSS = require('ali-oss').Wrapper;
const fs = require('fs');
const tar = require('tar');
const puppeteer = require('puppeteer');
const config = require('./config');

exports.getBrowser = (() => {
  let browser;
  const libPath =
    `${process.env['FC_FUNC_CODE_PATH']}/lib/usr/lib/x86_64-linux-gnu/`;
  return async (context, options = {
    headless: true,
    executablePath: config.executablePath,
    args: config.launchOptionForFC,
    env: {
      LD_LIBRARY_PATH: `${process.env['LD_LIBRARY_PATH']}:${libPath}`,
    },
    dumpio: !!exports.DEBUG,
  }) => {
    if (typeof browser === 'undefined' || !await isBrowserAvailable(browser)) {
      await setupChrome(context);
      browser = await puppeteer.launch(options);
      debugLog(async (b) => `launch done: ${await browser.version()}`);
    }
    return browser;
  };
})();

const isBrowserAvailable = async (browser) => {
  try {
    await browser.version();
  } catch (e) {
    debugLog(e); // not opened etc.
    return false;
  }
  return true;
};

const setupChrome = async (context) => {
  if (!await existsExecutableChrome()) {
    if (await existsLocalChrome()) {
      debugLog('setup local chrome');
      await setupLocalChrome();
    } else {
      debugLog('setup oss chrome');
      await setupOSSChrome(context);
    }
    debugLog('setup done');
  }
};

const existsLocalChrome = () => {
  return new Promise((resolve, reject) => {
    fs.exists(config.localChromePath, (exists) => {
      resolve(exists);
    });
  });
};

const existsExecutableChrome = () => {
  return new Promise((resolve, reject) => {
    fs.exists(config.executablePath, (exists) => {
      resolve(exists);
    });
  });
};

const setupLocalChrome = () => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(config.localChromePath)
    .on('error', (err) => reject(err))
    .pipe(tar.x({
      C: config.setupChromePath,
    }))
    .on('error', (err) => reject(err))
    .on('end', () => resolve());
  });
};

const setupOSSChrome = (context) => {
  return new Promise((resolve, reject) => {
    const accessKeyId = config.remoteChromeOSSAccessKeyId
      || context.credentials.accessKeyId;
    const accessKeySecret = config.remoteChromeOSSAccessKeySecret
      || context.credentials.accessKeySecret;
    const stsToken = config.remoteChromeOSSAccessKeySecret
      ? '' : context.credentials.securityToken;
    const client = new OSS({
        region: config.remoteChromeOSSRegion,
        accessKeyId: accessKeyId,
        accessKeySecret: accessKeySecret,
        stsToken: stsToken,
        bucket: config.remoteChromeOSSBucket,
    });
    client.getStream(config.remoteChromeOSSKey).then((result) => {
      result.stream.pipe(tar.x({
        C: config.setupChromePath,
      }))
      .on('error', (err) => reject(err))
      .on('end', () => resolve());
    });
  });
};

const debugLog = (log) => {
  if (config.DEBUG) {
    let message = log;
    if (typeof log === 'function') message = log();
    Promise.resolve(message).then(
      (message) => console.log(message)
    );
  }
};
