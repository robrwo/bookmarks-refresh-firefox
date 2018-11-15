
function updateBookmark(info) {

    console.log(info);

    var explanation;

    switch (info.reason) {
    case 'canonical':
        explanation = 'the canonical link for this page is different.';
        action = 'update';
        break;
    case 'https':
        explanation = 'the page has redirected to an HTTPS page.';
        action = 'update';
        break;
    case 'moved':
        explanation = 'the page has moved.';
        action = 'update';
        break;
    case 'inacessible':
        explanation = 'the page is inaccessible.';
        action = 'remove';
        break;
    }

    if (explanation === undefined) {
        console.warn( `unhandled reason ${info.reason}` );
        return;
    }

    var actor = function(info) {

        return (notification_id) => {

            return (id) => {

                if (id == notification_id) {

                    if (info.reason == 'inacessible') {

                        var promise = browser.bookmarks.remove( info.bookmark.id );
                        promise.then( () => {
                            console.log('removed bookmark');
                        });

                    }
                    else if (info.url) {

                        var promise = browser.bookmarks.update( info.bookmark.id, { url: info.url } );
                        promise.then( () => {
                            console.log('updated bookmark');
                        });

                    }
                    else {

                        console.warn( 'no url to update' );

                    }

                    browser.notifications.clear(id);

                }
            }
        };

    }(info);

    var notifying = browser.notifications.create(
        {
            "type": "basic",
            "iconUrl": browser.extension.getURL("icons/link-48.png"),
            "title": `Bookmark for ${info.bookmark.title}`,
            "message": `There is a bookmark linking to the page ${info.bookmark.url}, but ${explanation}\n\nClick to ${action} the bookmark.`
        }
    );
    notifying.then( (notification_id) => {

        browser.notifications.onClicked.addListener(
            actor(notification_id)
        );

    });

}

function responseHandler(res) {

    if (res.tabId < 0) {
        return;
    }

    function getHeader(fn) {
        var index = res.responseHeaders.findIndex(fn);
        if (index >= 0) {
            return res.responseHeaders[index].value.split( /;\s+/ );
        }
        else {
            return null;
        }
    }

    function isContentType(element) {
        return element.name.toLowerCase() == 'content-type';
    }

    function isCanonicalLink(element) {
        return (element.name.toLowerCase() == 'link') &&
            (element.value.match( /;\s+rel=\"canonical\"/ ));
    }

    function isLocation(element) {
        return element.name.toLowerCase() == 'location';
    }

    var bookmarkPromise = browser.bookmarks.search({url: res.url});
    bookmarkPromise.then((bookmarks) => {

        var bookmark = bookmarks[0];
        if (bookmark) {

            var code = res.statusCode;

            if (code == 200) {

                var canonical = getHeader(isCanonicalLink);

                if (canonical) {
                    canonical = canonical[0].substring(1,canonical.length-2);
                    if (canonical != res.url) {

                        updateBookmark({
                            bookmark: bookmark,
                            url: canonical,
                            res: res,
                            reason: 'canonical'
                        });

                    }
                }
                else {

                    var type = getHeader(isContentType)[0];

                    if (type == 'text/html') {

                        function getCanonical(message, sender) {
                            canonical = message.canonical;
                            browser.runtime.onMessage.removeListener(getCanonical);

                            if (canonical != res.url) {

                                updateBookmark({
                                    bookmark: bookmark,
                                    url: canonical,
                                    res: res,
                                    reason: 'canonical'
                                });

                            }

                        }

                        browser.runtime.onMessage.addListener(getCanonical);

                        browser.tabs.executeScript({
                            file: "canonical.js"
                        });

                    }

                }

            }
            else if ((code == 301) || (code == 302) || (code == 308)) {

                var location = getHeader(isLocation);
                var moved    = location[0].split('://');
                var orig     = bookmark.url.split('://');

                var reason = ((moved[1] == orig[1]) && (moved[0] == 'https'))
                    ? 'https'
                    : 'moved';

                updateBookmark({
                    bookmark: bookmark,
                    url: location[0],
                    res: res,
                    reason: reason
                });

            }
            else if ((code >= 400) || (code <= 499)) {

                updateBookmark({
                    bookmark: bookmark,
                    url: null,
                    res: res,
                    reason: 'inacessible'
                });


            }

        }
    });

}

browser.webRequest.onHeadersReceived.addListener(
    responseHandler,
    {
        urls: [
            "<all_urls>"
        ],
        types: [
            "main_frame"
        ]
    },
    [ "responseHeaders" ]
);
