
function updateBookmark(info) {

    let res = info.res;

    let explanation;
    let action;

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
        explanation = `the page has moved (${res.statusLine}).`;
        action = 'update';
        break;
    case 'inacessible':
        explanation = `the page is inaccessible (${res.statusLine}).`;
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

function checkBookmark(res, info) {

    let code     = res.statusCode;
    let bookmark = info.bookmark;

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

                    if (canonical && (canonical != res.url)) {

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
    else if ((code >= 301) && (code <= 399)) {

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

function getBookmark(res) {

    let parts = res.url.split('://');

    if (!parts[0].match( /^https?/ )) {
        return null;
    }

    let schemes = [ 'http', 'https' ];
    let info;

    schemes.forEach( (scheme) => {

        let url = scheme + '://' + parts[1];

        if (info === undefined) {

            var promise = browser.bookmarks.search({ url: url });
            promise.then((bookmarks) => {

                if (bookmarks.length) {

                    info = {
                        bookmark: bookmarks[0],
                        same: scheme == parts[0],
                        url: url
                    };

                    checkBookmark(res, info);

                }

            });

        }

    });

}

function responseHandler(res) {

    if (res.tabId < 0) {
        return;
    }

    getBookmark( res );

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
