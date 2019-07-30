var mixmap = require('mixmap')
var regl = require('regl')
var glsl = require('glslify')
var resl = require('resl')
 
var mix = mixmap(regl, { extensions: ['oes_element_index_uint', 'oes_texture_float'] })
var map = mix.create({ viewbox: [+36.1, +49.9, +36.3, +50.1]})
var geoRender = require('../index.js')(map)
 
var drawLines = map.createDraw(geoRender.lines)

var drawPoints = map.createDraw(geoRender.points)

resl({
  manifest: {
    lines: { type: 'text', src: './example/lines.json', parser: JSON.parse },
    points: { type: 'text', src: './example/points.json', parser: JSON.parse }
  },
  onDone: function (assets) {
    drawLines.props.push({
      positions: assets.lines.positions,
      normals: assets.lines.normals
    })
    drawPoints.props.push({
      positions: assets.points.positions,
      types: assets.points.types
    })
  }
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
document.body.appendChild(map.render({ width: 600, height: 400 }))
