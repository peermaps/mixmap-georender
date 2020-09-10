var glsl = require('glslify')
var hextorgb = require('hex-to-rgb')
var featureList = require('./features.json')
var styleProps = require('./teststylesheet.json')

var styleFeatures = Object.keys(styleProps)
var styleFeaturesLength = styleFeatures.length

var size = new Float32Array(2)
var lw

function parseHex (hex) {
  return hex.match(/([0-9a-f]{2})/ig).map(s => parseInt(s,16)/255)
}

var pointStyleData = new Float32Array(4*styleFeaturesLength)
for (var x = 0; x < pointStyleData.length/4; x += 4) {
  pointStyleData[x+0] = parseHex(styleProps[styleFeatures[x]]["point-fill-color"])[0] //r
  pointStyleData[x+1] = parseHex(styleProps[styleFeatures[x]]["point-fill-color"])[1] //g
  pointStyleData[x+2] = parseHex(styleProps[styleFeatures[x]]["point-fill-color"])[2] //b
  pointStyleData[x+3] = 2 //point size
}
//pointStyleData[featureList['amenity.cafe']*4+0] = 20 //sets r to 20 for cafe
//pointStyleData[featureList['amenity.cafe']*4+1] = 0.2

var lineStyleData = new Float32Array(4*2*styleFeaturesLength)
var i = 0;
for (var x = 0; x < lineStyleData.length/8; x++) {
  lineStyleData[i++] = parseHex(styleProps[styleFeatures[x]]["line-fill-color"])[0] //r
  lineStyleData[i++] = parseHex(styleProps[styleFeatures[x]]["line-fill-color"])[1] //g
  lineStyleData[i++] = parseHex(styleProps[styleFeatures[x]]["line-fill-color"])[2] //b
  lineStyleData[i++] = styleProps[styleFeatures[x]]["line-width"] //linewidth
}
for (var x = 0; x < lineStyleData.length/8; x++) {
  lineStyleData[i++] = parseHex(styleProps[styleFeatures[x]]["line-stroke-color"])[0] //r
  lineStyleData[i++] = parseHex(styleProps[styleFeatures[x]]["line-stroke-color"])[1] //g
  lineStyleData[i++] = parseHex(styleProps[styleFeatures[x]]["line-stroke-color"])[2] //b
  lineStyleData[i++] = styleProps[styleFeatures[x]]["line-stroke-width"] //linestrokewidth
}
//lineStyleData[featureList['highway.residential']*4+2] = 0

var areaStyleData = new Float32Array(4*styleFeaturesLength)
for (var x = 0; x < areaStyleData.length/4; x += 4) {
  areaStyleData[x+0] = parseHex(styleProps[styleFeatures[x]]["area-fill-color"])[0] //r
  areaStyleData[x+1] = parseHex(styleProps[styleFeatures[x]]["area-fill-color"])[1] //g
  areaStyleData[x+2] = parseHex(styleProps[styleFeatures[x]]["area-fill-color"])[2] //b
  areaStyleData[x+3] = 0 //a
}
//areaStyleData[featureList['place.other']*4+0] = 0.5 //sets r to 0.5
//areaStyleData[221*4+0] = 0.5 //sets r
//areaStyleData[226*4+1] = 0.2 //sets g
//areaStyleData[226*4+0] = 0.5 //sets r

module.exports = function (map) {
  var styleTexture
  return {
    points: {
      frag: glsl`
        precision highp float;
        uniform sampler2D texture, styleTexture;
        varying float vfeatureType;
        uniform float featureCount;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          vec2 uv = vec2(vfeatureType/(featureCount-1.0),0.5);
          vec4 d = texture2D(styleTexture, uv);
          if (d.x < 0.1) discard;
          //vec3 c = hsl2rgb(0.0+d.y, 1.0, 0.5);
          vec3 c = vec3(d.x, d.y, d.z);
          gl_FragColor = vec4(c, 0.9);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position;
        attribute float featureType;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float pointSize, featureCount, aspect;
        uniform sampler2D styleTexture;
        varying float vfeatureType;
        void main () {
          vfeatureType = featureType;
          vec2 uv = vec2(vfeatureType/(featureCount-1.0),0.5);
          vec2 p = position.xy + offset;
          vec4 d = texture2D(styleTexture, uv);
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            0, 1);
          gl_PointSize = d.w;
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        pointSize: function () {
          if (map.getZoom() <= 13) { pw = 3.0 }      
          else if (map.getZoom() >= 16) { pw = 4.0 }
          else pw = 3.5
          return pw
        },
        styleTexture: function () {
          return map.regl.texture({
            data: pointStyleData,
            width: pointStyleData.length/4,
            height: 1
          })
        },
        featureCount: styleFeaturesLength
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types')
      },
      primitive: "points",
      count: function (context, props) {
        return props.positions.length/2
      },
      blend: {
        enable: true,
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    },
    lines: {
      frag: glsl`
        precision highp float;
        uniform sampler2D texture, styleTexture;
        varying float vfeatureType;
        uniform float featureCount, styleTextureWidth, styleTextureHeight;
        uniform vec2 size;
        //varying vec2 pos-before-add-anything-in-screen-space
        //lineposinscreenspace+normal
        varying vec2 vpos, vnorm;
        varying vec4 d0, d1;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          if (d0.x < 0.1) discard;
          vec4 c1 = vec4(d0.xyz, 1);
          vec4 c2 = vec4(d1.xyz, 1);
          float fw = d0.w;
          float dist = distance(vpos*size, gl_FragCoord.xy*size);
          //gl_FragColor = mix(c1, c2, 0.25*sqrt(length(vnorm*size)));
          gl_FragColor = mix(c1, c2, step(fw, 0.5*length(vnorm*size)));
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position, normal;
        attribute float featureType;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect, styleTextureHeight, styleTextureWidth;
        uniform sampler2D styleTexture;
        varying float vfeatureType;
        varying vec2 vpos, vnorm;
        varying vec4 d0, d1;
        void main () {
          vfeatureType = featureType;
          d0 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            0.0/styleTextureHeight + 0.5/styleTextureHeight
          ));
          d1 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            1.0/styleTextureHeight + 0.5/styleTextureHeight
          ));
          vec2 p = position.xy + offset;
          vec2 n = (d0.w+d1.w)/size*2.0;
          vnorm = normal*n;
          //float pw = d0.w;
          //vec2 n = pw/size;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            0, 1);
          vpos = gl_Position.xy;
          gl_Position += vec4(normal*n, 0, 0);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTextureWidth: styleFeaturesLength,
        styleTextureHeight: 2,
        styleTexture: function () {
          if (!styleTexture) {
            styleTexture = map.regl.texture({
              data: lineStyleData,
              width: styleFeaturesLength,
              height: 2
            })
          }
          return styleTexture
        },
        featureCount: styleFeaturesLength
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        normal: map.prop('normals')
      },
      primitive: "triangle strip",
      count: function (context, props) {
        return props.positions.length/2
      },
      blend: {
        enable: true,
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    },
    areas: {
      frag: glsl`
        precision highp float;
        uniform sampler2D texture;
        varying float vfeatureType;
        uniform float featureCount;
        uniform sampler2D styleTexture;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          vec2 uv = vec2(vfeatureType/(featureCount-1.0),0.5);
          vec4 d = texture2D(styleTexture, uv);
          //if (d.x < 0.1) discard;
          //vec3 c = hsl2rgb(0.0+d.y, 1.0, 0.5);
          gl_FragColor = vec4(d.xyz, 1.0);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position;
        attribute float featureType;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect;
        uniform sampler2D styleTexture;
        varying float vfeatureType;
        void main () {
          vec2 p = position.xy + offset;
          vfeatureType = featureType;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            0, 1);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTexture: function () {
          return map.regl.texture({
            data: areaStyleData,
            width: areaStyleData.length/4,
            height: 1
          })
        },
        featureCount: styleFeaturesLength
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types')
      },
      elements: map.prop('cells'),
      primitive: "triangles",
      blend: {
        enable: true,
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    }
  }
}


//texture should be 1 pixel high. each pixel should have a 4 item array with the
//values that will correspond with rgba channels.
//    texture2D(texture, vec2()
//    texture: featuresTex

/*
calculation to go from pixels to value to multiply normal by in screen
coordinates. need: canvas width and height (should be provided by mixmap..look
in docs). to check if it's correct, take a screenshot and look in graphics
program to see how many pixels.

screen space is -1 to +1, value is 2. if you have a canvas that's 400 width and
you input pixel value of 400, output of formula should be 2. and if the normal
is in one direction, so (1, 0).
*/
          //find glsl distance between 2 varying vec2s. multiply that by screen
          //size, you'll get distance in pixels. if that amount is >fill width,
          //it's a stroke. if it's less, then it's a fill. you can use step to
          //determine this.
          //use smooth-step or just step to know whether your point is fill or stroke
