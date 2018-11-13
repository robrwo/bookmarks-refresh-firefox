var canonical = document.querySelectorAll("link[rel=canonical]");
if (canonical.length) {

    browser.runtime.sendMessage( { "canonical": canonical[0].href } );

}
else {

    browser.runtime.sendMessage( { "canonical": null } );

}
