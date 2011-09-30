function isset(variable) { // isset function; like PHP
    return typeof variable == 'undefined' ? false : true;
}

/* initialize preferences */

pref = widget.preferences // save typing

replacement = isset(pref.replacement) ? pref.replacement : ' ##### ', 
block_level = isset(pref.block_level) ? pref.block_level : 0,
block_pages = isset(pref.block_pages) ? pref.block_pages : 'false',
whitelist = isset(pref.whitelist) ? JSON.parse(pref.whitelist) : [],
blacklist = isset(pref.blacklist) ? JSON.parse(pref.blacklist) : [],
disabled_sites = isset(pref.disabled_sites) ? JSON.parse(pref.disabled_sites) : []

unfiltered = false
sitename = document.location.hostname.toLowerCase()

for (i = 0; i < disabled_sites.length; i++) {
    if (sitename == disabled_sites[i]) {
        unfiltered = true
        break
    }
}

Array.prototype.deleteItem = function(item_value) { 
    arr = this.map(lowercase);                                         // convert all array values and "item_value" to lowercase
    item_value = item_value.toLowerCase();
    item_index = arr.indexOf(item_value);                       // get index of given value

    if (item_index >= 0 && item_index < this.length) {      // make sure the index is valid
        arr.splice(item_index, 1);
    }

    return arr
}

opera.extension.onmessage = function(evt) {
    evt.source.postMessage(['unfiltered', unfiltered])
}

// function I wrote that lets you insert an item at the given offset in an array - offsets are zero-based like other array functions
// negative offsets will insert from the end of the array i.e. -1 will append the item, -2 will insert it as the second-to-last item, etc. 
// i = item to be inserted; o = offset at which the item should be inserted

Array.prototype.insert = function (i, o) {
    r = this
    
    if (typeof o != 'number') throw new TypeError()   
    
    o = (o == -1 ? r.length : (o < -1 ? o + 1 : o)) // fix the negative offset issue
    return r.slice(0, o).concat(i).concat(r.slice(o, r.length))
}

returnAllTextNodes = function(node) {
    var skippedTags = /(whitelist|style|meta|script)/im, i, list = []

    for (i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType == 3 && node.childNodes[i].nodeValue.replace(/\s/gm, '') != '') {
            list.push(node.childNodes[i]);
        } else if (node.childNodes[i].nodeType == 1 && !node.childNodes[i].nodeName.match(skippedTags)) {
            list = list.concat(returnAllTextNodes(node.childNodes[i]));
        }
    }
    
    return list;
}

textNodes = returnAllTextNodes(document.getElementsByTagName('html')[0]);

removeWord = function(words, reloadTextNodes) {
    /* iterate through all text nodes on the page and surround whitelisted words with a <whitelist>tag</whitelist> */
    
    if (typeof reloadTextNodes != 'undefined' && reloadTextNodes == true) {
        textNodes = returnAllTextNodes(document.getElementsByTagName('html')[0]);
    }
    
    if (whitelist.length > 0 && textNodes.length > 0) {
        var whitelist_regex = new RegExp('(' + whitelist.join('|') + ')', 'igm')
        
        var finalIndex = textNodes.length
        
        for (i = 0; i < finalIndex; i++) {
            if (typeof textNodes[i] != 'object') {
//                console.log(i + ' ' + textNodes[i]); 
                break;                
            }
            
            matches = textNodes[i].nodeValue.match(whitelist_regex)
            
            if (matches) {
                for (j = 0; j < whitelist.length; j++) {
                    
                    thisWordOffset = textNodes[i].nodeValue.search(new RegExp(whitelist[j], 'igm'))
                    
                    if (thisWordOffset != -1) {
                        // capture the word that is going to be replaced
                        capturedWord = textNodes[i].nodeValue.match(new RegExp(whitelist[j], 'im'))[0]
                        
                        // erase the whitelisted word because the new text node will have the same word                        
                        textNodes[i].nodeValue = textNodes[i].nodeValue.replace(new RegExp(whitelist[j], 'im'), '')
                        
                        // split the text node so the whitelisted word can be inserted
                        splitNode = textNodes[i].splitText(thisWordOffset)
                        //  create a new node so that the whitelisted word is wrapped in tags
                        whitelistNode = document.createElement('whitelist')
                        whitelistNode.appendChild(document.createTextNode(capturedWord))
                        
                        textNodes[i].parentNode.insertBefore(whitelistNode, splitNode) // insert whitelisted word node into the node tree

                        // insert the node created by splitText() into the textNodes list
                        textNodes = textNodes.insert(whitelistNode.previousSibling, i + 1) 
                        finalIndex++ // increment the final index to compensate for the newly added node
                        
                        break
                    }
                } // end for loop
            }
        }
    } // end removeWords() function
    
    for ( i = 0; i < textNodes.length; i++ ) {
        textNodes[i].nodeValue = textNodes[i].nodeValue.replace(window.dirtyList, replacement)
    }
}

block = function() {
    window.stop() // stop page load
    
    var body = document.getElementsByTagName('body')[0],
    head = document.getElementsByTagName('head')[0],
    root = document.getElementsByTagName('html')[0];
    body.parentNode.removeChild(body) // erase the contents of the page
    
    if (typeof head != 'undefined') { // make sure that the <head> element was found before removing it
        head.parentNode.removeChild(head)
        root.appendChild(document.createElement('head'))
    }
       
    document.title = 'Page Blocked' 
    
    root.appendChild(document.createElement('body')) // append an empty body node to <html>
    
    message = document.createElement('p');
    message.appendChild(document.createTextNode('The page was blocked because too many censored words were found.'))
    
    message.style.textAlign = 'center';
    message.style.font = 'bold 18px "Lucida Grande", arial, sans-serif';
    message.style.textShadow = '0 1px 0 #fff';
    message.style.paddingTop = '15px'
    
    document.body.style.backgroundColor = '#ddd';
    
    document.body.appendChild(message);
}
    
/* determine (if prefs.block_pages is "on") if there are too many bad words on the page */

pageShouldBeBlocked = function() {
    matches = 0;
    
    if (block_level > 0) {
        for ( i = 0; i < textNodes.length; i++ ) {
            thisNode = textNodes[i];

            matches += thisNode.nodeValue.match(dirtyList) ? thisNode.nodeValue.match(dirtyList).length : 0;

            if (matches >= block_level) break;                
        }
        
        return matches < block_level ? false : true;
    } else return true;
}

d = '[ .!,-/\';":&?]+?' // delimiter for the regex

regexs = ["(^|" + d + ")((a(sse?|rse(s|d)|rse))(b(ag|anger|ite)|cock|clown|cracker|face|goblin|h(at|ead)|jacker|lick(er|ing)?|m(onkey|uncher)|nigger|pirate|h(it|ole)|sucker|w(ad|ipe))?(s)?)($|" + d +")",
                "(^|" + d + ")b(ampot|astard|itch(es|ed)?|low ?job|ollo(ck|x)|oner|oob|utt(-| )?hole)s?($|" + d +")",
                "(^|" + d + ")c(hoa?de|lit(f(ace|uck(ing|ed)?))|um ?(bubble|dumpster|guzzler|jockey|slut|tart)?|ooter|ock[- ]{0,1}(ass|bite|burger|f(ace|ucker)head|jockey|knoker|m(aster|ongler|ongruel|onkey|uncher)|n(ose|ugget)|s(hit|mith|moke(r)?|niffer|ucker)|waffle)|arpetmuncher|rap(py|ped|pi?er)?)s?($|" + d +")",
                "(^|" + d + ")d(ang($|" + d +")|arn|amn(ed|ation)?|ammit)",
                "(^|" + d + ")d(ildo|ookie|um(b?ass|bfuck|b?shit)|ick ?(b(eaters?|ag)|f(ace|uck(er)?)|head|hole|juice|milk|monger|s(lap|uck(er|ing)?)?|w([oa]{1}d|easel|eed)))($|" + d +")",
                "(^|" + d + ")c(unt|unt(-| )?(ass|face|hole|licker|rag|slut))($|" + d +")",
                "([a-z0-9]*?fuck[a-z0-9]*)",
                "(^|" + d + ")(auto)?f(art|eltch|ellatio)($|" + d +")",
                "(^|" + d + ")(c|k|g)oot?ch(ie|y)?($|" + d +")",
                "(^|" + d + ")g(osh|od ?d?am(n|m)( ?it)?)($|" + d +")",
                "(^|" + d + ")h(and ?job|heck)($|" + d +")",
                "(^|" + d + ")j(ack( |-)?ass|izz)($|" + d +")",
                "(^|" + d + ")m([ui]{1}ng(e|ing))($|" + d +")",
                "(^|" + d + ")n(igg(er|a))($|" + d +")",
                "(^|" + d + ")omg($|" + d +")",
                "(^|" + d + ")p(iss(ed( off)?)?|flaps?|anooch|oon(ani|any|tag)|unta|ussylicking)($|" + d +")",
                "(^|" + d + ")queef($|" + d +")",  
                "(^|" + d + ")r(enob|im( |-)?job)($|" + d +")",
                "(^|" + d + ")s(crote|chlong|hiz(nit)?|kank|lut ?(bag)?|meg|plooge)($|" + d +")",
                "((bull) ?)?shit($|" + d +")",
                "(^|" + d + ")t(wat(lips|s|waffle)?|it(s|((ty) ?)?fuck)?)($|" + d +")",  
                "(^|" + d + ")w(ank( ?(job))?|tf)($|" + d +")" ]

window.dirtyList = new RegExp('(' + regexs.join('|') + ')', 'igm')

updateWordList = function() {
    if (blacklist.length > 0) {
        window.dirtyList = new RegExp('(' + window.dirtyList.toString().replace(/^\//im, '').replace(/\/[\w]*?$/im, '') + '|' + blacklist.join('|') + ')', 'igm') // append the blacklist onto the original censored words regex
    }
}()

// filter the page after it is modified by AJAX (e.g. Twitter)

window.XMLHttpRequest.prototype._send = window.XMLHttpRequest.prototype.send;

window.XMLHttpRequest.prototype.send = function(data) {
    try {
        this._onreadystatechange = this.onreadystatechange
    } catch(e) {
        //console.log('failed')
    }
    
    if (typeof this._onreadystatechange == 'function') {
        this.onreadystatechange = function(e) {
            if (this.readyState == 4 && this.status == 200 ) { //&& ( (typeof this.reponseText != 'undefined' && this.reponseText.length > 3) || (typeof this.reponseXML != 'undefined' && this.reponseXML.length > 3) )) {
                if (block_pages == 'true') {
                    page_should_be_blocked = pageShouldBeBlocked();

                    if ( page_should_be_blocked ) block()
                }
                
                setTimeout(removeWord(window.dirtyList, true), 2500) // allow a couple secs for the page to load
            }

            this._onreadystatechange(e);
        }
    }

    this._send(data);
}

window.addEventListener('DOMContentLoaded', function() {
    if (document.location.protocol.match(/^widget/)) return // add notice on the options page 
    if (unfiltered) return // don't run PageScrubber on unfiltered pages

    if (block_pages == 'true') {
        page_should_be_blocked = pageShouldBeBlocked(window.dirtyList);
        
        if ( page_should_be_blocked ) block()
        return // exit the function since the page will not need to be blacklisted 
    }    
    
    removeWord(window.dirtyList, true);  // filter the page
}, false);