toggleButton = function() {
    tab = opera.extension.tabs.getFocused()
    unfilteredDefined = typeof unfiltered == 'undefined' ? false : true
    unfiltered = unfilteredDefined ? unfiltered : false

    if (tab) buttonDisabled = false
    else buttonDisabled = true

    toggle = unfiltered ? 'enable' : 'disable'

    var UiButton = {
        disabled: true,
        title: "PageScrubber",
        icon: "icon18.png"/*,
        popup : {
            height: 75,
            width:280,
            href : "popup.html"        }*/
    }

    button = opera.contexts.toolbar.createItem(UiButton)  
    opera.contexts.toolbar.addItem(button)
}()

opera.extension.onconnect = function(evt) {
    evt.source.postMessage('connect')
}

opera.extension.onmessage = function(evt) {
    if (evt.data[0] == 'unfiltered') {
        unfiltered = evt.data[1]
               
        if (unfiltered) {
            button.icon = 'icon18-disabled.png'
            button.title = 'Click to enable PageScrubber on this site'
        } else {
            button.icon = 'icon18-enabled.png'
            button.title = 'Click to disable PageScrubber on this site'
        }
    }
}