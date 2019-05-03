# Inbox in Gmail

Web extension which modifies Gmail to bring back the features and uncluttered design you knew and loved from Google's discontinued Inbox

![alt text](https://github.com/boukestam/inbox-in-gmail/blob/master/screenshots/inbox%20v0.4.8.png?raw=true)

Downloadable versions are available at:

[Chrome Web Store: Inbox in Gmail](https://chrome.google.com/webstore/detail/inbox-in-gmail/foceiplcmbcdoggojeegeelhkaebhjoo)

[Firefox Add-ons: Inbox in Gmail](https://addons.mozilla.org/firefox/addon/inbox-in-gmail)


## Features

- Bundle emails by label and category
- Group emails by date (today, yesterday, this month, etc)
- Clean interface to come closer to the simplicity of Inbox
- Display emails sent to yourself with subject "Reminder" as reminders
- Colored avatars based on senders name
- Calendar events displayed in a small card, with inline responses


## Extension Options

Right click the extension's icon at the top right of your browser, and click 'Options' to adjust the behavior of some features:

#### Reminders
This option is used to determine how to treat emails sent to yourself.

- All are treated as reminders. 
- Only emails with a subject containing the word "reminder" are treated as reminders. 
- Leave the emails as they are. (Disable)

#### Email Bundling
This option is used to bundle emails by label in the inbox.

- Toggle Enable/Disable

#### Email Avatars
This option will show a circle with the first letter initial of the sender, to the left of the email in your folder.

- Toggle Enable/Disable


## Recommended Gmail Settings

Using these settings will more closely replicate the visual style of Inbox:

- Settings/Inbox/Categories -> Leave only Primary ticked
- Settings/Inbox/Inbox Type -> Default or Starred First
- Settings/Advanced/Multiple Inbox -> Disabled
- Settings/Advanced/Preview Pane -> Disabled
- Settings/General/Maximum Page Size -> Show 100 conversations per page
- Settings/General/Personal level indicators -> No indicators
- Settings/Inbox/Importance markers -> No markers


## Email Bundling Tips

Disable inbox category tabs:
- Settings Dropdown/Configure Inbox -> Leave only Primary ticked -> Save

Allow default category labels (Promotions, Social, Updates, Forums) to be bundled:
- Settings/Labels/Categories/Show in message List -> Click show for each category

If you'd like a specific label not to be bundled, create a label called 'Unbundled', and nest that label within it.


## Known Issues

- This extension works best in English, because it relies on specific date formats.
- This currently only supports Gmail's default theme. If you enable the Dark theme, you will experience white/invisible text and icons.


## Privacy

- This extension does not make any external network requests.
- This extension does not use any analytics platforms.
- The code is open source, ready for you to audit.

In other words, you are not being tracked, and your data is not leaving the page to be processed or stored anywhere else. This extension just sits as a layer on top of Gmail, modifying the style and behavior of the page.