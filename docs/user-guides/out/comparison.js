const $effekt = require('./effekt.js')

var $comparison = {};

function max(n, m) {
    return ($effekt.infixGt(n, m)) ? $effekt.pure(n) : $effekt.pure(m)
}

function main() {
    return max(12, 17).then((tmp31) => $effekt.println(tmp31))
}

return module.exports = Object.assign($comparison, {
    "max": max,
    "main": main
})