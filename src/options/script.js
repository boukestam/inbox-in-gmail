const REMINDER_TREATMENT_SELECTOR = "input[name=reminder-treatment]";

function save_options() {
	const reminderTreatment = getSelectedRadioValue(REMINDER_TREATMENT_SELECTOR);
	const options = {
		reminderTreatment: reminderTreatment
	};

	localStorage.setItem("options", JSON.stringify(options));
}

function restore_options() {
	chrome.runtime.sendMessage({method: "getOptions"}, function(options) {
		selectRadioWithValue(REMINDER_TREATMENT_SELECTOR, options.reminderTreatment);
	});
}

function selectRadioWithValue(selector, value) {
	document.querySelectorAll(selector).forEach(radioInput => {
		if(radioInput.value === value) radioInput.checked = true;
	});
}

function getSelectedRadioValue(selector) {
	return document.querySelector(selector + ":checked").value;
}

function monitorChange(element) {
	element.addEventListener('click', save_options);
}

document.addEventListener('DOMContentLoaded', restore_options);
document.querySelectorAll(REMINDER_TREATMENT_SELECTOR).forEach(monitorChange);