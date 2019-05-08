const LOOKUP_PROFILE_URL = 'https://people-pa.clients6.google.com/v2/people/lookup';

const hexString = buffer => {
	const byteArray = new Uint8Array(buffer);
	const hexCodes = [...byteArray].map(value => {
		const hexCode = value.toString(16);
		const paddedHexCode = hexCode.padStart(2, '0');
		return paddedHexCode;
	});
	return hexCodes.join('');
};

const sha1 = async message => {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	const digestValue = await crypto.subtle.digest('SHA-1', data);
	return hexString(digestValue);
};

const appendQueryParams = (url, queryParams) => {
	Object.keys(queryParams).forEach(key => {
		if (Array.isArray(queryParams[key])) queryParams[key].forEach(queryValue => url.searchParams.append(key, queryValue));
		else url.searchParams.append(key, queryParams[key]);
	});
};

let cachedProfiles = [];

// TODO: Should only run this once for each new sender email address, and cache the resulting { senderAddress, photoURL } pair.
// TODO: Not currently hooked up to anything automatic yet anyway. Running in chrome console: fetchProfilePhoto(['boukestam@gmail.com', 'noreply@medium.com', 'pay@amazon.com'])
const fetchProfilePhoto = async (senderAddressList) => {
	if (!Array.isArray(senderAddressList)) senderAddressList = [senderAddressList];

	const pageCookies = document.cookie.split('; ').map(x => ({ name: x.split('=')[0], value: x.split('=')[1] }));
	const SAPISID = pageCookies.find(x => x.name === 'SAPISID').value;
	const timestamp = Math.round(new Date().getTime() / 1000);
	const origin = 'https://mail.google.com';
	const tokenHash = await sha1(`${timestamp} ${SAPISID} ${origin}`);
	const authorizationHeader = `SAPISIDHASH ${timestamp}_${tokenHash}`;

	const X_ClientDetails = `appVersion=${encodeURIComponent(navigator.appVersion)}&platform=${encodeURIComponent(navigator.platform)}&userAgent=${encodeURIComponent(navigator.userAgent)}`;
	// Get user number from /mail/u/{:number}/
	const X_Goog_AuthUser = location.pathname.split('/')[3];

	const fetchParams = {
		method: 'GET',
		headers: {
			'Authorization': authorizationHeader,
			'DNT': '1',
			'Origin': origin,
			'Referer': `https://mail.google.com/mail/u/${X_Goog_AuthUser}/`,
			'User-Agent': navigator.userAgent,
			'X-ClientDetails': X_ClientDetails,
			'X-Goog-AuthUser': X_Goog_AuthUser,
			'X-Goog-Encode-Response-If-Executable': 'base64',
			'X-JavaScript-User-Agent': 'google-api-javascript-client/1.1.0',
			'X-Requested-With': 'XMLHttpRequest',
		},
		mode: 'cors',
		credentials: 'include',
		referrerPolicy: 'no-referrer-when-downgrade',
	};

	// Query parameters to be attached to LOOKUP_PROFILE_URL
	const profileLoookupQueryParams = {
		'context.clientVersion.clientType': 'GMAIL_WEB_DOMAIN',
		'context.clientVersion.clientVersion': 'contact_store_245761685',
		'id': senderAddressList,
		'mergedPersonSourceOptions.includedProfileStates': 'CORE_ID',
		'mergedPersonSourceOptions.personModelParams.personModel': 'CONTACT_CENTRIC',
		'profileLookupOptions.emailLookupOption': 'INCLUDE_EMAIL_LOOKUP_KEY',
		'requestMask.includeContainer': ['CONTACT', 'PROFILE', 'DOMAIN_CONTACT', 'DOMAIN_PROFILE', 'AFFINITY'],
		'requestMask.includeField': 'person.name,person.photo,person.email,person.phone,person.email.certificate,person.metadata',
		'requestMask.imageUrlType': 'FIFE_URL',
		'type': 'EMAIL',
		// Surprisingly, this key is static across accounts/browsers. It's hardcoded and seems like it's been around for years.
		// It's not an important API key, despite the name. The real auth is done in the headers and cookie exchange.
		'key': 'AIzaSyBuUpn1wi2-0JpM3S-tq2csYx0z2_m_pqc',
		// Appears to be static across different accounts/browsers, despite the name of this property.
		'$unique': 'gc606'
	};

	var lookupProfileUrl = new URL(LOOKUP_PROFILE_URL);
	appendQueryParams(lookupProfileUrl, profileLoookupQueryParams);

	const response = await fetch(lookupProfileUrl, fetchParams);
	const responseJSON = await response.json();

	// If no results were found, add all addresses to cachedProfiles with photoURL: null
	if (!responseJSON.matches || !responseJSON.matches.length) {
		senderAddressList.forEach(senderAddress => cachedProfiles.push({ senderAddress, photoURL: null }));
		return;
	}

	const successAddressList = [];

	// Parse result to get an array of { senderAddress, photoURL } pairs
	responseJSON.matches.forEach((match) => {
		cachedProfiles.push({
			senderAddress: match.lookupId,
			photoURL: responseJSON.people[match.personId[0]].photo[0].url
		});
		successAddressList.push(match.lookupId);
	});

	// Add any missing addresses to cachedProfiles with photoURL: null
	const missedAddressList = senderAddressList.filter(senderAddress => !successAddressList.includes(senderAddress));
	missedAddressList.forEach(senderAddress => cachedProfiles.push({ senderAddress, photoURL: null }));

	console.log(cachedProfiles);
	return cachedProfiles;
};

// WIP: Probably no way to make this listener pattern work, unless I do a manual poll.
// This only gets triggered if a different tab/window on the same domain/localstorage makes a change.
window.addEventListener('storage', ({ key, oldValue, newValue }) => {
	console.log('key', key);
	console.log('newValue', newValue);
});
