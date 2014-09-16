var l = function(data) { console.log(data); };

var BetterCal = (function() {
    var logger = function(x) {
        console.log(x);
    };

    var setup = function(client_id, api_key, scopes) {
        this.client_id = client_id;
        this.api_key = api_key;
        this.scopes = scopes;
        console.log("Setup complete.");
    }

    var check_auth = function(callback) {
        gapi.auth.authorize({
            client_id: this.client_id,
            scope: this.scopes,
            immediate: true
        }, function(authResult) {
            callback(authResult);
        });
    };

    var authorize = function(callback) {
        gapi.auth.authorize({
            client_id: this.client_id,
            scope: this.scopes,
            immediate: false}, callback);
    }

    var _zero_pad = function(s, l) {
        var ns = "" + s;
        while (ns.length < l) {
            ns = '0' + ns;
        }
        return ns;
    };

    var date = function(c) {
        var nd = new Date();
        var d = [
            (function() { if (c['year'])  { return c['year']; }  else { return nd.getYear() + 1900; }})(),
            (function() { if (c['month']) { return _zero_pad(c['month'],2); } else { return _zero_pad(nd.getMonth() + 1, 2); }})(),
            (function() { if (c['date'])  { return _zero_pad(c['date'], 2); } else { return _zero_pad(nd.getDate(), 2); }})(),
            (function() { if (c['hour'])  { return _zero_pad(c['hour'], 2); } else { return _zero_pad(nd.getHours(), 2); }})(),
            (function() { if (c['minute'])  { return _zero_pad(c['minute'], 2); } else { return _zero_pad(nd.getHours(), 2); }})(),
            (function() { if (c['second'])  { return _zero_pad(c['second'], 2); } else { return _zero_pad(nd.getHours(), 2); }})()
        ];

        return "" + d[0] + "-" + d[1] + "-" + d[2] + "T" + d[3] + ":" + d[4] + ":" + d[5] + "Z";
    };

    var init = function(callback) {
        gapi.client.load('calendar', 'v3', function() {
            callback(new BetterCalProxy(gapi.client.calendar));
        });
    }

    var BetterCalProxy = function(cal_object) {
        this.cal_object = cal_object;
    };

    BetterCalProxy.prototype.get_primary = function(cb) {
        if (cb == undefined) {
            cb = logger;
        }
        this.cal_object.calendars.get({'calendarId':'primary'}).execute(function(item) {
            cb(new BCCalendarProxy(item));
        });
    };

    var BCCalendarProxy = function(calendar_obj) {
        this.calobj = calendar_obj;
    };

    BCCalendarProxy.prototype.list = function(c, cb, more) {
        if (more == undefined) {
            more = {}
        };

        var this_list = this;
        if (c['calendarId'] == undefined) {
            c['calendarId'] = this.calobj['id'];
        }

        var items = [];

        if (more['prev_list'] != undefined && more['consume']) {
            items = more['prev_list'];
        }

        gapi.client.calendar.events.list(c).execute(function(response) {
            var next_cb = null;

            $.each(response['items'] || [], function(index, item) {
                if (item['recurrence'] != undefined) {
                    console.log(item['summary']);
                } else {
                    items.push(new BCEventProxy(item, this_list.calobj['id']));
                }
            });

            if (response['nextPageToken'] != undefined) {
                c['pageToken'] = response['nextPageToken'];
                next_cb = function(callback2) {
                    this_list.list(c, callback2);
                }
            }

            if (more['consume'] && next_cb != null) {
                more['prev_list'] = items;
                this_list.list(c, cb, more);
            } else {
                var sync_token_fn = null;
                if (response['nextSyncToken'] != undefined) {
                    delete c['iCalUID'];
                    delete c['orderBy'];
                    delete c['privateExtendedProperty'];
                    delete c['q'];
                    delete c['sharedExtendedProperty'];
                    delete c['timeMin'];
                    delete c['timeMax'];
                    delete c['updatedMin'];

                    c['syncToken'] = response['nextSyncToken'];
                    sync_token_fn = function(newcb, newmore) {
                        this_list.list(c, newcb, newmore);
                    };
                }
                cb(items, next_cb, response, sync_token_fn);
            }
        });
    };

    var BCEventProxy = function(event_obj, cal_id) {
        this.event = event_obj;
        this.cal_id = cal_id;
    };

    return {
        'init':init,
        'setup':setup,
        'check_auth':check_auth,
        'authorize':authorize,
        'zero_pad':_zero_pad,
        'date':date
    };
})();
