chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method === "getOptions") {
		const options = JSON.parse(localStorage.getItem("options") || "{}");
		options.reminderTreatment = options.reminderTreatment || 'all';

		sendResponse(options);
	} else {
		sendResponse({});
	}
});