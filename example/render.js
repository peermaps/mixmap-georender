var mixmap = require('mixmap')
var regl = require('regl')
var prepare = require('../prepare.js')
var getImageData = require('./getimagedata.js')
var decode = require('georender-pack/decode')
var lpb = require('length-prefixed-buffers')
 
var mix = mixmap(regl, { extensions: [
  'oes_element_index_uint', 'oes_texture_float','EXT_float_blend' ] })
var map = mix.create({ 
  //viewbox: [+36.2146, +49.9962, +36.2404, +50.0154],
  viewbox: [+29.9, +31.1, +30.1, +31.3],
  backgroundColor: [0.82, 0.85, 0.99, 1.0],
  pickfb: { colorFormat: 'rgba', colorType: 'float32' }
})
var geoRender = require('../index.js')(map)

var draw = {
  area: map.createDraw(geoRender.areas),
  lineStroke: map.createDraw(geoRender.lineStroke),
  lineFill: map.createDraw(geoRender.lineFill),
  lineStrokeT: map.createDraw(geoRender.lineStroke),
  lineFillT: map.createDraw(geoRender.lineFill),
  point: map.createDraw(geoRender.points),
  pointT: map.createDraw(geoRender.points),
}

var ready = function (props) {
  window.addEventListener('click', function (ev) {
    map.pick({ x: ev.offsetX, y: ev.offsetY }, function (err, data) {
      if (data[2] === 0.0) {
        console.log(data[1], props.point.indexToId[data[0]])
      }
      else if (data[2] === 0.5) {
        console.log(data[1], props.lineT.indexToId[data[0]])
      }
      else if (data[2] === 1.0) {
        console.log(data[1], props.area.indexToId[data[0]])
      }
      console.log(data)
    })
  })
  draw.point.props.push(props.pointP)
  draw.pointT.props.push(props.pointT)
  draw.lineFill.props.push(props.lineP)
  draw.lineStroke.props.push(props.lineP)
  draw.lineFillT.props.push(props.lineT)
  draw.lineStrokeT.props.push(props.lineT)
  draw.area.props.push(props.area)
  map.draw()
}

require('resl')({
  manifest: {
    texture: {
      type: 'image',
      src: './example/style.png',
      parser: function (data) { return data }
    },
    buffers: {
      type: 'binary',
      //src: './example/alexandrialpb',
      src: './example/alexandrialpb' || location.search.slice(1),
      parser: function (data) { 
        return lpb.decode(Buffer.from(data))
      }
    }
  },
  onDone: function ({texture, buffers}) {
    var prep = prepare(getImageData(texture), map.regl.texture(texture), decode(buffers), 14)
    ready(prep.update(14))
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

window.addEventListener('resize', function (ev) {
  map.resize(window.innerWidth, window.innerHeight)
})
 
document.body.appendChild(mix.render())
document.body.appendChild(map.render({ width: window.innerWidth, height: window.innerHeight }))
