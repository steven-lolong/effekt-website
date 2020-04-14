

var $effekt = {};


const $runtime = (function() {

  // Result -- Trampoline
  function Step(c, k) {
    return { isStep: true, c: c, k: k }
  }
  function trampoline(r) {
    var res = r
    while (res !== null && res !== undefined && res.isStep) {
      res = res.c.apply(res.k)
    }
    return res
  }

  // Lists / Pairs
  function Cons(head, tail) {
    return { head: head, tail: tail }
  }
  const Nil = null

  // TODO maybe we can implement copy-on-write for the fields?

  // Frame = A => Control[B]

  // Metacontinuations / Stacks
  // (frames: List<Frame>, fields: [Cell], prompt: Int, tail: Stack) -> Stack
  function Stack(frames, fields, prompt, tail) {
    return { frames: frames, fields: fields, prompt: prompt, tail: tail }
  }
  function SubStack(frames, backup, prompt, tail) {
    return { frames: frames, backup: backup, prompt: prompt, tail: tail }
  }
  const EmptyStack = null;

  // (stack: Stack<A, B>, a: A) -> Step<B>
  function apply(stack, a) {
    var s = stack;
    while (true) {
      if (s === EmptyStack) return a;
      const fs = s.frames;
      if (fs === Nil) { s = s.tail; continue }
      const result = fs.head(a);
      s.frames = fs.tail;
      return Step(result, s)
    }
  }

  function Cell(init) {
    return {
      _value: init,
      value: function(v) {
        if (arguments.length === 0) {
          return this._value
        } else {
          this._value = v
        }
      }
    }
  }
  function backup(cells) {
    return cells.map(c => ({ cell: c, value: c.value() }))
  }
  function restore(b) {
    return b.map(c => { c.cell.value(c.value); return c.cell })
  }

  // (subcont: Stack, stack: Stack) -> Stack
  function pushSubcont(subcont, stack) {
    var sub = subcont;
    var s = stack;

    while (sub !== EmptyStack) {
      s = Stack(sub.frames, restore(sub.backup), sub.prompt, s)
      sub = sub.tail
    }
    return s;
  }

  function flatMap(stack, f) {
    if (stack === EmptyStack) { return Stack(Cons(f, Nil), [], null, stack) }
    var fs = stack.frames
    // it should be safe to mutate the frames field, since they are copied in the subcont
    stack.frames = Cons(f, fs)
    return stack
  }

  function splitAt(stack, p) {
    var sub = EmptyStack;
    var s = stack;

    while (s !== EmptyStack) {
      const currentPrompt = s.prompt
      sub = SubStack(s.frames, backup(s.fields), currentPrompt, sub)
      s = s.tail
      if (currentPrompt === p) { return Cons(sub, s) }
    }
    throw ("Prompt " + p + " not found")
  }

  function withState(init, f) {
    const cell = Cell(init)
    return Control(k => {
      k.fields.push(cell);
      return Step(f(cell), k)
    })
  }

  // Delimited Control
  function Control(apply) {
    const self = {
      apply: apply,
      run: () => trampoline(Step(self, Stack(Nil, [], toplevel, EmptyStack))),
      then: f => Control(k => Step(self, flatMap(k, f))),
      state: f => self.then(init => withState(init, f))
    }
    return self
  }

  const pure = a => Control(k => apply(k, a))

  const delayed = a => Control(k => apply(k, a()))

  const shift = p => f => Control(k => {
    const split = splitAt(k, p)
    const localCont = a => Control(k =>
      Step(pure(a), pushSubcont(split.head, k)))
    return Step(f(localCont), split.tail)
  })

  const callcc = f => Control(k => {
    return f(a => trampoline(apply(k, a)))
  })

  const reset = p => c => Control(k => Step(c, Stack(Nil, [], p, k)))

  const toplevel = 1;
  var _prompt = 2;

  function _while(c, body) {
    return c().then(b => b ? body().then(() => _while(c, body)) : pure(null))
  }

  function handle(handlers) {
    const p = _prompt++;

    // modify all implementations in the handlers to capture the continuation at prompt p
    const caps = handlers.map(h => {
      var cap = Object.create({})
      for (var op in h) {
        const impl = h[op];
        cap[op] = function() {
          const args = Array.from(arguments);
          return shift(p)(k => impl.apply(null, args.concat([k])))
        }
      }
      return cap;
    });
    return body => reset(p)(body.apply(null, caps))
  }

  return {
    pure: pure,
    callcc: callcc,
    delayed: delayed,
    // no lifting for prompt based implementation
    lift: f => f,
    handle: handle,

    _if: (c, thn, els) => c ? thn() : els(),
    _while: _while,
    constructor: (_, tag) => function() {
      return { __tag: tag, __data: Array.from(arguments) }
    }
  }
})()

Object.assign($effekt, $runtime);


function show$impl(obj) {
  if (!!obj && !!obj.__tag) {
    return obj.__tag + "(" + obj.__data.map(show).join(", ") + ")"
  } else if (obj === $effekt.unit) {
    return "()";
  } else {
    return "" + obj;
  }
}

function equals$impl(obj1, obj2) {
  if (!!obj1 && !!obj2 && !!obj1.__tag && !!obj2.__tag) {
    if (obj1.__tag != obj2.__tag) return false;

    for (var i = 0; i < obj1.__data.length; i++) {
      if (!equals$impl(obj1.__data[i], obj2.__data[i])) return false;
    }
    return true;
  } else {
    return obj1 === obj2;
  }
}

function println$impl(obj) {
  return $effekt.delayed(() => { console.log(show(obj)); return $effekt.unit; });
}

$effekt.unit = {}


// matchers: Any -> List[Any] | null
const $matching = (function() {

    const any = x => [x]

    const ignore = x => []

    const bind = matcher => x => {
        const matched = matcher(x)
        if (matched == null) return null;
        return [x].concat(matched)
    }

    function tagged(tag) {
        const matchers = arguments
        return x => {
            if (!x || !x.__tag || x.__tag !== tag) return null;
            var extracted = [];
            // we start at 1 since matchers are shifted by 1
            for (var i = 1; i < matchers.length; i++) {
                const matched = matchers[i](x.__data[i - 1]);
                if (matched === null) return null;
                Array.prototype.push.apply(extracted, matched)
            }
            return extracted;
        }
    }

    function match(x, alternatives) {
        for (i in alternatives) {
            const alt = alternatives[i]
            const matched = alt.pattern(x)
            if (matched !== null) {
                return alt.exec.apply(null, matched)
            }
        }
    }

    return {
        any: any,
        ignore: ignore,
        tagged: tagged,
        bind: bind,
        match: match
    }
})();

Object.assign($effekt, $matching);


// p0 = bind(tagged("Nil"))
// p1 = bind(tagged("Cons", any, any))
// p2 = tagged("Cons", any, bind(tagged("Cons", any, ignore)))

// l0 = { tag: "Nil", data: [] }
// l1 = { tag: "Cons", data: [1, l0] }
// l2 = { tag: "Cons", data: [1, { tag: "Cons", data: [2, { tag: "Nil", data: [] }] }] }

// console.log(p1(l0))
// console.log(p1(l1))
// console.log(p1(l2))

// console.log(p2(l0))
// console.log(p2(l1))
// console.log(p2(l2))

// match(l2, [
//     { pattern: p0, exec: () => console.log("It is Nil!") },
//     { pattern: p2, exec: (x, y) => console.log("It has at least two elements", x, y) },
//     { pattern: p1, exec: (x, rest) => console.log("It only has one element", x) }
// ])

function println(value) {
    return println$impl(value)
}

function inspect(value) {
    return console.log(value)
}

function error(msg) {
    return (function() { throw msg })()
}

function random() {
    return Math.random() * 100
}

function show(value) {
    return show$impl(value)
}

function infixConcat(s1, s2) {
    return s1 + s2
}

function infixAdd(x, y) {
    return (x + y)
}

function infixMul(x, y) {
    return (x * y)
}

function infixDiv(x, y) {
    return Math.floor(x / y)
}

function infixSub(x, y) {
    return (x - y)
}

function mod(x, y) {
    return (x % y)
}

function addDouble(x, y) {
    return (x + y)
}

function mulDouble(x, y) {
    return (x * y)
}

function subDouble(x, y) {
    return (x - y)
}

function infixEq(x, y) {
    return equals$impl(x, y)
}

function infixLt(x, y) {
    return x < y
}

function infixLte(x, y) {
    return x <= y
}

function infixGt(x, y) {
    return x > y
}

function infixGte(x, y) {
    return x >= y
}

function not(b) {
    return !b
}

function infixOr(x, y) {
    return x || y
}

function infixAnd(x, y) {
    return x && y
}

function isUndefined(value) {
    return value === undefined
}

function Pair(first, second) {
    return {
        "__tag": "Pair",
        "__data": [first, second],
        "first": first,
        "second": second
    }
};

return module.exports = Object.assign($effekt, {
    "infixGt": infixGt,
    "show": show,
    "infixSub": infixSub,
    "infixConcat": infixConcat,
    "infixLt": infixLt,
    "mulDouble": mulDouble,
    "println": println,
    "inspect": inspect,
    "error": error,
    "infixLte": infixLte,
    "isUndefined": isUndefined,
    "infixEq": infixEq,
    "Pair": Pair,
    "random": random,
    "subDouble": subDouble,
    "infixMul": infixMul,
    "mod": mod,
    "infixAdd": infixAdd,
    "not": not,
    "addDouble": addDouble,
    "infixAnd": infixAnd,
    "infixDiv": infixDiv,
    "infixGte": infixGte,
    "infixOr": infixOr
})