import OuiCal2 from './ouical2.js';

const event = {
    // Event title
    title: 'Get on the front page of HN',

    // Event start date
    start: new Date('June 15, 2013 19:00'),

    // Event timezone. Will convert the given time to that zone
    timezone: 'America/Los_Angeles',

    // Event duration (IN MINUTES)
    duration: 120,

    // You can also choose to set an end time
    // If an end time is set, this will take precedence over duration
    // end: new Date('June 15, 2013 23:00'),

    // You can also choose to set 'all day'
    // If this is set, this will override end time, duration and timezone
    // allday:true,

    // Event Address
    address: 'The internet',

    // Event Description
    description:
        'Get on the front page of HN, then prepare for world domination.'
};

console.log('google', OuiCal2.google(event));
console.log('yahoo', OuiCal2.yahoo(event));
console.log('off365', OuiCal2.off365(event));

window.openGoogle = () => {
    const url = OuiCal2.google(event);
    window.open(url, '_blank');
};

window.downloadICS = () => {
    const blob = OuiCal2.ics(event, 'blob');
    const url = window.URL.createObjectURL(blob);

    var a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    a.href = url;
    a.download = 'test.ics';
    a.click();

    window.URL.revokeObjectURL(url);
};
