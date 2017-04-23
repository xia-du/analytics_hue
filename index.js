'use strict'
var express = require('express')
var app = express()

app.get('/', function (req, res) {
  res.send('Analytics Light')
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')

		var gaJob = require('./google-analytics.js');

		var config = {
			authEmail: 'analytics-light@appspot.gserviceaccount.com',
			viewID: '120028629', // without the 'ga:' prefix
			startDate: '4/1/17',
			endDate: '4/30/17',
			daysAgo: 30, // optional, will override startDate
			metrics: ["rt:activeUsers"], // or ["rt:activeUsers"] if using the realtime API
			dimensions: ["rt:pagePath"],
			realTime: true,
			gaKeyLocation: '/Users/xiadu/dev/z-confidential/key.pem' // file must be located inside the wallboard directory
		}

		var job_callback = function(text) {
			console.log(text);
		}

		gaJob(config, job_callback);

		function monitor() {
			setInterval(function() {
				console.log(Date());
				gaJob(config, job_callback);
			}, 1000);
		}

		monitor();
})
