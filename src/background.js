chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method === "getOptions") {
		const options = JSON.parse(localStorage.getItem("options") || "{}");
		options.reminderTreatment = options.reminderTreatment || 'all';
		options.emailBundling = options.emailBundling || 'disabled';

		sendResponse(options);
	} else {
		sendResponse({});
	}
});