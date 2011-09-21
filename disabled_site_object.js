/* disabled site object */

function DisabledSite() { 
    this.dslist = JSON.parse(prefs.disabled_sites) // parse the comma separated words 

    this.remove = function(site) {
        this.dslist = this.dslist.deleteItem(this.prepare(site))
        widget.preferences.disabled_sites = JSON.stringify(this.dslist)   // assign the dslist array to local storage variable
        this.joined_dslist = this.dslist.join(', ')                                 // update dslist array

        if (this.dslist.length == 0) location.href = location.href // refresh the page if dslist is now empty
    }

    this.add = function(site) { // adds "site" to the unfiltered sites list
        var site = this.prepare(site)

        this.dslist.push(site)                                                             // add word to the dslist array
        widget.preferences.disabled_sites = JSON.stringify(this.dslist)        // assign the dslist array to local storage variable
        this.joined_dslist = this.dslist.join(', ')                                 // update dslist array
    }

    this.includes = function(site) {
        var site = this.prepare(site)

        for (i = 0; i < this.dslist.length; i++ ) {                        
            if (site == this.dslist[i]) return true // exit the function if the word being added is found in dslist
        }

        return false
    }

    this.prepare = function(site) {
        return site = site.toLowerCase().replace(/\s/g, '').replace(/(https?:\/\/)?(www\.)?/i, '').replace(/\/.*?$/, '')
    }
}