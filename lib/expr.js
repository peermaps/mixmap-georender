module.exports = function (expr, vars) {
  var tokens = tokenize(expr)
  var stack = []
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i] === '<') {
      stack.push(evalToken(tokens[i-1], vars) < evalToken(tokens[i+1], vars))
    } else if (tokens[i] === '<=') {
      stack.push(evalToken(tokens[i-1], vars) <= evalToken(tokens[i+1], vars))
    } else if (tokens[i] === '>') {
      stack.push(evalToken(tokens[i-1], vars) > evalToken(tokens[i+1], vars))
    } else if (tokens[i] === '>=') {
      stack.push(evalToken(tokens[i-1], vars) >= evalToken(tokens[i+1], vars))
    } else if (tokens[i] === '=' || tokens[i] === '==' || tokens[i] === '===') {
      stack.push(evalToken(tokens[i-1], vars) === evalToken(tokens[i+1], vars))
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
  for (var i = 1; i < stack.length; i+=2) {
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
  if (/^[a-z]\w*$/.test(token)) {
    return vars[token]
  } else if (/^(\d+(\.\d*)?|\.\d+)$/.test(token)) {
    return Number(token)
  } else {
    throw new Error('syntax error')
  }
}

function tokenize(expr) {
  var re = /([a-z]\w*|[<>=]=?|===|\d+(?:\.\d*)?|\.\d*|\s+|&&|\|\|)/y
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
