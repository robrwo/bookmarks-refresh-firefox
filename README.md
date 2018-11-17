# Refresh Your Bookmarks

This is a firefox extension to refresh your bookmarks when pages have
moved or become stale.

This add-on does the following when you visit a bookmarked page:

- If the server returns an HTTP 400-499 error, it will suggest
  removing the bookmark.
  See [Bug 8648](https://bugzilla.mozilla.org/show_bug.cgi?id=8648).

- If the server returns a redirection, it will suggest updating your
  bookmark.

- If the page has a canonical link that is different from your
  bookmark, it will suggest updating the bookmark.
  See [Bug 502418](https://bugzilla.mozilla.org/show_bug.cgi?id=502418).

- If the hostname cannot be found or the host cannot be reached, then
  it will suggest removing the bookmark.

The suggested change is only acted upon when if you click on the
notification.

The bookmark can be installed from
https://addons.mozilla.org/en-US/firefox/addon/refresh-your-bookmarks/
