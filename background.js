
function updateBookmark(info) {
    console.log(info);
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
            else if ((code == 301) || (code == 308)) {

                var moved = getHeader(isLocation);

                updateBookmark({
                    bookmark: bookmark,
                    url: moved[0],
                    res: res,
                    reason: 'moved'
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
