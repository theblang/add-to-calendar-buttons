const MS_IN_MINUTES = 60 * 1000;

function sanitizeEvent(event) {
    if (!event) {
        event = {};
    }
    if (event.allday) {
        delete event.end; // may be set later
        delete event.duration;
    }
    if (event.end) {
        delete event.duration;
    } else {
        if (!event.duration) {
            event.duration = CONFIG.duration;
        }
    }
    if (event.duration) {
        event.end = getEndDate(event.start, event.duration);
    }

    if (event.timezone) {
        event.tzstart = changeTimezone(event.start, event.timezone);
        event.tzend = changeTimezone(event.end, event.timezone);
    } else {
        event.tzstart = event.start;
        event.tzend = event.end;
    }
    if (!event.title) {
        event.title = 'New Event';
    }

    return event;
}

function changeTimezone(date, timezone) {
    if (date) {
        if (timezone) {
            var invdate = new Date(
                date.toLocaleString('en-US', {
                    timeZone: timezone
                })
            );
            var diff = date.getTime() - invdate.getTime();
            return new Date(date.getTime() + diff);
        }
        return date;
    }
    return;
}

function formatTime(date) {
    return date ? date.toISOString().replace(/-|:|\.\d+/g, '') : '';
}

function getEndDate(start, duration) {
    return new Date(start.getTime() + duration * MS_IN_MINUTES);
}

function stripISOTime(isodatestr) {
    return isodatestr.substr(0, isodatestr.indexOf('T'));
}

function google(event) {
    event = sanitizeEvent(event);

    var startTime, endTime;

    if (event.allday) {
        // google wants 2 consecutive days at 00:00
        startTime = formatTime(event.tzstart);
        endTime = formatTime(getEndDate(event.tzstart, 60 * 24));
        startTime = stripISOTime(startTime);
        endTime = stripISOTime(endTime);
    } else {
        if (event.timezone) {
            // google is somehow weird with timezones.
            // it works better when giving the local
            // time in the given timezone without the zulu,
            // and pass timezone as argument.
            // but then the dates we have loaded
            // need to shift inverse with tzoffset the
            // browser gave us.
            // so
            var shiftstart, shiftend;
            shiftstart = new Date(
                event.start.getTime() -
                    event.start.getTimezoneOffset() * MS_IN_MINUTES
            );
            if (event.end) {
                shiftend = new Date(
                    event.end.getTime() -
                        event.end.getTimezoneOffset() * MS_IN_MINUTES
                );
            }
            startTime = formatTime(shiftstart);
            endTime = formatTime(shiftend);
            // strip the zulu and pass the tz as argument later
            startTime = startTime.substring(0, startTime.length - 1);
            endTime = endTime.substring(0, endTime.length - 1);
        } else {
            // use regular times
            startTime = formatTime(event.start);
            endTime = formatTime(event.end);
        }
    }

    return window.encodeURI(
        [
            'https://www.google.com/calendar/render',
            '?action=TEMPLATE',
            '&text=' + (event.title || ''),
            '&dates=' + (startTime || ''),
            '/' + (endTime || ''),
            event.timezone ? '&ctz=' + event.timezone : '',
            '&details=' + (event.description || ''),
            '&location=' + (event.address || ''),
            '&sprop=&sprop=name:'
        ].join('')
    );
}

function yahoo(event) {
    event = sanitizeEvent(event);

    if (event.allday) {
        var yahooEventDuration = 'allday';
    } else {
        var eventDuration = event.tzend
            ? (event.tzend.getTime() - event.tzstart.getTime()) / MS_IN_MINUTES
            : event.duration;

        // Yahoo dates are crazy, we need to convert the duration from minutes to hh:mm

        var yahooHourDuration =
            eventDuration < 600
                ? '0' + Math.floor(eventDuration / 60)
                : Math.floor(eventDuration / 60) + '';

        var yahooMinuteDuration =
            eventDuration % 60 < 10
                ? '0' + (eventDuration % 60)
                : (eventDuration % 60) + '';

        var yahooEventDuration = yahooHourDuration + yahooMinuteDuration;
    }

    // Remove timezone from event time
    // var st = formatTime(new Date(event.start - (event.start.getTimezoneOffset() * MS_IN_MINUTES))) || '';

    var st = formatTime(event.tzstart) || '';

    return window.encodeURI(
        [
            'https://calendar.yahoo.com/?v=60&view=d&type=20',
            '&title=' + (event.title || ''),
            '&st=' + st,
            '&dur=' + (yahooEventDuration || ''),
            '&desc=' + (event.description || ''),
            '&in_loc=' + (event.address || '')
        ].join('')
    );
}

function off365(event) {
    event = sanitizeEvent(event);

    var startTime = formatTime(event.tzstart);
    var endTime = formatTime(event.tzend);

    return window.encodeURI(
        [
            'https://outlook.office365.com/owa/',
            '?path=/calendar/action/compose',
            '&rru=addevent',
            '&subject=' + (event.title || ''),
            '&startdt=' + (startTime || ''),
            '&enddt=' + (endTime || ''),
            '&body=' + (event.description || ''),
            '&location=' + (event.address || ''),
            '&allday=' + (event.allday ? 'true' : 'false')
        ].join('')
    );
}

// FIXME: Make note about mobile safari and https://stackoverflow.com/a/7768581/1747491
function ics(event, type) {
    event = sanitizeEvent(event);

    var startTime, endTime;

    if (event.allday) {
        // DTSTART and DTEND need to be equal and 0
        startTime = formatTime(event.tzstart);
        endTime = startTime = stripISOTime(startTime) + 'T000000';
    } else {
        startTime = formatTime(event.tzstart);
        endTime = formatTime(event.tzend);
    }

    const fileContents = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'URL:' + document.URL,
        'DTSTART:' + (startTime || ''),
        'DTEND:' + (endTime || ''),
        'SUMMARY:' + (event.title || ''),
        'DESCRIPTION:' + (event.description || ''),
        'LOCATION:' + (event.address || ''),
        'UID:' + (event.id || '') + '-' + document.URL,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\n');

    if (type === 'blob') {
        const blob = new Blob([fileContents], {
            type: 'text/calendar'
        });
        return blob;
    } else {
        const href = window.encodeURI(
            `data:text/calendar;charset=utf8,${fileContents}`
        );
        return href;
    }
}

const OuiCal2 = {
    google: google,
    yahoo: yahoo,
    off365: off365,
    ics: ics
};

export default OuiCal2;
