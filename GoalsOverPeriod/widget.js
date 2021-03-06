let index, goal, fieldData, currency, userLocale, prevCount, timeout;

function setGoal() {
    if (fieldData['eventType'] === 'tip' || fieldData['eventType'] === 'monetary') {
        if (goal % 1) {
            $("#goal").html(goal.toLocaleString(userLocale, {style: 'currency', currency: currency}));
        } else {
            $("#goal").html(goal.toLocaleString(userLocale, {
                minimumFractionDigits: 0,
                style: 'currency',
                currency: currency
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
    updateBar(getCount(obj.detail.session.data, false));
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
    updateBar(getCount(obj.detail.event, true));
});

window.addEventListener('onEventReceived', function (obj) {
    updateBar(getCount(obj.detail.event, true));
});


function updateBar(count) {
    if (count === prevCount) return;

    prevCount = count;

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

    let percentage = Math.min(100, (count / goal * 100).toPrecision(3));
    let direction = 'width';

    if (bar.hasClass('btt') || bar.hasClass('ttb')) {
        direction = 'height';
    }

    bar.css(direction, percentage + "%");

    if (fieldData['eventType'] === 'tip' || fieldData['eventType'] === 'monetary') {
        if (count % 1) {
            count = count.toLocaleString(userLocale, {style: 'currency', currency: currency})
        } else {
            count = count.toLocaleString(userLocale, {minimumFractionDigits: 0, style: 'currency', currency: currency})
        }
    }

    $("#count").html(count);

    if (fieldData.fadeoutAfter) {
        timeout = setTimeout(() => {
            $("body").fadeTo("slow", 0);
        }, fieldData.fadeoutAfter * 1000)
    }
}

function getCount(data, update) {
    let count = 0;
    let cheer = 0;
    let subscriber = 0;
    let tip = 0;

    if (!update) {
        if (fieldData['eventType'] === 'monetary') {
            if (typeof data['cheer-' + fieldData['eventPeriod']]['amount'] !== 'undefined') {
                cheer = data['cheer-' + fieldData['eventPeriod']]['amount'];
            }

            if (typeof data['subscriber-' + fieldData['eventPeriod']]['count'] !== 'undefined') {
                subscriber = data['subscriber-' + fieldData['eventPeriod']]['count'];
            }

            if (typeof data['tip-' + fieldData['eventPeriod']]['amount'] !== 'undefined') {
                tip = data['tip-' + fieldData['eventPeriod']]['amount'];
            }

            count = convert(cheer, subscriber, tip);
        } else if (typeof data[index] !== 'undefined') {
            if (fieldData['eventPeriod'] === 'goal' || fieldData['eventType'] === 'cheer' || fieldData['eventType'] === 'tip' || fieldData['eventType'] === 'subscriber-points') {
                count = data[index]['amount'];
            } else {
                count = data[index]['count'];
            }
        }
    } else if (typeof data !== 'undefined' && typeof data.event !== 'undefined') {
        let amount = data.event.amount;

        if (data.listener === 'subscriber-goal') {
            subscriber = amount;
        }

        if (data.listener === 'tip-goal') {
            tip = amount;
        }

        if (data.listener === 'cheer-goal') {
            cheer = amount;
        }

        count = convert(cheer, subscriber, tip) + prevCount;
    } else {
        count = prevCount;
    }

    return count;
}

function convert(cheer, subscriber, tip) {
    return (cheer * 0.01) + (subscriber * 1.60) + tip;
}