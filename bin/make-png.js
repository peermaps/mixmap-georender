var fs = require('fs')
var makePNG = require('fast-png')
var makeTex = require('../maketexture.js')
var tex = makeTex(require('../example/style.json'))

var png = makePNG.encode(tex)
fs.writeFileSync('../texture.png', png)
