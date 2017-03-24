const checkInput = require('./common_functions').checkInput;

const toTitleCase = function(str) {
    return str.replace(/\w[^\s\/\\]*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

const addComma = function(num, decimal_points) {
    num = String(num || 0).replace(/,/g, '') * 1;
    return num.toFixed(decimal_points || 2).toString().replace(/(^|[^\w.])(\d{4,})/g, function($0, $1, $2) {
        return $1 + $2.replace(/\d(?=(?:\d\d\d)+(?!\d))/g, '$&,');
    });
};

const toISOFormat = function(date) {
    return date.format('YYYY-MM-DD');
};

const toReadableFormat = function(date) {
    if ($(window).width() < 770 && checkInput('date', 'not-a-date')) {
        return toISOFormat(date);
    }
    return date.format('DD MMM, YYYY');
};

function padLeft(text, len, char) {
    text = String(text || '');
    return text.length >= len ? text : `${Array((len - text.length) + 1).join(char)}${text}`;
}

function compareBigUnsignedInt(a, b) {
    a = numberToString(a);
    b = numberToString(b);
    const max_length = Math.max(a.length, b.length);
    a = padLeft(a, max_length, '0');
    b = padLeft(b, max_length, '0');
    return a > b ? 1 : (a < b ? -1 : 0); // lexicographical comparison
}

function numberToString(n) {
    return (typeof n === 'number' ? String(n) : n);
}

module.exports = {
    toISOFormat     : toISOFormat,
    toReadableFormat: toReadableFormat,
    toTitleCase     : toTitleCase,
    addComma        : addComma,
    padLeft         : padLeft,

    compareBigUnsignedInt: compareBigUnsignedInt,
};
