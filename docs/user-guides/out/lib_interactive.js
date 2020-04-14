const $effekt = require('./effekt.js');
const $comparison = require('./comparison.js')

var $lib_interactive = {};

function main() {
    return $comparison.max(7, 12).then((tmp37) => $effekt.println(tmp37))
}

return module.exports = Object.assign($lib_interactive, { "main": main })