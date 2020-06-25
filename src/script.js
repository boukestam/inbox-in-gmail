const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const nameColors = ['1bbc9b','16a086','f1c40f','f39c11','2dcc70','27ae61','d93939','d25400','3598db','297fb8','e84c3d','c1392b','9a59b5','8d44ad','bec3c7','34495e','2d3e50','95a5a4','7e8e8e','ec87bf','d870ad','f69785','9ba37e','b49255','b49255','a94136'];

const REMINDER_EMAIL_CLASS = 'reminder';
const CALENDAR_EMAIL_CLASS = 'calendar-event';
const CALENDAR_ATTACHMENT_CLASS = 'calendar-attachment';
const BUNDLE_PAGE_CLASS = 'bundle-page';
const BUNDLE_WRAPPER_CLASS = 'bundle-wrapper';
const UNREAD_BUNDLE_CLASS = 'contains-unread';
const BUNDLED_EMAIL_CLASS = 'bundled-email';
const BUNDLING_OPTION_CLASS = 'email-bundling-enabled';
const UNBUNDLED_PARENT_LABEL = 'Unbundled';
const UNBUNDLED_EMAIL_CLASS = 'unbundled-email';
const AVATAR_EMAIL_CLASS = 'email-with-avatar';
const AVATAR_CLASS = 'avatar';
const AVATAR_OPTION_CLASS = 'show-avatar-enabled';
const STYLE_NODE_ID_PREFIX = 'hide-email-';

// 
// Element Selectors 
//
// All the selectors for things-created-by-google in one place
// so that when they inevitably break, they can be corrected
// this is also for making it easier for implementing more 
// reliable retrieval methods like:
// gmail.compose.start_compose() via the Gmail.js lib
let select = {
    emailAddressSource1: ()=>document.querySelector('.gb_hb'),
    emailAddressSource2: ()=>document.querySelector('.gb_lb'),
    emailAddressSource3: ()=>document.querySelector('.gb_qb'),
    tabs:                ()=>document.querySelectorAll('.aKz'),
    bundleWrappers:      ()=>document.querySelectorAll('.BltHke[role=main] .bundle-wrapper'),
    inbox:               ()=>document.querySelector('.nZ a[title=Inbox]'),
    importanceMarkers:   ()=>document.querySelector('td.WA.xY'),
    emails:              ()=>document.querySelectorAll('.BltHke[role=main] .zA'),
    currentTab:          ()=>document.querySelector('.aAy[aria-selected="true"]'),
    menu:                ()=>document.body.querySelector('.J-Ke.n4.ah9'),
    composeButton:       ()=>document.querySelector('.T-I.T-I-KE.L3'),
    menuParent:          ()=>document.querySelector('.wT .byl'),
    menuRefer:           ()=>document.querySelector('.wT .byl>.TK'),
    titleNode:           ()=>document.querySelector('a[title="Gmail"]:not([aria-label])'),
    messageBody:         ()=>document.querySelector('div[aria-label="Message Body"]'),
    messageFrom:         ()=>document.querySelector('input[name="from"]'),
    messageSubjectBox:   ()=>document.querySelector('input[name=subjectbox]'),
    emailParticipants:   (email)=>email.querySelectorAll('.yW span[email]'),
    emailTitleNode:      (email)=>email.querySelector('.y6'),
    eventTitle:          (email)=>email.querySelector('.bqe, .bog'),
    emailCalendarEvent:  (email)=>email.querySelector('.aKS .aJ6'),
    emailDate:           (email)=>email.querySelector('.xW.xY span'),
    emailSubjectWrapper: (email)=>email.querySelectorAll('.a4W'),
    emailAction:         (email)=>email.querySelector('.aKS'),
    emailLabels:         (email)=>email.querySelectorAll('.ar .at'),
    emailLabelEls:       (email)=>email.querySelectorAll('.at'),
    emailAllLabels:      (email)=>email.querySelectorAll('.ar.as'),
    emailSnoozed:        (email)=>email.querySelector('.by1.cL'),
    emailStarred:        (email)=>email.querySelector('.T-KT'),
    emailAvatarWrapper:  (email)=>email.querySelector('.oZ-x3'),
    emailMiscPart1:      (email)=>email.querySelectorAll('.y2'),
    emailMiscPart2:      (email)=>email.querySelectorAll('.yP,.zF'), 
    emailMiscPart3:      (email)=>email.querySelectorAll('.Zt'),
    labelTitle:          (label)=>label.querySelector('.at'),
    labelInnerText:      (label)=>label.querySelector('.av'),
};

const DATE_LABELS = {
	TODAY: 'Today',
	YESTERDAY: 'Yesterday',
	THIS_MONTH: 'This month',
	LAST_YEAR: 'Last year'
};

let lastEmailCount = 0;
let lastRefresh = new Date();
let loadedMenu = false;
let labelStats = {};
let hiddenEmailIds = [];
let options = {};

/* remove element */
Element.prototype.remove = function () {
	this.parentElement.removeChild(this);
};

const getMyEmailAddress = () => { 
    let emailAddressSource1 = select.emailAddressSource1(); let emailAddressSource1Text = emailAddressSource1 && emailAddressSource1.innerText
    let emailAddressSource2 = select.emailAddressSource2(); let emailAddressSource2Text = emailAddressSource2 && emailAddressSource2.innerText
    let emailAddressSource3 = select.emailAddressSource3(); let emailAddressSource3Text = emailAddressSource3 && emailAddressSource3.innerText
    return emailAddressSource1Text || emailAddressSource2Text || emailAddressSource3Text || ""
}

const isReminder = function (email, myEmailAddress) {
	// if user doesn't want reminders treated special, then just return as though current email is not a reminder
	if (options.reminderTreatment === 'none') return false;

	const nameNodes = select.emailParticipants(email);
	let allNamesMe = true;

	if (nameNodes.length === 0) allNamesMe = false;

	for (const nameNode of nameNodes) {
		if (nameNode.getAttribute('email') !== myEmailAddress) allNamesMe = false;
	}

	if (options.reminderTreatment === 'all') {
		return allNamesMe;
	} else if (options.reminderTreatment === 'containing-word') {
		const titleNode = select.emailTitleNode(email);
		return allNamesMe && titleNode && titleNode.innerText.match(/reminder/i);
	}

	return false;
};

const isCalendarEvent = function (email) {
	const node = select.emailCalendarEvent(email);
	return node && node.innerText === 'RSVP';
};

const addDateLabel = function (email, label) {
	if (email.previousSibling && email.previousSibling.className === 'time-row') {
		if (email.previousSibling.innerText === label) return;
		email.previousSibling.remove();
	}

	const timeRow = document.createElement('div');
	timeRow.classList.add('time-row');
	const time = document.createElement('div');
	time.className = 'time';
	time.innerText = label;
	timeRow.appendChild(time);

	email.parentElement.insertBefore(timeRow, email);
};

const getRawDate = function (email) {
	const dateElement = select.emailDate(email);
	if (dateElement) return dateElement.getAttribute('title');
};

const getDate = function (rawDate) {
	if (rawDate) return new Date(rawDate);
};

const buildDateLabel = function (date) {
	let now = new Date();
	if (date === undefined) return;

	if (now.getFullYear() == date.getFullYear()) {
		if (now.getMonth() == date.getMonth()) {
			if (now.getDate() == date.getDate()) return DATE_LABELS.TODAY;
			if (now.getDate() - 1 == date.getDate()) return DATE_LABELS.YESTERDAY;
			return DATE_LABELS.THIS_MONTH;
		}
		return months[date.getMonth()];
	}
	if (now.getFullYear() - 1 == date.getFullYear()) return DATE_LABELS.LAST_YEAR;

	return date.getFullYear().toString();
};

const cleanupDateLabels = function () {
	document.querySelectorAll('.time-row').forEach(row => {
		// Delete any back to back date labels
		if (row.nextSibling && row.nextSibling.className === 'time-row') row.remove();
		// Check nextSibling recursively until reaching the next .time-row
		// If all siblings are .bundled-email, then hide row
		else if (isEmptyDateLabel(row)) row.hidden = true;
	});
};

const isEmptyDateLabel = function (row) {
	const sibling = row.nextSibling;
	if (!sibling) return true;
	else if (sibling.className === 'time-row') return true;
	else if (![...sibling.classList].includes('bundled-email')) return false;
	return isEmptyDateLabel(sibling);
}

const getBundledLabels = function () {
	return Array.from(select.bundleWrappers()).reduce((bundledLabels, el) => {
		bundledLabels[el.attributes.bundleLabel.value] = true;
		return bundledLabels;
	}, {});
};

const addEventAttachment = function (email) {
	if (email.querySelector('.' + CALENDAR_ATTACHMENT_CLASS)) return;

	let title = 'Calendar Event';
	let time = '';
	const titleNode = select.eventTitle(email);
	if (titleNode) {
		const titleFullText = titleNode.innerText;
		let matches = Array.from(titleFullText.matchAll(/[^:]*: ([^@]*)@(.*)/g))[0];
		if (matches) {
			title = matches[1].trim();
			time = matches[2].trim();
		}
	}

	// build calendar attachment, this is based on regular attachments we no longer
	// have access to inbox to see the full structure
	const span = document.createElement('span');
	span.appendChild(document.createTextNode('Attachment'));
	span.classList.add('bzB');

	const attachmentNameSpan = document.createElement('span');
	attachmentNameSpan.classList.add('event-title');
	attachmentNameSpan.appendChild(document.createTextNode(title));

	const attachmentTimeSpan = document.createElement('span');
	attachmentTimeSpan.classList.add('event-time');
	attachmentTimeSpan.appendChild(document.createTextNode(time));

	const attachmentContentWrapper = document.createElement('span');
	attachmentContentWrapper.classList.add('brg');
	attachmentContentWrapper.appendChild(attachmentNameSpan);
	attachmentContentWrapper.appendChild(attachmentTimeSpan);

	// Find Invitation Action
	const action = select.emailAction(email);
	if (action) attachmentContentWrapper.appendChild(action);

	const imageSpan = document.createElement('span');
	imageSpan.classList.add('calendar-image');

	const attachmentCard = document.createElement('div');
	attachmentCard.classList.add('brc');
	attachmentCard.setAttribute('role', 'listitem');
	attachmentCard.setAttribute('title', title);
	attachmentCard.appendChild(imageSpan);
	attachmentCard.appendChild(attachmentContentWrapper);

	const attachmentNode = document.createElement('div');
	attachmentNode.classList.add('brd', CALENDAR_ATTACHMENT_CLASS);
	attachmentNode.appendChild(span);
	attachmentNode.appendChild(attachmentCard);

	const emailSubjectWrapper = select.emailSubjectWrapper(email);
	if (emailSubjectWrapper) emailSubjectWrapper[0].appendChild(attachmentNode);
};

const reloadOptions = () => {
	chrome.runtime.sendMessage({ method: 'getOptions' }, function (ops) {
		options = ops;
	});

	// Add option classes to body for css styling, removes avatars when disabled
	if (options.showAvatar === 'enabled' && !document.body.classList.contains(AVATAR_OPTION_CLASS)) {
		document.body.classList.add(AVATAR_OPTION_CLASS);
	} else if (options.showAvatar === 'disabled' && document.body.classList.contains(AVATAR_OPTION_CLASS)) {
		document.body.classList.remove(AVATAR_OPTION_CLASS);
		document.querySelectorAll('.' + AVATAR_EMAIL_CLASS).forEach(avatarEl => avatarEl.classList.remove(AVATAR_EMAIL_CLASS));
		// Remove avatar elements
		document.querySelectorAll('.' + AVATAR_CLASS).forEach(avatarEl => avatarEl.remove());
	}
	
	// Add option classes to body for css styling, and unbundle emails when disabled
	if (options.emailBundling === 'enabled' && !document.body.classList.contains(BUNDLING_OPTION_CLASS)) {
		document.body.classList.add(BUNDLING_OPTION_CLASS);
	} else if (options.emailBundling === 'disabled' && document.body.classList.contains(BUNDLING_OPTION_CLASS)) {
		document.body.classList.remove(BUNDLING_OPTION_CLASS);
		// Unbundle emails
		document.querySelectorAll('.' + BUNDLED_EMAIL_CLASS).forEach(emailEl => emailEl.classList.remove(BUNDLED_EMAIL_CLASS));
		// Remove bundle wrapper rows
		document.querySelectorAll('.' + BUNDLE_WRAPPER_CLASS).forEach(bundleEl => bundleEl.remove());
	}
};

const getLabels = function (email) {
	return Array.from(select.emailLabels(email)).map(el => el.attributes.title.value);
};

const getTabs = () => Array.from(select.tabs()).map(el => el.innerText);

const htmlToElements = function (html) {
	var template = document.createElement('template');
	template.innerHTML = html;
	return template.content.firstElementChild;
};

const addClassToEmail = (emailEl, klass) => emailEl.classList.add(klass);

const addClassToBundle = (label, klass) => {
	const bundle = document.querySelector(`div[bundleLabel="${label}"]`);
	if (bundle && !(bundle.classList.contains(klass))) bundle.classList.add(klass);
};

const removeClassFromBundle = (label, klass) => {
	const bundle = document.querySelector(`div[bundleLabel="${label}"]`);
	if (bundle && (bundle.classList.contains(klass))) bundle.classList.remove(klass);
};

const addCountToBundle = (label, count) => {
	const bundleLabel = document.querySelector(`div[bundleLabel="${label}"] .label-link`);
	if (!bundleLabel) return;
	const replacementHTML = `<span>${label}</span><span class="bundle-count">(${count})</span>`;
	if (bundleLabel.innerHTML !== replacementHTML) bundleLabel.innerHTML = replacementHTML;
};

const addSendersToBundle = (label, senders) => {
	const bundleSenders = document.querySelector(`div[bundleLabel="${label}"] .bundle-senders`);
	if (!bundleSenders) return;
	let uniqueSenders = senders.reverse().filter((sender, index, self) => {
		if (self.findIndex(s => s.name === sender.name && s.isUnread === sender.isUnread) === index) {
			if (!sender.isUnread && self.findIndex(s => s.name === sender.name && s.isUnread) >= 0) return false;
			return true;
		};
	});
	const replacementHTML = `${uniqueSenders.map(sender => `<span class="${sender.isUnread ? 'strong' : ''}">${sender.name}</span>`).join(', ')}`
	if (bundleSenders.innerHTML !== replacementHTML) bundleSenders.innerHTML = replacementHTML;
};

const getBundleImageForLabel = (label) => {
	switch (label) {
		case 'Promotions':
			return chrome.runtime.getURL('images/ic_offers_24px_clr_r3_2x.png');
		case 'Finance':
			return chrome.runtime.getURL('images/ic_finance_24px_clr_r3_2x.png');
		case 'Purchases':
		case 'Orders':
			return chrome.runtime.getURL('images/ic_purchases_24px_clr_r3_2x.png');
		case 'Trips':
		case 'Travel':
			return chrome.runtime.getURL('images/ic_travel_clr_24dp_r1_2x.png');
		case 'Updates':
			return chrome.runtime.getURL('images/ic_updates_24px_clr_r3_2x.png');
		case 'Forums':
			return chrome.runtime.getURL('images/ic_forums_24px_clr_r3_2x.png');
		case 'Social':
			return chrome.runtime.getURL('images/ic_social_24px_clr_r3_2x.png');
		default:
			return chrome.runtime.getURL('images/ic_custom-cluster_24px_g60_r3_2x.png');
	}
};

const getBundleTitleColorForLabel = (email, label) => {
	const labelEls = select.emailLabelEls(email);
	let bundleTitleColor = null;

	labelEls.forEach((labelEl) => {
		if (labelEl.innerText === label) {
			const labelColor = labelEl.style.backgroundColor;
			// Ignore default label color, light gray
			if (labelColor !== 'rgb(221, 221, 221)') bundleTitleColor = labelColor;
		}
	});

	return bundleTitleColor;
};

const buildBundleWrapper = function (email, label, hasImportantMarkers) {
	const importantMarkerClass = hasImportantMarkers ? '' : 'hide-important-markers';
	const bundleImage = getBundleImageForLabel(label);
	const bundleTitleColor = bundleImage.match(/custom-cluster/) && getBundleTitleColorForLabel(email, label);

	const bundleWrapper = htmlToElements(`
			<div class="zA yO" bundleLabel="${label}">
				<span class="oZ-x3 xY aid bundle-image">
					<img src="${bundleImage}" ${bundleTitleColor ? `style="filter: drop-shadow(0 0 0 ${bundleTitleColor}) saturate(300%)"` : ''}/>
				</span>
				<span class="WA xY ${importantMarkerClass}"></span>
				<span class="yX xY label-link .yW" ${bundleTitleColor ? `style="color: ${bundleTitleColor}"` : ''}>${label}</span>
				<span class="xW xY">
					<span title="${getRawDate(email)}"/>
				</span>
				<div class="y2 bundle-senders"></div>
			</div>
	`);

	addClassToEmail(bundleWrapper, BUNDLE_WRAPPER_CLASS);

	bundleWrapper.onclick = () => location.href = `#search/in%3Ainbox+label%3A${fixLabel(label)}`;

	if (email && email.parentNode) email.parentElement.insertBefore(bundleWrapper, email);
};

const fixLabel = label => encodeURIComponent(label.replace(/[\/\\& ]/g, '-'));

const isInInbox = () => select.inbox() !== null;

const isInBundle = () => document.location.hash.match(/#search\/in%3Ainbox\+label%3A/g) !== null;

const checkImportantMarkers = () => select.importanceMarkers();

const checkEmailUnbundledLabel = labels => labels.filter(label => label.indexOf(UNBUNDLED_PARENT_LABEL) >= 0).length > 0;

const getReadStatus = emailEl => emailEl.className.indexOf('zE') < 0;

/**
 * If email has snooze data, return true.
 * Expects that the curDate should be larger than prevDate, if not, then also return true;
 */
const isSnoozed = (email, curDate, prevDate) => {
	const node = select.emailSnoozed(email);
	if (node && node.innerText !== '') return true;

	return prevDate !== null && curDate < prevDate;
};

const isStarred = email => {
	const node = select.emailStarred(email);
	if (node && node.title !== 'Not starred') return true;
};

/**
 * @return boolean true if email contains class
 */
const checkEmailClass = (emailEl, klass) => emailEl.classList.contains(klass);

const addClassToBody = (klass) => {
	if (!document.body.classList.contains(klass)) document.body.classList.add(klass);
};

const removeClassFromBody = (klass) => {
	if (document.body.classList.contains(klass)) document.body.classList.remove(klass);
};

const removeStyleNodeWithEmailId = (id) => {
	if (document.getElementById(STYLE_NODE_ID_PREFIX + id)) {
		hiddenEmailIds.splice(hiddenEmailIds.indexOf(id), 1);
		document.getElementById(STYLE_NODE_ID_PREFIX + id).remove();
	}
}

const createStyleNodeWithEmailId = (id) => {
	hiddenEmailIds.push(id);

	const style = document.createElement('style');
	document.head.appendChild(style);
	style.id = STYLE_NODE_ID_PREFIX + id;
	style.type = 'text/css';
	style.appendChild(document.createTextNode(`.nH.ar4.z [id="${id}"] { display: none; }`));
};

const getEmails = () => {
	const emails = select.emails();
	const myEmailAddress = getMyEmailAddress();
	const isInInboxFlag = isInInbox();
	const isInBundleFlag = isInBundle();
	const processedEmails = [];
	const allLabels = new Set();
	const tabs = getTabs();

	let currentTab = tabs.length && select.currentTab();
	let prevTimeStamp = null;
	labelStats = {};

	isInBundleFlag ? addClassToBody(BUNDLE_PAGE_CLASS) : removeClassFromBody(BUNDLE_PAGE_CLASS);

	// Start from last email on page and head towards first
	for (let i = emails.length - 1; i >= 0; i--) {
		let email = emails[i];
		let info = {};
		info.emailEl = email;
		info.isReminder = isReminder(email, myEmailAddress);
		info.reminderAlreadyProcessed = () => checkEmailClass(email, REMINDER_EMAIL_CLASS);
		info.dateString = getRawDate(email);
		info.date = getDate(info.dateString);
		info.dateLabel = buildDateLabel(info.date);
		info.isSnooze = isSnoozed(email, info.date, prevTimeStamp);
		info.isStarred = isStarred(email);
		// Only update prevTimeStamp if not snoozed, because we might have multiple snoozes back to back
		if (!info.isSnooze && info.date) prevTimeStamp = info.date;
		info.isCalendarEvent = isCalendarEvent(email);
		info.labels = getLabels(email);
		info.labels.forEach(l => allLabels.add(l));

		info.unbundledAlreadyProcessed = () => checkEmailClass(email, UNBUNDLED_EMAIL_CLASS);
		// Check for Unbundled parent label, mark row as unbundled
		info.isUnbundled = checkEmailUnbundledLabel(info.labels);
		if ((isInInboxFlag || isInBundleFlag) && info.isUnbundled && !info.unbundledAlreadyProcessed()) {
			addClassToEmail(email, UNBUNDLED_EMAIL_CLASS);
            select.emailAllLabels(info.emailEl).forEach(labelEl => {
				if (select.labelTitle(labelEl).title.indexOf(UNBUNDLED_PARENT_LABEL) >= 0) {
					// Remove 'Unbundled/' from display in the UI
                    select.labelInnerText(labelEl).innerText = labelEl.innerText.replace(UNBUNDLED_PARENT_LABEL + '/', '');
				} else {
					// Hide labels that aren't nested under UNBUNDLED_PARENT_LABEL
					labelEl.hidden = true;
				}
			});
		}
		
		// Check for labels used for Tabs, and hide them from the row.
		if ( false != currentTab ) {
			select.emailAllLabels(info.emailEl).forEach(labelEl => {
				if ( labelEl.innerText == currentTab.innerText ) {
					// Remove Tabbed labels from the row.
					labelEl.hidden = true;
				}
			});
		}

		info.isUnread = !getReadStatus(email);

		// Collect senders, message count and unread stats for each label
		if (info.labels.length) {
			const participants = Array.from(select.emailParticipants(email));
			const firstParticipant = participants[0].getAttribute('name');
			info.labels.forEach(label => {
				if (!(label in labelStats)) {
					labelStats[label] = {
						title: label,
						count: 1,
						senders: [{
							name: firstParticipant,
							isUnread: info.isUnread
						}]
					};
				} else { 
					labelStats[label].count++;
					labelStats[label].senders.push({
						name: firstParticipant,
						isUnread: info.isUnread
					});
				}
				if (info.isUnread) labelStats[label].containsUnread = true;
			});
		}

		info.subjectEl = select.emailTitleNode(email);
		info.subject = info.subjectEl && info.subjectEl.innerText.trim();

		info.isBundleEmail = () => checkEmailClass(email, BUNDLED_EMAIL_CLASS);
		info.isBundleWrapper = () => checkEmailClass(email, BUNDLE_WRAPPER_CLASS);
		info.avatarAlreadyProcessed = () => checkEmailClass(email, AVATAR_EMAIL_CLASS);
		info.bundleAlreadyProcessed = () => checkEmailClass(email, BUNDLED_EMAIL_CLASS) || checkEmailClass(email, BUNDLE_WRAPPER_CLASS);
		info.calendarAlreadyProcessed = () => checkEmailClass(email, CALENDAR_EMAIL_CLASS);

		processedEmails[i] = info;
	}

	// Update bundle stats
	for (label in labelStats) {
		// Set message count for each bundle row
		addCountToBundle(label, labelStats[label].count);
		// Set list of senders for each bundle row
		addSendersToBundle(label, labelStats[label].senders);
		// Set bold title class for any bundle containing an unread email
		labelStats[label].containsUnread ? addClassToBundle(label, UNREAD_BUNDLE_CLASS) : removeClassFromBundle(label, UNREAD_BUNDLE_CLASS);
	}

	return [processedEmails, allLabels];
};

const updateReminders = () => {
	reloadOptions();
	const [emails, allLabels] = getEmails();
	const myEmail = getMyEmailAddress();
	let lastLabel = null;
	let isInInboxFlag = isInInbox();
	let hasImportantMarkers = checkImportantMarkers();
	let tabs = getTabs();

	cleanupDateLabels();
	const emailBundles = getBundledLabels();

	for (const emailInfo of emails) {
		const emailEl = emailInfo.emailEl;

		if (emailInfo.isReminder && !emailInfo.reminderAlreadyProcessed()) { // skip if already added class
			if (emailInfo.subject.toLowerCase() === 'reminder') {
				emailInfo.subjectEl.outerHTML = '';
				select.emailMiscPart3(emailEl).forEach(node => node.outerHTML = '');
				select.emailMiscPart1(emailEl).forEach(node => node.style.color = '#202124');
			}
			select.emailMiscPart2(emailEl).forEach(node => { node.innerHTML = 'Reminder';});

			const avatarWrapperEl = select.emailAvatarWrapper(emailEl);
			if (avatarWrapperEl && avatarWrapperEl.getElementsByClassName(AVATAR_CLASS).length === 0) {
				const avatarElement = document.createElement('div');
				avatarElement.className = AVATAR_CLASS;
				avatarWrapperEl.appendChild(avatarElement);
			}
			addClassToEmail(emailEl, REMINDER_EMAIL_CLASS);
		} else if (options.showAvatar === 'enabled' && !emailInfo.reminderAlreadyProcessed() && !emailInfo.avatarAlreadyProcessed() && !emailInfo.bundleAlreadyProcessed()) {
			let participants = Array.from(select.emailParticipants(emailEl));	// convert to array to filter
			if (!participants.length) continue; // Prevents Drafts in Search or Drafts folder from causing errors
			let firstParticipant = participants[0];

			const excludingMe = participants.filter(node => node.getAttribute('email') !== myEmail && node.getAttribute('name'));
			// If there are others in the participants, use one of their initials instead
			if (excludingMe.length > 0) firstParticipant = excludingMe[0];

			const name = firstParticipant.getAttribute('name');
			const firstLetter = (name && name.toUpperCase()[0]) || '-';
			const targetElement = select.emailAvatarWrapper(emailEl);

			if (targetElement && targetElement.getElementsByClassName(AVATAR_CLASS).length === 0) {
				const avatarElement = document.createElement('div');
				avatarElement.className = AVATAR_CLASS;
				const firstLetterCode = firstLetter.charCodeAt(0);

				if (firstLetterCode >= 65 && firstLetterCode <= 90) {
					avatarElement.style.background = '#' + nameColors[firstLetterCode - 65];
				} else {
					avatarElement.style.background = '#000000';
					// Some unicode characters are not affected by 'color: white', hence this alternative
					avatarElement.style.color = 'transparent';
					avatarElement.style.textShadow = '0 0 rgba(255, 255, 255, 0.65)';
				}

				avatarElement.innerText = firstLetter;
				targetElement.appendChild(avatarElement);
			}

			addClassToEmail(emailEl, AVATAR_EMAIL_CLASS);
		}

		if (emailInfo.isCalendarEvent && !emailInfo.calendarAlreadyProcessed()) {
			addClassToEmail(emailEl, CALENDAR_EMAIL_CLASS);
			addEventAttachment(emailEl);
		}

		let label = emailInfo.dateLabel;
		// This is a hack for snoozed emails. If the snoozed email is the
		// first email, we just assume it arrived 'Today', any other snoozed email
		// joins whichever label the previous email had.
		if (emailInfo.isSnooze) label = (lastLabel == null) ? DATE_LABELS.TODAY : lastLabel;

		// Add date label if it's a new label
		if (label !== lastLabel) {
			addDateLabel(emailEl, label);
			lastLabel = label;
		}

		if (options.emailBundling === 'enabled') {
			// Remove bundles that no longer have associated emails
			if (emailInfo.isBundleWrapper() && !allLabels.has(emailEl.getAttribute('bundleLabel'))) {
				emailEl.remove();
				continue;
			}

			const labels = emailInfo.labels.filter(x => !tabs.includes(x));
			if (isInInboxFlag && !emailInfo.isStarred && labels.length && !emailInfo.isUnbundled && !emailInfo.bundleAlreadyProcessed()) {
				labels.forEach(label => {
					addClassToEmail(emailEl, BUNDLED_EMAIL_CLASS);
					// Insert style node to avoid bundled emails appearing briefly in inbox during redraw
					if (!hiddenEmailIds.includes(emailEl.id)) createStyleNodeWithEmailId(emailEl.id);

					if (!(label in emailBundles)) {
						buildBundleWrapper(emailEl, label, hasImportantMarkers);
						emailBundles[label] = true;
					}
				});
			} else if (!emailInfo.isUnbundled && !labels.length && hiddenEmailIds.includes(emailEl.id)) {
				removeStyleNodeWithEmailId(emailEl.id);
			}
		}
	}
};

/*
**
**START OF LEFT MENU
**
*/

const menuNodes = {};
const setupMenuNodes = () => {
  const observer = new MutationObserver(() => {
    // menu items
    [
      { label: 'inbox',     selector: '.aHS-bnt' },
      { label: 'snoozed',   selector: '.aHS-bu1' },
      { label: 'done',      selector: '.aHS-aHO' },
      { label: 'drafts',    selector: '.aHS-bnq' },
      { label: 'sent',      selector: '.aHS-bnu' },
      { label: 'spam',      selector: '.aHS-bnv' },
      { label: 'trash',     selector: '.aHS-bnx' },
      { label: 'starred',   selector: '.aHS-bnw' },
      { label: 'important', selector: '.aHS-bns' },
      { label: 'chats',     selector: '.aHS-aHP' },
    ].map(({ label, selector }) => {
      const node = queryParentSelector(document.querySelector(selector), '.aim');
      if (node) menuNodes[label] = node;
    });
  });
  observer.observe(document.body, { subtree: true, childList: true });
};

const reorderMenuItems = () => {
  const observer = new MutationObserver(() => {
    const parent = select.menuParent();
    const refer = select.menuRefer();
    const { inbox, snoozed, done, drafts, sent, spam, trash, starred, important, chats } = menuNodes;

    if (parent && refer && loadedMenu && inbox && snoozed && done && drafts && sent && spam && trash && starred && important && chats) {
      // Gmail will execute its script to add element to the first child, so
      // add one placeholder for it and do the rest in the next child.
      const placeholder = document.createElement('div');
      placeholder.classList.add('TK');
      placeholder.style.cssText = 'padding: 0; border: 0;';

      // Assign link href which only show archived mail
      done.querySelector('a').href = '#archive';

      // Remove id attribute from done element for preventing event override from Gmail
      done.firstChild.removeAttribute('id');

      // Manually add on-click event to done elment
      done.addEventListener('click', () => window.location.assign('#archive'));
			
      // Rewrite text from All Mail to Done
      done.querySelector('a').innerText = 'Done';

      // Add border seperator to bottom of Done
      const innerDone = done.querySelector('div');
      innerDone.parentElement.style.borderBottom = '1px solid rgb(221, 221, 221)';
      innerDone.parentElement.style.paddingBottom = '15px';
      innerDone.style.paddingBottom = '5px';
      innerDone.style.paddingTop = '5px';

      const newNode = document.createElement('div');
      newNode.classList.add('TK');
      newNode.appendChild(inbox);
      newNode.appendChild(snoozed);
      newNode.appendChild(done);
      parent.insertBefore(placeholder, refer);
      parent.insertBefore(newNode, refer);

      setupClickEventForNodes([inbox, snoozed, done, drafts, sent, spam, trash, starred, important, chats]);

      // Close More menu
      select.menu().click();
      observer.disconnect();
    }

    if (!loadedMenu && inbox) {
      // Open More menu
      select.menu().click();
      loadedMenu = true;
    }
  });
  observer.observe(document.body, { subtree: true, childList: true });
};

const activateMenuItem = (target, nodes) => {
  nodes.map(node => node.firstChild.classList.remove('nZ'));
  target.firstChild.classList.add('nZ');
};

const setupClickEventForNodes = (nodes) => {
  nodes.map(node =>
    node.addEventListener('click', () =>
      activateMenuItem(node, nodes)
    )
  );
};

const queryParentSelector = (elm, sel) => {
  if (!elm) return null;
  var parent = elm.parentElement;
  while (!parent.matches(sel)) {
    parent = parent.parentElement;
    if (!parent) return null;
  }
  return parent;
};

/*
**
**END OF LEFT MENU
**
*/

const triggerMouseEvent = function (node, event) {
	const mouseUpEvent = document.createEvent('MouseEvents');
	mouseUpEvent.initEvent(event, true, true);
	node.dispatchEvent(mouseUpEvent);
};

const waitForElement = function (selector, callback, tries = 100) {
	const element = document.querySelector(selector);
	if (element) callback(element);
	else if (tries > 0) setTimeout(() => waitForElement(selector, callback, tries - 1), 100);
};

const handleHashChange = () => {
  let hash = window.location.hash;
  if (isInBundle()) hash = '#inbox';
  else hash = hash.split('/')[0].split('?')[0];
  const headerElement = document.querySelector('header').parentElement.parentElement;
  const titleNode = select.titleNode();

  if (!titleNode || !headerElement) return;

  headerElement.setAttribute('pageTitle', hash.replace('#', ''));
  titleNode.href = hash;
};

window.addEventListener('hashchange', handleHashChange);

document.addEventListener('DOMContentLoaded', function () {
	const addReminder = document.createElement('div');
	addReminder.className = 'add-reminder';
	addReminder.addEventListener('click', function () {
		const myEmail = getMyEmailAddress();

		// TODO: Replace all of the below with gmail.compose.start_compose() via the Gmail.js lib
		const composeButton = select.composeButton();
        composeButton.click();

		// TODO: Delete waitForElement() function, replace with gmail.observe.on('compose') via the Gmail.js lib
		waitForElement('textarea[name=to]', to => {
			const title = select.messageSubjectBox();
			const body = select.messageBody();
			const from = select.messageFrom();

			from.value = myEmail;
			to.value = myEmail;
			title.value = 'Reminder';
			body.focus();
		});
	});
  document.body.appendChild(addReminder);
  
  waitForElement('a[title="Gmail"]:not([aria-label])', handleHashChange);

	const floatingComposeButton = document.createElement('div');
	floatingComposeButton.className = 'floating-compose';
	floatingComposeButton.addEventListener('click', function () {
		// TODO: Replace all of the below with gmail.compose.start_compose() via the Gmail.js lib
		const composeButton = select.composeButton();
        composeButton.click();
	});
	document.body.appendChild(floatingComposeButton);

	setInterval(updateReminders, 250);
});

const setFavicon = () => document.querySelector('link[rel*="shortcut icon"]').href = chrome.runtime.getURL('images/favicon.png');;

const init = () => {
	setFavicon();
	setupMenuNodes();
	reorderMenuItems();
};

if (document.head) init();
else document.addEventListener('DOMContentLoaded', init);
