let index, index2, goal, fieldData, currency, userLocale, timeout;

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
    console.log(obj);

    if (fieldData['progressDirection'] !== 'vs') {
        updateBar(getCount(obj.detail.session, true, index));
    } else {
        updateBar(getCount(obj.detail.session, true, index), getCount(obj.detail.session, true, index2));
    }
});


function updateBar(count, count2) {
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

        percentage = 100;
        bar.css("background-image", "linear-gradient(90deg, red 50%, yellow 50%)");
    }

    bar.css(direction, percentage + "%");

    if (fieldData['eventType'] === 'tip' || fieldData['eventType'] === 'monetary') {
        if (count % 1) {
            count = count.toLocaleString(userLocale, {style: 'currency', currency: currency})
        } else {
            count = count.toLocaleString(userLocale, {minimumFractionDigits: 0, style: 'currency', currency: currency})
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
        } else if (typeof data[current_index] !== 'undefined') {
            if (fieldData['eventPeriod'] === 'goal' || fieldData['eventType'] === 'cheer' || fieldData['eventType'] === 'tip' || fieldData['eventType'] === 'subscriber-points') {
                count = data[current_index]['amount'];
            } else {
                count = data[current_index]['count'];
            }
        }
    } else if (typeof data !== 'undefined' && typeof data[current_index] !== 'undefined') {
        let amount = data[current_index].amount;

        if (typeof amount === 'undefined') {
            amount = data[current_index].count;
        }

        if (fieldData['eventType'] === 'monetary') {
            if (~current_index.indexOf('subscriber')) {
                subscriber = amount;
            }

            if (~current_index.indexOf('tip')) {
                tip = amount;
            }

            if (~current_index.indexOf('cheer')) {
                cheer = amount;
            }

            count = convert(cheer, subscriber, tip);
        }
    }

    return count;
}

function convert(cheer, subscriber, tip) {
    return (cheer * 0.01) + (subscriber * 1.60) + tip;
}