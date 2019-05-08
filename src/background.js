chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method === 'getOptions') {
		const options = JSON.parse(localStorage.getItem('options') || '{}');
		options.reminderTreatment = options.reminderTreatment || 'containing-word';
		options.emailBundling = options.emailBundling || 'enabled';
		options.showAvatar = options.showAvatar || 'enabled';

		sendResponse(options);
	} else sendResponse({});
});