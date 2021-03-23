var glsl = require('glslify')
var size = [0,0]

module.exports = function (map) {
  return {
    points: {
      frag: glsl`
        precision highp float;
        varying vec4 v_color;
        void main () {
          if (v_color.x < 0.1) discard;
          gl_FragColor = vec4(v_color);
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
        #pragma glslify: Point = require('./point.h');
        #pragma glslify: point_init = require('./point.glsl');
        uniform sampler2D styleTexture;
        attribute vec2 position;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect, zoom;
        varying float vfeatureType, vindex, zindex, v_size;
        varying vec4 v_color;
        void main () {
          vfeatureType = featureType;
          Point point = point_init(styleTexture, featureType, zoom, featureCount);
          v_color = point.color;
          v_size = point.size;
          vindex = index;
          zindex = point.zindex;
          vec2 p = position.xy + offset;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
          gl_PointSize = v_size;
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTexture: map.prop('style'),
        zoomStart: map.prop('zoomStart'),
        zoomCount: map.prop('zoomCount'),
        texRange: map.prop('texRange'),
        featureCount: map.prop('styleCount')
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
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    },
    lineStroke: {
      frag: glsl`
        precision highp float;
        uniform vec2 size;
        varying vec2 vdist;
        varying float v_strokestyle, v_strokedashgap;
        varying vec4 v_strokecolor;
        void main () {
          float d = step(v_strokedashgap/100.0, mod(length(vdist)*20.0, v_strokestyle/10.0));
          gl_FragColor = vec4(v_strokecolor.xyz, v_strokecolor.w/100.0 * min(d,step(0.1,v_strokecolor.x)));
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 0.5, 1.0);
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Line = require('./line.h');
        #pragma glslify: line_init = require('./line.glsl');
        attribute vec2 position, normal, dist;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect, zoom;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex, v_strokestyle, v_strokedashgap;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 v_strokecolor;
        void main () {
          vfeatureType = featureType;
          Line line = line_init(styleTexture, featureType, zoom, featureCount);
          v_strokecolor = line.strokecolor;
          v_strokestyle = line.strokestyle;
          v_strokedashgap = line.strokedashgap;
          vindex = index;
          zindex = line.zindex;
          vec2 p = position.xy + offset;
          vec2 m = (line.fillwidth+2.0*line.strokewidth)/size;
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
        featureCount: map.prop('styleCount'),
        zoomStart: map.prop('zoomStart'),
        zoomCount: map.prop('zoomCount'),
        texRange: map.prop('texRange')
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
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    },
    lineFill: {
      frag: glsl`
        precision highp float;
        varying float v_fillstyle, v_filldashgap;
        varying vec2 vdist;
        varying vec4 v_fillcolor;
        void main () {
          float d = step(v_filldashgap/100.0, mod(length(vdist)*20.0, v_fillstyle/10.0));
          gl_FragColor = vec4(v_fillcolor.xyz, v_fillcolor.w/100.0 * min(d,step(0.1,v_fillcolor.x)));
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 0.5, 1.0);
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Line = require('./line.h');
        #pragma glslify: line_init = require('./line.glsl');
        attribute vec2 position, normal, dist;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect, zoom;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex, v_fillstyle, v_filldashgap;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 v_fillcolor;
        void main () {
          vfeatureType = featureType;
          Line line = line_init(styleTexture, featureType, zoom, featureCount);
          v_fillcolor = line.fillcolor;
          v_fillstyle = line.fillstyle;
          v_filldashgap = line.filldashgap;
          vindex = index;
          zindex = line.zindex + 0.1;
          vec2 p = position.xy + offset;
          vnorm = normalize(normal)*(line.fillwidth/size);
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
        featureCount: map.prop('styleCount'),
        zoomStart: map.prop('zoomStart'),
        zoomCount: map.prop('zoomCount'),
        texRange: map.prop('texRange')
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
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    },
    areas: {
      frag: glsl`
        precision highp float;
        varying vec4 v_color;
        void main () {
          gl_FragColor = vec4(v_color);
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
        #pragma glslify: Area = require('./area.h');
        #pragma glslify: area_init = require('./area.glsl');
        attribute vec2 position;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texRange;
        uniform float aspect, featureCount, zoom, zoomStart, zoomCount;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex;
        varying vec4 v_color;
        void main () {
          vfeatureType = featureType;
          Area area = area_init(styleTexture, featureType, zoom, featureCount);
          v_color = area.color;
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
        featureCount: map.prop('styleCount'),
        styleTexture: map.prop('style'),
        zoomStart: map.prop('zoomStart'),
        zoomCount: map.prop('zoomCount'),
        texRange: map.prop('texRange')
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
          src: 'src alpha',
          dst: 'one minus src alpha',
          rgb: 'add',
          alpha: 'max'
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
