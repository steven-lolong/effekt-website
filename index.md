---
layout: home
title:  "Home"
section: "section_home"
position: 1

features:
  - first: [
      "Effect Handlers",
      "(Algebraic) effect handlers let you define advanced control-flow structures like Generators as user libraries. Those libraries can be seamlessly composed.",
      "concepts/effect-handlers"]

  - second: [
      "Effect Safety",
      "A type- and effect system that does not get into your way. Rely on a simple, yet powerful effect system that guarantees all effects to be handled.",
      "concepts/effect-safety"]

  - third: [
      "Lightweight Effect Polymorphism",
      "No need to understand effect polymorphic functions or annotate them. Explicit effect polymorphism simply does not exist.",
      "concepts/effect-polymorphism"]
---

## Getting Started
{% include install.md %}

### Running the REPL

After making sure you satisfy all requirements and installed Effekt, you
can run the Effekt REPL by entering the following command:
```
effekt
```
Running Effekt without any additional arguments will bring you into the REPL:
```
  _____     ______  __  __     _    _
 (_____)   |  ____|/ _|/ _|   | |  | |
   ___     | |__  | |_| |_ ___| | _| |_
  (___)    |  __| |  _|  _/ _ \ |/ / __|
  _____    | |____| | | ||  __/   <| |_
 (_____)   |______|_| |_| \___|_|\_\\__|

 Welcome to the Effekt interpreter. Enter a top-level definition, or
 an expression to evaluate.

 To print the available commands, enter :help

>
```
Here, you can define functions, import modules and enter expressions to evaluate.
Executing commands in the REPL compiles the corresponding Effekt-programs
to Javascript (you can find them in `./out/`) and runs them with Node.js.

You can find example programs in the [examples folder](https://github.com/effekt-lang/effekt/tree/master/examples/pos).
