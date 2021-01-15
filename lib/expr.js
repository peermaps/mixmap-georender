module.exports = function (expr, vars) {
  var tokens = tokenize(expr)
  var stack = []
  for (var i = 0; i < tokens.length; i++) {
    if (/^(?:[<>]=?|=+)$/.test(tokens[i+1])) {
      var result = true
      for (; i < tokens.length; i+=2) {
        if (tokens[i+1] === '<') {
          result = result && (evalToken(tokens[i], vars) < evalToken(tokens[i+2], vars))
        } else if (tokens[i+1] === '>') {
          result = result && (evalToken(tokens[i], vars) > evalToken(tokens[i+2], vars))
        } else if (tokens[i+1] === '>=') {
          result = result && (evalToken(tokens[i], vars) >= evalToken(tokens[i+2], vars))
        } else if (tokens[i+1] === '<=') {
          result = result && (evalToken(tokens[i], vars) <= evalToken(tokens[i+2], vars))
        } else if (/^=+$/.test(tokens[i+1])) {
          result = result && (evalToken(tokens[i], vars) === evalToken(tokens[i+2], vars))
        } else { break }
      }
      stack.push(result)
    } else if (/^(?:[A-Za-z]\w*|\d+(\.\d*)?|\.\d+)$/.test(tokens[i])) {
      stack.push(evalToken(tokens[i], vars))
    } else if (tokens[i] === '&&') {
      stack.push('&&')
    } else if (tokens[i] === '||') {
      stack.push('||')
    }
  }
  var result = stack[0]
  if (typeof result !== 'boolean') {
    throw new Error('syntax error')
  }
  for (var i = 1; i < stack.length - 1; i+=2) {
    if (typeof stack[i+1] !== 'boolean') {
      throw new Error('syntax error')
    }
    if (stack[i] === '&&') {
      result = result && stack[i+1]
    } else if (stack[i] === '||') {
      result = result || stack[i+1]
    } else {
      throw new Error('syntax error')
    }
  }
  return result
}

function evalToken(token, vars) {
  if (/^[A-Za-z]\w*$/.test(token)) {
    if (vars[token] === undefined) {
      throw new Error ('variable undefined')
    }
    return vars[token]
  } else if (/^(\d+(\.\d*)?|\.\d+)$/.test(token)) {
    return Number(token)
  } else {
    throw new Error('syntax error')
  }
}

function tokenize(expr) {
  var re = /([A-Za-z]\w*|[<>]=?|=+|\d+(?:\.\d*)?|\.\d*|\s+|&&|\|\|)/y
  var tokens = []
  var m
  var last = 0
  while (m = re.exec(expr)) {
    if (!/^\s+$/.test(m[1])) tokens.push(m[1])
    last = re.lastIndex
  }
  if (last !== expr.length) {
    console.log(last, expr.length)
    throw new Error('syntax error at offset ' + last)
  }
  return tokens
}
