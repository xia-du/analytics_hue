/**
 * Job: google-analytics
 * https://developers.google.com/analytics/devguides/reporting/core/dimsmets
 * Expected configuration:
 */
var google = require('googleapis');
var analytics = google.analytics('v3');
var path = require('path');
var request = require('request');
var _ = require('underscore');
var jsonfile = require('jsonfile')
var paramPath = './param.json';
var param = require('./param.json');

var activeUsers = param.activeUsers;
var topPagePath = param.topPagePath;

jsonfile.readFile(paramPath, function(err, obj) {
	activeUsers = obj.activeUsers;
	topPagePath = obj.topPagePath;

	console.dir(obj)
})

var makerHook1 = 'https://maker.ifttt.com/trigger/',
	makerHook2 = '/with/key/ctV1AfljhPjHGwnnnr5XCM';

var pagesArray = [
	{
		name: 'portfolio_home',
		path: '/'
	}, {
		name: 'portfolio_work',
		path: '/work/'
	}, {
		name: 'portfolio_about',
		path: '/about/'
	}, {
		name: 'portfolio_contact',
		path: '/contact/'
	}, {
		name: 'portfolio_amazon',
		path: '/portfolio/amazon/'
	}, {
		name: 'portfolio_brillo',
		path: '/portfolio/brillo/'
	}, {
		name: 'portfolio_pandora',
		path: '/portfolio/pandora/'
	}, {
		name: 'portfolio_uniqlo',
		path: '/portfolio/uniqlo/'
	}
]

var hue = function(action) {
	var makerHook = makerHook1 + action + makerHook2;
	request(makerHook, function(error, response, body) {
		if (error) {
			console.log('error:', error); // Print the error if one occurred
			console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
		}
		console.log('body:', body); // Print the HTML for the Google homepage.
	});
}

module.exports = function(config, job_callback) {

	if (!config.authEmail) {
		return job_callback('authEmail not found in configuration');
	}

	if (!config.viewID) {
		return job_callback('viewID not found in configuration');
	}

	if (!config.metrics || !config.metrics.length) {
		return job_callback('no metrics provided');
	}

	if (!config.dimensions || !config.dimensions.length) {
		return job_callback('no dimensions provided');
	}

	var wallboardExpectedRoot = path.resolve(__dirname, '../../../../');
	var keyPath = path.resolve(wallboardExpectedRoot, config.gaKeyLocation || 'ga-analytics-key.p12'); // wallboard root
	// prevent path traversal
	if (keyPath.indexOf(wallboardExpectedRoot) !== 0) {
		return job_callback('path traversal detected!');
	}

	var authClient = new google
		.auth
		.JWT(config.authEmail, keyPath, //path to .pem
				null,
		// Scopes can be specified either as an array or as a single, space-delimited string
		['https://www.googleapis.com/auth/analytics', 'https://www.googleapis.com/auth/analytics.readonly']);

	var startDate = config.startDate || '7daysAgo';
	if (config.daysAgo) {
		startDate = config.daysAgo + "daysAgo";
	}
	var endDate = config.endDate || 'yesterday';

	authClient.authorize(function(err, tokens) {
		if (err) {
			return job_callback(err);
		}

		var options = {
			auth: authClient,
			"ids": 'ga:' + config.viewID,
			"start-date": startDate,
			"end-date": endDate,
			"metrics": config
				.metrics
				.join(','),
			"dimensions": config
				.dimensions
				.join(',')
		};

		if (config.filters) {
			options.filters = config.filters;
		}

		analytics
			.data[config.realTime
					? 'realtime'
					: 'ga']
			.get(options, function(err, data) {
				if (data) {
					// job_callback(data, {
					// 	data: data,
					// 	safeConfig: _.omit(config, 'globalAuth'),
					// 	title: config.title
					// });

					var newActiveUsers = data.totalsForAllResults['rt:activeUsers'];

					if (data.rows) {
						var pages = data.rows;
						var topPageViewers = pages[0][1];
						var newTopPagePath = pages[0][0];

						if (pages) {
							for (var i = 0; i < pages.length; i++) {
								if (pages[i][1] >= topPageViewers) {
									topPageViewers = pages[i][1];
									newTopPagePath = pages[i][0];
								}
							}
						}
					}

					if (newActiveUsers > 0 && data.rows) {
						if (activeUsers == 0) {
							hue('portfolio_on');
							if (activeUsers !== newActiveUsers) {
								activeUsers = newActiveUsers;
							}
						} else {
							console.log('light already on');
						}
						for (var i = 0; i < pagesArray.length; i++) {
							if (newTopPagePath === pagesArray[i].path && newTopPagePath !== topPagePath) {
								hue(pagesArray[i].name);
								topPagePath = newTopPagePath;
							} else {
								// console.log('no color change');
							}
						}
					} else {
						if (activeUsers != 0) {
							hue('portfolio_off');
							activeUsers = newActiveUsers;
							topPagePath = '';
						} else {
							console.log('light already off');
						}
					}

					var newParam = {
						"activeUsers": activeUsers,
						"topPagePath": topPagePath
					};

					jsonfile.writeFile(paramPath, newParam, {
						spaces: 2
					}, function(err) {
						if (err) {
							console.error(err)
						}
					})
				}

				if (err) {
					job_callback(err, {
						data: data,
						safeConfig: _.omit(config, 'globalAuth'),
						title: config.title
					});
				}
			});
	});
};
