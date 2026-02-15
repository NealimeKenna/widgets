let index, index2, goal, fieldData, currency, userLocale, timeout;

function setGoal() {  
    if (fieldData['eventType'] === 'tip' || fieldData['eventType'] === 'monetary') {
        if (goal % 1) {
            $("#goal").html(goal.toLocaleString(userLocale, {style: 'currency', currency: getCurrency()}));
        } else {
            $("#goal").html(goal.toLocaleString(userLocale, {
                minimumFractionDigits: 0,
                style: 'currency',
                currency: getCurrency()
            }));
        }
    } else {
        $("#goal").html(goal);
    }
}

window.addEventListener('onWidgetLoad', async function (obj) {
    fieldData = obj.detail.fieldData;
    goal = fieldData["goal"];
    userLocale = fieldData["userLocale"];
    currency = obj["detail"]["currency"]["code"];
    index = fieldData['eventType'] + "-" + fieldData['eventPeriod'];
    index2 = fieldData['eventType2'] + "-" + fieldData['eventPeriod'];

    if (fieldData['eventType'] === "subscriber-points") {
        index = fieldData['eventType'];
    }

    if (fieldData['botCounter']) {
        goal = await getCounterValue(obj.detail.channel.apiToken);
    }

    if (fieldData.progressMask && fieldData.progressMask.length > 0) {
        const mask = `${fieldData.progressMask}`;

        $('.meter').css({
            '-webkit-mask-image': 'url(' + mask + ')',
            'mask-image': 'url(' + mask + ')'
        });
    }

    setGoal();

    if (fieldData['progressDirection'] !== 'vs') {
        updateBar(getCount(obj.detail.session.data, true, index));
    } else {
        updateBar(getCount(obj.detail.session.data, true, index), getCount(obj.detail.session.data, true, index2));
    }
});

let getCounterValue = apiKey => {
    return new Promise(resolve => {
        fetch("https://api.streamelements.com/kappa/v2/channels/me", {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "authorization": `apikey ${apiKey}`
            }, "method": "GET"
        }).then(response => response.json()).then(obj => {
            fetch(`https://api.streamelements.com/kappa/v2/bot/${obj._id}/counters/goal`).then(response => response.json()).then(data => {
                resolve(data.value)
            })
        });
    })
};

window.addEventListener('onSessionUpdate', function (obj) {
    if (fieldData['progressDirection'] !== 'vs') {
        updateBar(getCount(obj.detail.session, true, index));
    } else {
        updateBar(getCount(obj.detail.session, true, index), getCount(obj.detail.session, true, index2));
    }
});


function updateBar(count, count2) {
    if (count >= goal && fieldData['goalSteps']) {
        const steps = fieldData['goalSteps'].split(',');

        $.each(steps, function (index, value) {
            const data = value.split(':');

            goal = parseInt(data[0]);

            if (data[1]) {
                $('.title').html(data[1]);
            }

            if (count <= goal) {
                // Break out of the loop
                return false;
            }
        })

        setGoal();
    }

    if (count >= goal && fieldData['autoIncrement'] > 0) {
        while (count >= goal) {
            goal += fieldData['autoIncrement'];
        }

        $('.title').html(fieldData['titleTextIncremental']);

        setGoal();
    }

    clearTimeout(timeout);

    $("body").fadeTo("slow", 1);

    const bar = $('#bar');
    let direction = 'width';
    let percentage;

    if (fieldData['progressDirection'] !== 'vs') {
        percentage = Math.min(100, (count / goal * 100).toPrecision(3));

        if (bar.hasClass('btt') || bar.hasClass('ttb')) {
            direction = 'height';
        }
    } else {
        const total = count + count2;
        let perc = (count / total) * 100;

        if (count === 0 && count2 === 0) {
            perc = 50;
        }

        percentage = 100;
        bar.css("background-image", "linear-gradient(90deg, " + fieldData['barColor1'] + " " + perc + "%, " + fieldData['barColor2'] + " " + perc + "%)");
    }

    bar.css(direction, percentage + "%");

    if (fieldData['eventType'] === 'tip' || fieldData['eventType'] === 'monetary') {
        if (count % 1) {
            count = count.toLocaleString(userLocale, {style: 'currency', currency: getCurrency()})
        } else {
            count = count.toLocaleString(userLocale, {minimumFractionDigits: 0, style: 'currency', currency: getCurrency()})
        }
    }

    if (fieldData['progressDirection'] === 'vs') {
        $("#goal").html(count2);
        $("#count").html(count);
    } else {
        $("#count").html(count);
    }

    if (fieldData.fadeoutAfter) {
        timeout = setTimeout(() => {
            $("body").fadeTo("slow", 0);
        }, fieldData.fadeoutAfter * 1000)
    }
}

function getCount(data, update, current_index) {
    let count = 0;
    let cheer = 0;
    let subscriber = 0;
    let tip = 0;

    if (fieldData['eventType'] === 'monetary') {
        if (typeof data['cheer-' + fieldData['eventPeriod']]['amount'] !== 'undefined') {
            cheer = data['cheer-' + fieldData['eventPeriod']]['amount'];
        }

        let parameter = 'count';

        if (fieldData['eventPeriod'] === 'goal') {
            parameter = 'amount';
        }

        if (typeof data['subscriber-' + fieldData['eventPeriod']][parameter] !== 'undefined') {
            subscriber = data['subscriber-' + fieldData['eventPeriod']][parameter];
        }

        if (typeof data['tip-' + fieldData['eventPeriod']]['amount'] !== 'undefined') {
            tip = data['tip-' + fieldData['eventPeriod']]['amount'];
        }

        count = convert(cheer, subscriber, tip);
    } else if (!update) {
        if (typeof data[current_index] !== 'undefined') {
            if (fieldData['eventPeriod'] === 'goal' || fieldData['eventType'] === 'cheer' || fieldData['eventType'] === 'tip' || fieldData['eventType'] === 'subscriber-points') {
                count = data[current_index]['amount'];
            } else {
                count = data[current_index]['count'];
            }
        }
    } else if (typeof data !== 'undefined' && typeof data[current_index] !== 'undefined') {
        count = data[current_index].amount;

        if (typeof count === 'undefined') {
            count = data[current_index].count;
        }

        if (fieldData['progressDirection'] === 'vs') {
            if (~current_index.indexOf('cheer')) {
                count = count / 100 + (fieldData['VSmanualBits']);
            }

            if (~current_index.indexOf('subscriber')) {
                count = count * 5;
            }
        }
    }

    return count + fieldData['goalOffset'];
}

function convert(cheer, subscriber, tip) {
    return (cheer * 0.01) + (subscriber * fieldData['subAmount']) + tip;
}

function getCurrency() {  
  if (fieldData['currency'] !== 'auto') {
    return fieldData['currency'];
  }
  
  return currency;
}

// Font styling
if ('{{customFont}}' && '{{customFontName}}') {
    $('.main-container').prepend('<style type="text/css"> @import url("{customFont}"); * {  font-family: "{customFontName}", sans-serif; font-weight: {fontWeight}; }  </style>');
} else {
    $('.main-container').prepend('<style type="text/css">	* {	font-family: "{fontName}", sans-serif; font-weight: {fontWeight}; } </style>');
}
