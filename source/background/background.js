import browser from 'webextension-polyfill';

browser.browserAction.onClicked.addListener(async (tab) => {
	// insert most recent JS. will be ignored if already injected
	await browser.tabs.executeScript(tab.id, {
		file: 'content-script/index.js',
	});
	// start the page view
	await browser.tabs.sendMessage(tab.id, 'togglePageView');
});