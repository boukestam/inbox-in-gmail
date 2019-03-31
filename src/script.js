const processedEmails = [];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

let lastEmailCount = 0;
let lastRefresh = new Date();

const getMyEmail = function () {
	const accountInfo = document.querySelector("div[aria-label='Account Information']");
	if (accountInfo) {
		for (const child of accountInfo.getElementsByTagName("*")) {
			if (child.children.length > 0) continue;
			const emailMatch = (child.innerText || "").match(emailRegex);
			if (emailMatch) return emailMatch[0];
		}
	}

	return "";
};

const triggerMouseEvent = function (node, event) {
	const mouseUpEvent = document.createEvent("MouseEvents");
	mouseUpEvent.initEvent(event, true, true);
	node.dispatchEvent(mouseUpEvent);
};

const waitForElement = function (selector, callback, tries) {
	if (typeof tries == "undefined") tries = 100;

	const element = document.querySelector(selector);
	if (element) {
		callback(element);
	} else if (tries > 0) {
		setTimeout(() => waitForElement(selector, callback, tries - 1), 100);
	}
};

const updateReminders = function () {
	const emails = document.querySelectorAll(".zA");
	const myEmail = getMyEmail();
	let lastLabel = null;
	const now = new Date();

	if (emails.length != lastEmailCount || now.getDate() != lastRefresh.getDate()) {
		document.querySelectorAll(".time-row").forEach(row => row.outerHTML = "");
		lastEmailCount = emails.length;
		lastRefresh = now;
	}
	
	for (const email of emails) {
		if (processedEmails.indexOf(email) != -1) continue;

		let isReminder = false;

		const titleNode = email.querySelector(".bqe");
		if (titleNode && titleNode.innerText.toLowerCase().trim() == "reminder") {
			isReminder = true;
		}

		const nameNodes = email.querySelectorAll(".yP,.zF");
		let allNamesMe = true;

		for (const nameNode of nameNodes) {
			if (nameNode.getAttribute("email") != myEmail) {
				allNamesMe = false;
			}
		}

		if (allNamesMe) {
			for (const nameNode of nameNodes) {
				nameNode.setAttribute("name", "Reminder");
				nameNode.setAttribute("email", "reminder");
				nameNode.innerHTML = "Reminder";
			}

			isReminder = true;
		}

		if (isReminder) {
			email.querySelectorAll(".y6,.Zt").forEach(node => node.outerHTML = "");
			email.querySelectorAll(".pH.a9q").forEach(node => {
				node.style.opacity = "1";
				node.style.backgroundImage = "url('https://gstatic.com/bt/C3341AA7A1A076756462EE2E5CD71C11/2x/ic_reminder_blue_24dp_r2_2x.png')";
			});
			email.querySelectorAll(".y2").forEach(node => node.style.color = "#202124");
		}

		const dateString = email.querySelector(".xW.xY span").getAttribute("title");
		const date = new Date(dateString);

		const addLabel = function (label) {
			if (!email.previousSibling || email.previousSibling.className != "time-row") {
				const timeRow = document.createElement("div");
				timeRow.className = "time-row";
				const time = document.createElement("div");
				time.className = "time";
				time.innerText = label;
				timeRow.appendChild(time);

				email.parentElement.insertBefore(timeRow, email);
			}
		};

		let label = "";

		if (now.getFullYear() == date.getFullYear()) {
			label = months[date.getMonth()];

			if (now.getMonth() == date.getMonth()) {
				label = "This month";

				if (now.getDate() == date.getDate()) {
					label = "Today";
				} else if (now.getDate() - 1 == date.getDate()) {
					label = "Yesterday";
				}
			}
		} else if (now.getFullYear() - 1 == date.getFullYear()) {
			label = "Last year";
		} else {
			label = date.getFullYear().toString();
		}

		if (label != lastLabel) {
			addLabel(label);
			lastLabel = label;
		}

		//processedEmails.push(email);
	}

	setTimeout(updateReminders, 100);
};

document.addEventListener("DOMContentLoaded", function(event) {
	const addReminder = document.createElement("div");
	addReminder.className = "add-reminder";
	addReminder.addEventListener("click", function (e) {
		const myEmail = getMyEmail();

		const composeButton = document.querySelector(".T-I.J-J5-Ji.T-I-KE.L3");
		triggerMouseEvent(composeButton, "mousedown");
		triggerMouseEvent(composeButton, "mouseup");

		waitForElement("textarea[name='to']", to => {
			const title = document.querySelector("input[name='subjectbox']");
			const body = document.querySelector("div[aria-label='Message Body']");

			to.value = myEmail;
			title.value = "Reminder";
			body.focus();
		});
	});
	document.body.appendChild(addReminder);

	updateReminders();
});