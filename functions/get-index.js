const fs = require('fs')
const Mustache = require('mustache')
const http = require('axios')
const aws4 = require('aws4')
const URL = require('url')

const restaurantsApiRoot = process.env.RESTAURANTS_API
const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID
const cognitoClientId = process.env.COGNITO_CLIENT_ID
const awsRegion = process.env.AWS_REGION

const days = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
]

const template = fs.readFileSync('static/index.html', 'utf-8')

const getRestaurants = async () => {
	console.log(`loading restaurants from ${restaurantsApiRoot}`)
	const url = URL.parse(restaurantsApiRoot)
	const opts = {
		host: url.hostname,
		path: url.pathname,
	}
	aws4.sign(opts)

	const response = await http.get(restaurantsApiRoot, {
		headers: opts.headers,
	})

	return response.data
}

module.exports.handler = async (event, context) => {
	const restaurants = await getRestaurants()
	const dayOfWeek = days[new Date().getDay()]

	const view = {
		awsRegion,
		cognitoUserPoolId,
		cognitoClientId,
		dayOfWeek,
		restaurants,
		searchUrl: `${restaurantsApiRoot}/search`,
	}
	const html = Mustache.render(template, view)
	const response = {
		statusCode: 200,
		headers: {
			'content-type': 'text/html; charset=UTF-8',
		},
		body: html,
	}

	return response
}
