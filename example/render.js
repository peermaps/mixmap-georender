var mixmap = require('mixmap')
var regl = require('regl')
var glsl = require('glslify')
 
var mix = mixmap(regl, { extensions: ['oes_element_index_uint', 'oes_texture_float'] })
var map = mix.create({ 
  viewbox: [+29.9, +31.1, +30.1, +31.3],
  backgroundColor: [0.82, 0.85, 0.99, 1.0],
  pickfb: { colorFormat: 'rgba', colorType: 'float32' }
})
var geoRender = require('../index.js')(map)
 
var drawLinesStroke = map.createDraw(geoRender.linesStroke)
var drawLinesFill = map.createDraw(geoRender.linesFill)
var drawPoints = map.createDraw(geoRender.points)
var drawAreas = map.createDraw(geoRender.areas)
/*
var drawPointsLabels = map.createDraw(geoRender.labels)
var drawLinesLabels = map.createDraw(geoRender.labels)
var drawAreasLabels = map.createDraw(geoRender.labels)
*/

var xhr = require('xhr')
var decode = require('../../georender-pack/decode')

var indexToId = {}
var idToIndex = {}

var buffers = []
xhr.get('./example/alexlabelbuf', function(err, resp) {
  resp.body.split('\n').forEach(function(line){
    if (line.length != 0){
      buffers.push(Buffer.from(line, 'base64'))
    }
    else return
  })
  var decoded = decode(buffers)
  /*
  Object.values(decoded.point.labels).forEach(function(item){
    item.forEach(function(entry){
      if (entry.match(/(:en=)/)) console.log(entry.split(':en=')[1])
    })
  })
  */
  var indexes = new Float32Array(decoded.area.ids.length)
  var x = 1
  decoded.area.ids.forEach(function (id) {
    if (!idToIndex.hasOwnProperty(id)) {
      idToIndex[id] = x
      indexToId[x] = id
      x++
    }
  })
  decoded.area.ids.forEach(function (id, i) {
    indexes[i] = idToIndex[id]
  })

  drawPoints.props.push({
    positions: decoded.point.positions,
    types: decoded.point.types,
    id: decoded.point.ids,
    labels: decoded.point.labels
  })
  drawLinesStroke.props.push({
    positions: decoded.line.positions,
    types: decoded.line.types,
    normals: decoded.line.normals,
    id: decoded.line.ids,
    labels: decoded.line.labels,
    zindex: 1.0
  })
  drawLinesFill.props.push({
    positions: decoded.line.positions,
    types: decoded.line.types,
    normals: decoded.line.normals,
    id: decoded.line.ids,
    labels: decoded.line.labels,
    zindex: 2.0
  })
  drawAreas.props.push({
    positions: decoded.area.positions,
    types: decoded.area.types,
    //id: decoded.area.ids,
    id: indexes,
    cells: decoded.area.cells,
    labels: decoded.area.labels
  })
  /*
  drawPointsLabels.props.push({
    //positions: decoded.point.positions,
    types: decoded.point.types,
    id: decoded.point.ids,
    //cells: decoded.point.cells,
    labels: decoded.point.labels
  })
  drawLinesLabels.props.push({
    //positions: decoded.line.positions,
    types: decoded.line.types,
    id: decoded.line.ids,
    //cells: decoded.line.cells,
    labels: decoded.line.labels
  })
  drawAreasLabels.props.push({
    //positions: decoded.area.positions,
    types: decoded.area.types,
    id: decoded.area.ids,
    //cells: decoded.area.cells,
    labels: decoded.area.labels
  })
  */
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

window.addEventListener('click', function (ev) {
  map.pick({ x: ev.offsetX, y: ev.offsetY }, function (err, data) {
    console.log(indexToId[data[0]])
  })
})
 
document.body.appendChild(mix.render())
document.body.appendChild(map.render({ width: 1000, height: 800 }))
