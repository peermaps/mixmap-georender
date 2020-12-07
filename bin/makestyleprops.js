var fs = require('fs')
var featureList = require('../features.json')

var styleObj = {}
var arr = Object.keys(featureList)

arr.forEach(function (entry) {
  styleObj[entry] = {
			"fill-color": "",
			"stroke-color": "",
			"stroke-width": "",
      "icon": "",
			"icon-display-style": "",
			"point-size": 3,
			"point-fill-color": "#1f5a92",
			"point-stroke-color": "",
			"point-stroke-width": "",
			"line-fill-width": 3.0,
			"line-fill-color": "#1f9393",
      "line-fill-style": "dash",
      "line-fill-dash-color": "",
      "line-fill-dash-length": "long",
      "line-fill-dash-gap": 0.3,
			"line-stroke-color": "#ffb6c1",
			"line-stroke-width": 3.0,
      "line-stroke-style": "dash",
      "line-stroke-dash-color": "",
      "line-stroke-dash-length": "long",
      "line-stroke-dash-gap": 0.5,
			"line-overlay": "",
			"area-fill-color": "#ffb6c1",
			"area-fill-pattern": "",
			"label-fill-color": "",
			"label-stroke-color": "",
			"label-stroke-width": "",
			"label-style": ""
    }  
})

fs.writeFileSync('teststylesheet.json', JSON.stringify(styleObj))
