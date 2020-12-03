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
			"line-width": 3.0,
			"line-fill-color": "#1f9393",
      "line-fill-style": "dash",
      "line-fill-dash-length": "",
      "line-fill-dash-gap": 0.5,
			"line-stroke-color": "#ffb6c1",
			"line-stroke-width": 3.0,
      "line-stroke-style": "solid",
      "line-stroke-dash-length": "",
      "line-stroke-gap": 0.7,
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
