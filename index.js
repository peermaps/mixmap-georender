var glsl = require('glslify')
var featureList = require('./features.json')

var size = new Float32Array(2)
var lw

var featureListLength = Object.keys(featureList).length

var pointStyleData = new Float32Array(4*featureListLength)
for (var x = 0; x < pointStyleData.length; x += 4) {
  pointStyleData[x+0] = 1 //r
  pointStyleData[x+1] = 0 //g
  pointStyleData[x+2] = 0 //b
  pointStyleData[x+3] = 0 //a
}
pointStyleData[featureList['amenity.cafe']*4+0] = 20 //sets r to 20 for cafe
pointStyleData[featureList['amenity.cafe']*4+1] = 0.2

var lineStyleData = new Float32Array(4*2*featureListLength)
var i = 0;
for (var x = 0; x < featureListLength; x++) {
  lineStyleData[i++] = 2 //r
  lineStyleData[i++] = 0.5 //g
  lineStyleData[i++] = 0.2 //b
  lineStyleData[i++] = 4 //linewidth
}
for (var x = 0; x < featureListLength; x++) {
  lineStyleData[i++] = 1 //r
  lineStyleData[i++] = 0.5 //g
  lineStyleData[i++] = 0.2 //b
  lineStyleData[i++] = 1 //linewidth
}
lineStyleData[featureList['highway.residential']*4+2] = 0

var areaStyleData = new Float32Array(4*featureListLength)
for (var x = 0; x < areaStyleData.length; x += 4) {
  areaStyleData[x+0] = 0 //r
  areaStyleData[x+1] = 0 //g
  areaStyleData[x+2] = 0 //b
  areaStyleData[x+3] = 0 //a
}
//areaStyleData[featureList['place.other']*4+0] = 0.5 //sets r to 0.5
areaStyleData[221*4+0] = 0.5 //sets r
areaStyleData[226*4+1] = 0.2 //sets g
areaStyleData[226*4+0] = 0.5 //sets r

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
          vec3 c = hsl2rgb(0.0+d.y, 1.0, 0.5);
          gl_FragColor = vec4(c,d.x+0.3);
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
          gl_PointSize = d.x;
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
        featureCount: Object.keys(featureList).length
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
        varying vec4 d0, d1;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          if (d0.x < 0.1) discard;
          vec3 c = hsl2rgb(0.0+d0.y, d0.z + 0.1, 0.5);
          gl_FragColor = vec4(c,d0.x+0.3);
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
        varying vec4 d0, d1;
        void main () {
          vfeatureType = featureType;
          d0 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            0.0/styleTextureHeight + 0.5/styleTextureHeight
          ));
          d1 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            0.0/styleTextureHeight + 0.5/styleTextureHeight
          ));
          vec2 p = position.xy + offset;
          float pw = d0.w;
          vec2 n = pw/size;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            0, 1);
          gl_Position += vec4(normal*n, 0, 0);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTextureWidth: featureListLength,
        styleTextureHeight: 2,
        styleTexture: function () {
          if (!styleTexture) {
            styleTexture = map.regl.texture({
              data: lineStyleData,
              width: featureListLength,
              height: 2
            })
          }
          return styleTexture
        },
        featureCount: Object.keys(featureList).length
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
          if (d.x < 0.1) discard;
          vec3 c = hsl2rgb(0.0+d.y, 1.0, 0.5);
          gl_FragColor = vec4(c,d.x+0.3);
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
        featureCount: Object.keys(featureList).length
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
