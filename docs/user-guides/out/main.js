const $effekt = require('./effekt.js')

var $main = {};

function max(n, m) {
    return ($effekt.infixGt(n, m)) ? $effekt.pure(n) : $effekt.pure(m)
}

function main() {
    return max(12, 17).then((tmp13) => $effekt.println(tmp13))
}

return module.exports = Object.assign($main, { "max": max, "main": main })