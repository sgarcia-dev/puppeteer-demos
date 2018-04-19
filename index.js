const puppeteer = require("puppeteer"),
	rimraf = require('rimraf'),
	colors = require('colors'),
	config = require("./package.json").config;

rimraf('./screenshots/*', () => {
	console.log('Screenshot deletion complete');
});

(async () => {
	const browser = await puppeteer.launch({
		// headless: false,
		// slowMo: 100,
		args: ['--disable-notifications']
	});

	log `Creating new page and setting viewport`
	const page = await browser.newPage();
	page.setViewport({
		width: 1100, height: 600
	});
	page.on("console", browserLog);
	log `Navigating to Facebook ...`
	await page.goto('https://facebook.com');
	log `Facebook Loaded. Entering Login Characters ...`
	await page.screenshot({ path: 'screenshots/1.png' });
	await page.type('#email', config.user);
	await page.type('#pass', config.pass);
	await page.screenshot({ path: 'screenshots/2.png' });
	log `Logging in ...`
	await page.click('#loginbutton');
	await page.waitForSelector('a[title="Profile"]');
	await page.screenshot({ path: 'screenshots/3.png' });
	log `Facebook Homepage Loaded. Going to Profile ...`
	await page.click('a[title="Profile"]');
	await page.waitForSelector('ol[data-referrer=pagelet_timeline_recent_ocm]');;
	await page.screenshot({ path: 'screenshots/4.png' });
	log `Profile Loaded. Test Complete!`
	await page.waitForSelector('#recent_capsule_container');
	// const newsFeed = await page.evaluate(() => {
	// 	return document.querySelector('');
	// });;
	await browser.close();
})();

function log (msg) {
	console.log('INFO: '.green + msg);
}

function browserLog (msg) {
	console.log('BROWSER: '.cyan + msg.text());
}