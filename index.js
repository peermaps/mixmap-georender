var glsl = require('glslify')
var size = [0,0]

module.exports = function (map) {
  return {
    points: {
      frag: glsl`
        precision highp float;
        varying vec4 vcolor;
        void main () {
          if (vcolor.x < 0.1) discard;
          gl_FragColor = vec4(vcolor);
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 0.0, 1.0);
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Point = require('glsl-georender-style-texture/point.h');
        #pragma glslify: readPoint = require('glsl-georender-style-texture/point.glsl');
        uniform sampler2D styleTexture;
        attribute vec2 position;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect, zoom;
        varying float vfeatureType, vindex, zindex;
        varying vec4 vcolor;
        void main () {
          vfeatureType = featureType;
          Point point = readPoint(styleTexture, featureType, zoom, featureCount);
          vcolor = point.color;
          vindex = index;
          zindex = point.zindex;
          vec2 p = position.xy + offset;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
          gl_PointSize = point.size;
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTexture: map.prop('style'),
        featureCount: map.prop('featureCount')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        index: map.prop('indexes')
      },
      primitive: "points",
      count: function (context, props) {
        return props.positions.length/2
      },
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      }
    },
    lineStroke: {
      frag: glsl`
        precision highp float;
        uniform vec2 size;
        varying vec2 vdist;
        varying float vstrokeStyle, vstrokeDashGap;
        varying vec4 vstrokeColor;
        void main () {
          float d = step(vstrokeDashGap/100.0, mod(length(vdist)*20.0, vstrokeStyle/10.0));
          gl_FragColor = vec4(vstrokeColor.xyz, vstrokeColor.w/100.0 *
          min(d,step(0.1,vstrokeColor.x)));
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 1.0, 1.0);
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Line = require('glsl-georender-style-texture/line.h');
        #pragma glslify: readLine = require('glsl-georender-style-texture/line.glsl');
        attribute vec2 position, normal, dist;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect, zoom;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex, vstrokeStyle, vstrokeDashGap;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 vstrokeColor;
        void main () {
          vfeatureType = featureType;
          Line line = readLine(styleTexture, featureType, zoom, featureCount);
          vstrokeColor = line.strokeColor;
          vstrokeStyle = line.strokeStyle;
          vstrokeDashGap = line.strokeDashGap;
          vindex = index;
          zindex = line.zindex;
          vec2 p = position.xy + offset;
          vec2 m = (line.fillWidth+2.0*line.strokeWidth)/size;
          vnorm = normalize(normal)*m;
          vdist = vec2(
            (dist.x / (viewbox.z - viewbox.x) * 2.0 - 1.0) * aspect,
            (dist.y / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect
          );
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
          vpos = gl_Position.xy;
          gl_Position += vec4(vnorm, 0, 0);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTexture: map.prop('style'),
        featureCount: map.prop('featureCount')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        index: map.prop('indexes'),
        normal: map.prop('normals'),
        dist: map.prop('distances')
      },
      primitive: "triangle strip",
      count: function (context, props) {
        return props.positions.length/2
      },
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      }
    },
    lineFill: {
      frag: glsl`
        precision highp float;
        varying float vfillStyle, vfillDashGap;
        varying vec2 vdist;
        varying vec4 vfillColor;
        void main () {
          float d = step(vfillDashGap/100.0, mod(length(vdist)*20.0, vfillStyle/10.0));
          gl_FragColor = vec4(vfillColor.xyz, vfillColor.w/100.0 *
          min(d,step(0.1,vfillColor.x)));
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 1.0, 1.0);
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Line = require('glsl-georender-style-texture/line.h');
        #pragma glslify: readLine = require('glsl-georender-style-texture/line.glsl');
        attribute vec2 position, normal, dist;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect, zoom;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex, vfillStyle, vfillDashGap;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 vfillColor;
        void main () {
          vfeatureType = featureType;
          Line line = readLine(styleTexture, featureType, zoom, featureCount);
          vfillColor = line.fillColor;
          vfillStyle = line.fillStyle;
          vfillDashGap = line.fillDashGap;
          vindex = index;
          zindex = line.zindex + 0.1;
          vec2 p = position.xy + offset;
          vnorm = normalize(normal)*(line.fillWidth/size);
          vdist = vec2(
            (dist.x / (viewbox.z - viewbox.x) * 2.0 - 1.0) * aspect,
            (dist.y / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect
          );
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
          vpos = gl_Position.xy;
          gl_Position += vec4(vnorm, 0, 0);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTexture: map.prop('style'),
        featureCount: map.prop('featureCount')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        index: map.prop('indexes'),
        normal: map.prop('normals'),
        dist: map.prop('distances')
      },
      primitive: "triangle strip",
      count: function (context, props) {
        return props.positions.length/2
      },
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      }
    },
    areas: {
      frag: glsl`
        precision highp float;
        varying vec4 vcolor;
        void main () {
          gl_FragColor = vec4(vcolor);
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 2.0, 1.0);
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Area = require('glsl-georender-style-texture/area.h');
        #pragma glslify: readArea = require('glsl-georender-style-texture/area.glsl');
        attribute vec2 position;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float aspect, featureCount, zoom;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex;
        varying vec4 vcolor;
        void main () {
          vfeatureType = featureType;
          Area area = readArea(styleTexture, featureType, zoom, featureCount);
          vcolor = area.color;
          vindex = index;
          zindex = area.zindex;
          vec2 p = position.xy + offset;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        featureCount: map.prop('featureCount'),
        styleTexture: map.prop('style')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        index: map.prop('indexes')
      },
      elements: map.prop('cells'),
      primitive: "triangles",
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      }
    },
    labels: {
      frag: `
      precision mediump float;
      void main () {
        gl_FragColor = vec4(0,0,1,1);
      }`,
      vert: `
      precision mediump float;
      attribute vec2 position;
      void main () {
        gl_Position = vec4(position.xy*vec2(1,-1)*0.2, 0, 1);
      }`,
      attributes: {
        position: map.prop('positions')
      },
      elements: map.prop('cells'),
      depth: { enable: false }
    }
  }
}
