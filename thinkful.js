// TODO: Refactor error handling to take screenshot after crashing.
const puppeteer = require("puppeteer"),
	rimraf = require("rimraf"),
	jquery = require('jquery'),
	colors = require("colors"),
	notifier = require("node-notifier"),
	nodemailer = require("nodemailer"),
	config = require("./package.json").thinkfulConfig,
	minutes = 5,
	interval = minutes * 60 * 1000,
	THINKFUL_URL = 'https://lark.thinkful.com/available-students/',
	COURSE_NAME_SELECTOR = 'h2[title="Flexible Web Development Bootcamp: Fundamentals Phase"]',
	DEBUG = true,
	CHROME_MODE = DEBUG ? 'Chrome' : 'Chrome in Headless Mode',
	FOUND_STUDENTS = {},
	CREDENTIALS = {
		thinkful: {
			user: '',
			password: ''
		},
		google: {
			user: '',
			password: ''
		}
	};

safeCheckForStudents();

async function safeCheckForStudents() {
	try {
		await checkForStudents();
	} catch (e) {
		logError(`Whoops, an error ocurred! Trying again ...\n${e}`);
		await safeCheckForStudents();
	}
}

async function checkForStudents() {
	log`RIMRAF: Deleting previous run screenshots ...`
	rimraf("./screenshots/*", () => {
		log`RIMRAF: Screenshot deletion complete.`
	});
	log(`Launching ${CHROME_MODE} via pupeteer ...`);
	const browser = await puppeteer.launch({
		headless: !DEBUG,
		// slowMo: 100,
		args: ["--disable-notifications"]
	});
	log`Creating new page instance ...`;
	const page = await browser.newPage();
	page.setViewport({
		width: 1400,
		height: 900
	});
	page.on("console", browserLog);
	log(`Navigating to ${THINKFUL_URL} ...`);
	await page.goto(THINKFUL_URL);
	log`Thinkful's Dashboard page loaded. Entering Login Credentials ...`;
	await page.screenshot({ path: "screenshots/1.png" });
	await page.type("#LoginInput", CREDENTIALS.thinkful.user);
	await page.type("#LoginPassword", CREDENTIALS.thinkful.password);
	await page.screenshot({ path: "screenshots/2.png" });
	log`Logging in ...`;
	await page.click("button[type=submit]");
	await page.waitForSelector(".tui-modal-close-button");
	await page.click(".tui-modal-close-button");
	await page.waitForSelector(COURSE_NAME_SELECTOR);
	await page.screenshot({ path: "screenshots/3.png" });
	log`Available Students list shown now, checking for available students ...`;
	// TODO: Add jQuery
	await page.addScriptTag({path: require.resolve('jquery')});
	// let studentsAvailableText = await page.evaluate(() => {
	// 	return document.querySelector('h2[title="Flexible Web Development Bootcamp: Fundamentals Phase"]')
	// 		.nextElementSibling.innerText;
	// });
	let studentsAvailableText = await page.evaluate(() => {
		const titleEl = window.jQuery('h2[title="Flexible Web Development Bootcamp: Fundamentals Phase"]'),
			studentsAvailableText = titleEl.next().children().first().text();
		return studentsAvailableText;
	});
	log(`Text Found: ${studentsAvailableText}`);

	if (
		studentsAvailableText.includes("students available") ||
		studentsAvailableText.includes("student available")
	) {
		if (studentsAvailableText !== '0 students available') {
			log(`STUDENTS FOUND: Printing ...`);

			await page.evaluate(() => {
				const COURSE_NAME_SELECTOR = 'h2[title="Flexible Web Development Bootcamp: Fundamentals Phase"]';
				window.jQuery(COURSE_NAME_SELECTOR)
					.closest('.page-content.course-students')
					.find('.button.button__mini.button__gray')
					.click();
				return true;
			});

			await page.waitForSelector('.matchable-grid.queue-object');
			await page.screenshot({ path: "screenshots/4.png" });

			const studentsArr = await page.evaluate(() => {
				const COURSE_NAME_SELECTOR = 'h2[title="Flexible Web Development Bootcamp: Fundamentals Phase"]';
				var studentBlocks = window.jQuery(COURSE_NAME_SELECTOR)
					.closest('.page-content.course-students')
					.find('.matchable-grid.queue-object');
				var studentsArr = studentBlocks.toArray().map(studentBlock => {
					const $block = window.jQuery(studentBlock);
					return {
						name: $block.find('.queue-object-name').text(),
						startDate: $block.find('.details-section-value').first().text(),
						description: $block.find('.details-section-value').last().text(),
						foundDate: new Date().toString(),
					}
				});
				return studentsArr;
			});
			const newStudents = [];
			studentsArr.forEach(student => {
				if (!FOUND_STUDENTS[student.name]) {
					FOUND_STUDENTS[student.name] = student;
					newStudents.push(student);
				}
			});
			logWarn(`Found Students: ${studentsArr.map(student => student.name).join(', ')}`);
			const studentString = newStudents.map(student => {
				return `Name: ${student.name}\nStart Date: ${student.startDate}\nDescription: ${student.description}\n`;
			}).join(' \n');
			if (newStudents.length > 0) {
				logSuccess(`NEW Students: \n \n${studentString}`);
				sendEmail({
					title: "Students found!",
					msg: `Found the following students: \n \n${studentString}`
				});
			}
		} else {
			logError(`NO STUDENTS FOUND: ${studentsAvailableText}`);
		}

		logWarn(`Scheduling new job in ${minutes} minute(s) (Or at ${addMinutes(new Date(), minutes).toString()})`);
		setTimeout(async () => {
			safeCheckForStudents();
		}, interval);
	} else {
		logError(`FATAL ERROR: studentsAvailableText didn't resolve to an expected variable. Please debug code.`);
	}
	await browser.close();
	log(`Closed ${CHROME_MODE}.`);
}

function sendEmail(args) {
	args = args || {};
	args.title = args.title || "Sample title.";
	args.msg = args.msg || "Sample message";
	log`NODEMAILER: Preparing to send mail ...`;
	var transporter = nodemailer.createTransport({
		service: "gmail",
		auth: {
			user: CREDENTIALS.google.user,
			pass: CREDENTIALS.google.password
		}
	});

	var mailOptions = {
		from: "sgarcia.dev@gmail.com",
		to: "sgarcia.dev@gmail.com",
		subject: `AUTOMATED MAIL: ${args.title}`,
		text: args.msg
	};

	transporter.sendMail(mailOptions, function(error, info) {
		if (error) {
			logError(`NODMAILER ERROR: ${error}`);
		} else {
			logSuccess(`NODEMAILER SUCCESS: Mail sent: ${info.response}`);
		}
	});
}

function log(msg) {
	console.log(
		"------------------------------------------------------------------------"
			.green
	);
	console.log(new Date().toString());
	console.log("INFO: ".green + msg);
	console.log(
		"------------------------------------------------------------------------"
			.green
	);
}

function logSuccess(msg) {
	notify(msg, {
		sound: true,
		wait: true
	});
	console.log(
		"========================================================================"
			.blue
	);
	console.log(new Date().toString());
	console.log("SUCCESS: ".blue + msg);
	console.log(
		"========================================================================"
			.blue
	);
}

function logError(msg) {
	notify(msg);
	console.log(
		"========================================================================"
			.red
	);
	console.log(new Date().toString());
	console.log("ERROR: ".red + msg);
	console.log(
		"========================================================================"
			.red
	);
}

function logWarn(msg) {
	console.log(
		"========================================================================"
			.yellow
	);
	console.log(new Date().toString());
	console.log("WARN: ".yellow + msg);
	console.log(
		"========================================================================"
			.yellow
	);
}

function browserLog(msg) {
	console.log("BROWSER: ".cyan + msg.text());
}

function addMinutes(date, minutes) {
	return new Date(date.getTime() + minutes*60000);
}

function notify(msg, args) {
	args = args || {};
	notifier.notify({
		title: "Thinkful Monitor",
		message: msg,
		sound: args.sound || false,
		wait: args.wait || false
	});
}