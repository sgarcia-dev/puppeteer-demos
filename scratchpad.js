// await page.evaluate(() => {
// 	window.jQuery(COURSE_NAME_SELECTOR)
// 		.closest('.page-content.course-students')
// 		.find('.button.button__mini.button__gray')
// 		.click();
// 	return true;
// });

// await page.waitForSelector('.matchable-grid.queue-object');

// const studentsArr = await page.evaluate(() => {
// 	var studentBlocks = window.jQuery(COURSE_NAME_SELECTOR)
// 		.closest('.page-content.course-students')
// 		.find('.matchable-grid.queue-object');
// 	var studentsArr = studentBlocks.toArray().map(studentBlock => {
// 		const $block = window.jQuery(studentBlock);
// 		return {
// 			name: $block.find('.queue-object-name').text(),
// 			startDate: $block.find('.details-section-value').first().text(),
// 			description: $block.find('.details-section-value').last().text()
// 		}
// 	});
// 	return studentsArr;
// });