# cytube-mention-history
This is an add-on for channels on https://cytu.be to allow users to keep track of chat messages mentioning their username.

# Usage
Use something like jQuery's `$.get()` pointing to a host serving this script in Cytube's Javascript editor, or put a link to it in the channel's External JS in Admin Settings.
In the CSS editor, use `@import` and point it to mentionhistory.css. You can also just minify the .js and put it in the JS editor -- you may not have much space for anything else though. The CSS may also be pasted into the CSS editor.

# How it Works
The script will place a "Mentions" button at the top of the site. This opens the Mention History modal/window. It will also have a number on it indicating how many new messages you have.

There will be a few options at the top of this modal along with descriptions for each one.
**Enable Mention History** must be checked, of course, for this to work.
The **Save** button must be clicked for any changes to take effect.

If a chat message contains your username, it will be saved into your Mention History under the **All Messages** tab. Old messages will be deleted if your message count exceeds your Max Messages setting.
To keep some messages from getting deleted, they may be put into the **Saved Messages** tab using the green save button next to each message. Keep in mind that clearing your browser's local storage will also erase everything.

Additional names may be added under the **Additional Names** tab, which allows the add-on to save messages containing any user-specified names or phrases. These are case-insensitive, and must be at least 3 characters long. **Check for additional names** must also be checked for this to work, as it is off by default.

For better performance with very high message limits, message lists are paginated, so you will only see up to 50 at a time. Under each message list is a list of pages which change the set of messages you're looking at. The red number is the current page.

Message history is unique across rooms, so you will have different message lists in different rooms. However, they are NOT unique across different usernames, meaning your message history may be viewed by anyone at your computer. This may be changed in a future update, however localStorage isn't exactly secure anyway.

