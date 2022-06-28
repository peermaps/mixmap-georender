var mixmap = require('mixmap')
var regl = require('regl')
var prepare = require('../prepare.js')
var getImagePixels = require('get-image-pixels')
var decode = require('georender-pack/decode')
var lpb = require('length-prefixed-buffers/without-count')
var Text = require('../text.js')
 
var mix = mixmap(regl, { extensions: [
  'oes_element_index_uint', 'EXT_float_blend', 'angle_instanced_arrays'] })
var map = mix.create({ 
  viewbox: [+36.2146, +49.9962, +36.2404, +50.0154],
  //viewbox: [+29.9, +31.1, +30.1, +31.3],
  backgroundColor: [0.82, 0.85, 0.99, 1.0],
  pickfb: { colorFormat: 'rgba' }
})
window.map = map
var geoRender = require('../index.js')(map)

var draw = {
  area: map.createDraw(geoRender.areas),
  areaT: map.createDraw(geoRender.areas),
  areaBorder: map.createDraw(geoRender.areaBorders),
  areaBorderT: map.createDraw(geoRender.areaBorders),
  lineStroke: map.createDraw(geoRender.lineStroke),
  lineFill: map.createDraw(geoRender.lineFill),
  lineStrokeT: map.createDraw(geoRender.lineStroke),
  lineFillT: map.createDraw(geoRender.lineFill),
  point: map.createDraw(geoRender.points),
  pointT: map.createDraw(geoRender.points),
  label: map.createDraw(geoRender.labels),
}
window.draw = draw

function ready({style, decoded}) {
  var prep = prepare({
    stylePixels: getImagePixels(style),
    styleTexture: map.regl.texture(style),
    zoomStart: 1,
    zoomEnd: 21,
    decoded
  })
  var zoom = Math.round(map.getZoom())
  var props = null
  var text = new Text
  update(zoom)
  map.on('viewbox', function () {
    var z = Math.round(map.getZoom())
    if (zoom !== z) {
      update(z)
    } else {
      draw.label.props = [text.update(props, map)]
    }
    zoom = z
  })
  function update(zoom) {
    props = prep.update(zoom)
    //console.log('areaP props: ', props.areaP.indexes, 'areaT props: ', props.areaT.indexes)
    draw.point.props = [props.pointP]
    draw.pointT.props = [props.pointT]
    draw.lineFill.props = [props.lineP]
    draw.lineStroke.props = [props.lineP]
    draw.lineFillT.props = [props.lineT]
    draw.lineStrokeT.props = [props.lineT]
    draw.area.props = [props.areaP]
    draw.areaT.props = [props.areaT]
    draw.areaBorder.props = [props.areaBorderP]
    draw.areaBorderT.props = [props.areaBorderT]
    draw.label.props = [text.update(props, map)]
    map.draw()
  }
  window.addEventListener('click', function (ev) {
    //console.log(ev.offsetX, ev.offsetY)
    var pickProps = { 
      x: ev.offsetX*2, //multiply by 2 b/c width is twice as long
      y: ev.offsetY,
      width: 2,
    }
    map.pick(pickProps, function (err, data) {
      cdata = data[0]*256*256 + data[1]*256 + data[2]
      //console.log('data: ', data, 'cdata: ', cdata)
      if (data[4] === 0.0) {
        console.log('point: ', 'index :', cdata, 'id: ', Math.floor(props.pointT.indexToId[cdata]/3))
      }
      else if (data[4] === 1.0) {
        console.log('point: ', 'index :', cdata, 'id: ', Math.floor(props.pointP.indexToId[cdata]/3))
        //console.log(data[1], props.pointP.indexToId[data[0]])
      }
      else if (data[4] === 2.0) {
        console.log('line: ', 'index :', cdata, 'id: ', Math.floor(props.lineT.indexToId[cdata]/3))
        //console.log(data[1], props.lineT.indexToId[data[0]])
      }
      else if (data[4] === 3.0) {
        console.log('line: ', 'index :', cdata, 'id: ', Math.floor(props.lineP.indexToId[cdata]/3))
        //console.log(data[1], props.lineP.indexToId[data[0]])
      }
      else if (data[4] === 4.0) {
        console.log('area: ', 'index :', cdata, 'id: ', Math.floor(props.areaP.indexToId[cdata]/3))
        //console.log(data[1], props.areaT.indexToId[data[0]])
      }
      else if (data[4] === 5.0) {
        console.log('area: ', 'index :', cdata, 'id: ', Math.floor(props.areaT.indexToId[cdata]/3))
        //console.log(data[1], props.areaP.indexToId[data[0]])
      }
    })
  })
}


require('resl')({
  manifest: {
    style: {
      type: 'image',
      src: './example/style2.png'
    },
    decoded: {
      type: 'binary',
      src: './example/kharkiv' || location.search.slice(1),
      //src: './example/alexandria' || location.search.slice(1),
      parser: data => decode(lpb.decode(Buffer.from(data)))
    }
  },
  onDone: ready
})

window.addEventListener('resize', function (ev) {
  map.resize(window.innerWidth, window.innerHeight)
  //do i have to do something with picksize here?
})

window.addEventListener('keydown', function (ev) {
  if (ev.code === 'Digit0') {
    map.setZoom(Math.min(6,Math.round(map.getZoom()+1)))
  } else if (ev.code === 'Minus') {
    map.setZoom(map.getZoom()-1)
    console.log(map.getZoom())
  } else if (ev.code === 'Equal') {
    map.setZoom(map.getZoom()+1)
    console.log(map.getZoom())
  }
})

document.body.appendChild(mix.render())
document.body.appendChild(map.render({
  width: window.innerWidth,
  height: window.innerHeight,
  pickWidth: window.innerWidth*2.0,
  pickHeight: window.innerheight
}))
