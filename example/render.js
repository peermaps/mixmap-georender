var mixmap = require('mixmap')
var regl = require('regl')
var glsl = require('glslify')
 
var mix = mixmap(regl, { extensions: ['oes_element_index_uint', 'oes_texture_float'] })
var map = mix.create({ 
  viewbox: [+29.9, +31.1, +30.1, +31.3],
  backgroundColor: [0.82, 0.85, 0.99, 1.0]
})
var geoRender = require('../index.js')(map)
 
var drawLines = map.createDraw(geoRender.lines)
var drawPoints = map.createDraw(geoRender.points)
var drawAreas = map.createDraw(geoRender.areas)

var xhr = require('xhr')
var decode = require('../../georender-pack/decode')

var buffers = []
xhr.get('./example/alexlabelbuf', function(err, resp) {
  resp.body.split('\n').forEach(function(line){
    if (line.length != 0){
      buffers.push(Buffer.from(line, 'base64'))
    }
    else return
  })
  var decoded = decode(buffers)
  drawPoints.props.push({
    positions: decoded.point.positions,
    types: decoded.point.types,
    id: decoded.point.ids
  })
  drawLines.props.push({
    positions: decoded.line.positions,
    types: decoded.line.types,
    normals: decoded.line.normals,
    id: decoded.line.ids
  })
  drawAreas.props.push({
    positions: decoded.area.positions,
    types: decoded.area.types,
    id: decoded.area.ids,
    cells: decoded.area.cells
  })
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
 
document.body.appendChild(mix.render())
document.body.appendChild(map.render({ width: 1000, height: 800 }))
