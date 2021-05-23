# mixmap-georender

a mixmap layer for rendering peermaps georender data

# example

```js
var mixmap = require('mixmap')
var regl = require('regl')
var prepare = require('../prepare.js')
var getImagePixels = require('get-image-pixels')
var decode = require('georender-pack/decode')
var lpb = require('length-prefixed-buffers')
 
var mix = mixmap(regl, { extensions: [
  'oes_element_index_uint', 'oes_texture_float','EXT_float_blend' ] })
var map = mix.create({ 
  viewbox: [+36.2146, +49.9962, +36.2404, +50.0154],
  backgroundColor: [0.82, 0.85, 0.99, 1.0],
  pickfb: { colorFormat: 'rgba', colorType: 'float32' }
})
var geoRender = require('mixmap-georender')(map)

var draw = {
  area: map.createDraw(geoRender.areas),
  lineStroke: map.createDraw(geoRender.lineStroke),
  lineFill: map.createDraw(geoRender.lineFill),
  lineStrokeT: map.createDraw(geoRender.lineStroke),
  lineFillT: map.createDraw(geoRender.lineFill),
  point: map.createDraw(geoRender.points),
  pointT: map.createDraw(geoRender.points),
}

function ready({texture, buffers}) {
  var prep = prepare({
    stylePixels: getImagePixels(texture),
    styleTexture: map.regl.texture(texture),
    decoded: decode(buffers),
  })
  var zoom = Math.round(map.getZoom())
  var props = null
  update(zoom)
  map.on('viewbox', function () {
    var z = Math.round(map.getZoom())
    if (zoom !== z) update(z)
    zoom = z
  })
  function update(zoom) {
    props = prep.update(zoom)
    draw.point.props = [props.pointP]
    draw.pointT.props = [props.pointT]
    draw.lineFill.props = [props.lineP]
    draw.lineStroke.props = [props.lineP]
    draw.lineFillT.props = [props.lineT]
    draw.lineStrokeT.props = [props.lineT]
    draw.area.props = [props.area]
    map.draw()
  }
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
      src: './example/kharkiv' || location.search.slice(1),
      parser: function (data) { 
        return lpb.decode(Buffer.from(data))
      }
    }
  },
  onDone: ready
})

window.addEventListener('resize', function (ev) {
  map.resize(window.innerWidth, window.innerHeight)
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
document.body.appendChild(map.render({ width: window.innerWidth, height: window.innerHeight }))
```

to run example:
* clone the repo from https://github.com/peermaps/mixmap-georender/
* navigate to the folder where the package was cloned and do `npm install`.
* do `npm run download`. this should download the files `kharkiv` and `style.png` into the `example` directory.
* if those files downloaded successfully, do `npm run example`.
* you should see output like `Server running at http://192.168.129.29:9966/`. in the browser, navigate to that url.

(the directions above assume that you have node.js and npm installed. instructions are for usage on the command line.)

[see a live demo of this example](https://kitties.neocities.org/mixmap-georender/kharkivdemo.html)

# api

```
var mixmapGeorender = require('mixmap-georender')
var prepare = require('mixmap-georender/prepare')
```

## var shaders = mixmapGeorender(map)

return a collection of shaders for georender data from
`map`, a [mixmap](https://github.com/peermaps/mixmap) instance created with
[`mix.create`](https://github.com/peermaps/mixmap#var-map--mixcreateopts).

you can set up all the shaders with:

``` js
var draw = {
  area: map.createDraw(geoRender.areas),
  lineStroke: map.createDraw(geoRender.lineStroke),
  lineFill: map.createDraw(geoRender.lineFill),
  lineStrokeT: map.createDraw(geoRender.lineStroke),
  lineFillT: map.createDraw(geoRender.lineFill),
  point: map.createDraw(geoRender.points),
  pointT: map.createDraw(geoRender.points),
}
```

and then populate their `props` arrays with data from the prepare() function
(see below) before calling `map.draw()`.

## var prep = prepare(opts)

create a prepare instance from:

* `opts.decoded` is an object created by [georender-pack
decode](https://github.com/peermaps/georender-pack/#decode)
* `opts.styleTexture` is a texture created with 
[georender-style2png](https://www.npmjs.com/package/georender-style2png).
* `opts.stylePixels` is the pixel data of the style texture. in the example we use
[get-image-pixels](https://www.npmjs.com/package/get-image-pixels) to get the
opts.pixel data out of the texture created with [georender-style2png](https://www.npmjs.com/package/georender-style2png).

## var props = prep.update(zoom)

calling `prepare.update(zoom)` returns all the properties you will
need when making your draw calls at a given zoom level. for example:

``` js
var props = prep.update(zoom)
draw.point.props = [props.pointP]
draw.pointT.props = [props.pointT]
draw.lineFill.props = [props.lineP]
draw.lineStroke.props = [props.lineP]
draw.lineFillT.props = [props.lineT]
draw.lineStrokeT.props = [props.lineT]
draw.area.props = [props.area]
map.draw()
```


# install

`npm install mixmap-georender`

# license

MIT
