var mixmap = require('mixmap')
var regl = require('regl')
var prepare = require('../prepare.js')
var decode = require('../../georender-pack/decode')
var xhr = require('xhr')
 
var mix = mixmap(regl, { extensions: ['oes_element_index_uint', 'oes_texture_float', 'EXT_float_blend'] })
var map = mix.create({ 
  viewbox: [+29.9, +31.1, +30.1, +31.3],
  backgroundColor: [0.82, 0.85, 0.99, 1.0],
  pickfb: { colorFormat: 'rgba', colorType: 'float32' }
})
var geoRender = require('../shaders.js')(map)
 
var draw = {
  lineStroke: map.createDraw(geoRender.lineStroke),
  lineFill: map.createDraw(geoRender.lineFill),
  point: map.createDraw(geoRender.points),
  area: map.createDraw(geoRender.areas),
}

var buffers = []
xhr.get('./example/alexlabelbuf3', function(err, resp) {
  resp.body.split('\n').forEach(function(line) {
    if (line.length !== 0) {
      buffers.push(Buffer.from(line, 'base64'))
    }
  })
  var props = prepare(decode(buffers))
  console.log(props.area.id)
  window.addEventListener('click', function (ev) {
    map.pick({ x: ev.offsetX, y: ev.offsetY }, function (err, data) {
      console.log(data[1], props.area.indexToId[data[0]])
    })
  })

  draw.point.props.push(props.point)
  draw.lineFill.props.push(props.lineFill)
  draw.lineStroke.props.push(props.lineStroke)
  draw.area.props.push(props.area)
  map.draw()
})

window.addEventListener('keydown', function (ev) {
  if (ev.code === 'Digit0') {
    map.setZoom(Math.min(6,Math.round(map.getZoom()+1)))
  } else if (ev.code === 'Minus') {
    map.setZoom(map.getZoom()-1)
  } else if (ev.code === 'Equal') {
    map.setZoom(map.getZoom()+1)
  }
})


window.addEventListener('resize', function (ev) {
  map.resize(window.innerWidth, window.innerHeight)
})
 
document.body.appendChild(mix.render())
document.body.appendChild(map.render({ width: window.innerWidth, height: window.innerHeight }))
