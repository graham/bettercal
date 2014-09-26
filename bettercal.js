var l = function(data) { console.log(data); };

var BetterCal = (function() {
    var logger = function(x) {
        console.log(x);
    };

    var setup = function(client_id, scopes) {
        this.client_id = client_id;
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

    BetterCalProxy.prototype.get_calendar = function(id, cb) {
        if (cb == undefined) {
            cb = logger;
        }
        this.cal_object.calendars.get({'calendarId':id}).execute(function(item) {
            cb(new BCCalendarProxy(item));
        });
    };

    BetterCalProxy.prototype.toString = function() {
        return "[Better Cal Proxy: " + this.cal_object + "]";
    };

    BetterCalProxy.prototype.list = function(cb) {
        consume_result(gapi.client.calendar.calendarList.list, {}, cb);
    };

    var consume_result = function(command, args, final_cb, accum) {
        console.log("consume ping: " + new Date());

        if (accum == undefined) {
            accum = [];
        }

        command(args).execute(function(response) {
            if (response['nextPageToken'] != undefined) {
                args['pageToken'] = response['nextPageToken'];
                accum = accum.concat(response['items']);
                consume_result(command, args, final_cb, accum);
            } else {
                final_cb(response, accum.concat(response['items']));
            }
        });
    };

    var BCCalendarProxy = function(calendar_obj) {
        this.calobj = calendar_obj;
    };

    BCCalendarProxy.prototype.toString = function() {
        return "[Calendar: " + this.calobj.summary + "]";
    };

    BCCalendarProxy.prototype.list = function(c, cb) {
        if (typeof(c['timeMin']) != "string") {
            c['timeMin'] = date(c['timeMin']);
        }

        if (typeof(c['timeMax']) != "string") {
            c['timeMax'] = date(c['timeMax']);
        }

        if (c['calendarId'] == undefined) {
            c['calendarId'] = this.calobj['id'];
        }

        var calid = this.calobj['id'];

        consume_result(gapi.client.calendar.events.list, c, function(response, items) {
            var new_items = [];
            items.reverse();
            for(var i=0; i < items.length; i++) {
                new_items.push(new BCEventProxy(items[i], calid));
            }
            cb(response, new_items);
        });
    };

    var BCEventProxy = function(event_obj, cal_id) {
        this.event = event_obj;
        this.cal_id = cal_id;
    };

    BCEventProxy.prototype.is_on_date = function(s) {
        if (this.event.start.dateTime.slice(0, 10) == s) {
            return true;
        } else {
            return false;
        }
    };

    return {
        'init':init,
        'setup':setup,
        'check_auth':check_auth,
        'authorize':authorize,
        'zero_pad':_zero_pad,
        'date':date,
        'BCEventProxy':BCEventProxy
    };
})();
