const { DynamoDB } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const middy = require('@middy/core')
const ssm = require('@middy/ssm')
const { Logger } = require('@aws-lambda-powertools/logger')
const {
	injectLambdaContext,
} = require('@aws-lambda-powertools/logger/middleware')
const { Tracer } = require('@aws-lambda-powertools/tracer')
const {
	captureLambdaHandler,
} = require('@aws-lambda-powertools/tracer/middleware')

const logger = new Logger({ serviceName: process.env.serviceName })

const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled)
const middyCacheExpiry = parseInt(process.env.middy_cache_expiry_milliseconds)

const dynamodbClient = new DynamoDB()
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient)

const tracer = new Tracer({ serviceName: process.env.serviceName })
tracer.captureAWSv3Client(dynamodb)

const { serviceName, ssmStage } = process.env
const tableName = process.env.RESTAURANTS_TABLE

const findRestaurantsByTheme = async (theme, count) => {
	// console.log(`finding (up to ${count}) restaurants with theme ${theme}`)
	logger.debug('finding (up to ?) restaurants with theme ?', {
		count,
		theme,
	})

	const resp = await dynamodb.send(
		new ScanCommand({
			TableName: tableName,
			FilterExpression: 'contains(themes, :theme)',
			ExpressionAttributeValues: { ':theme': theme },
			Limit: count,
		})
	)

	// console.log(`found ${resp.Items.length} restaurants`)
	logger.debug('found ? restaurants', {
		count: resp.Items.length,
		theme,
	})
	return resp.Items
}

module.exports.handler = middy(async (event, context) => {
	logger.setLogLevel('INFO')
	logger.refreshSampleRateCalculation()

	const req = JSON.parse(event.body)
	const theme = req.theme
	const restaurants = await findRestaurantsByTheme(
		theme,
		context.config.defaultResults
	)
	const response = {
		statusCode: 200,
		body: JSON.stringify(restaurants),
	}

	return response
})
	.use(
		ssm({
			cache: middyCacheEnabled,
			cacheExpiry: middyCacheExpiry, // 1 mins
			setToContext: true,
			fetchData: {
				config: `/${serviceName}/${ssmStage}/search-restaurants/config`,
				secretString: `/${serviceName}/${ssmStage}/search-restaurants/secretString`,
			},
		})
	)
	.use(injectLambdaContext(logger))
	.use(captureLambdaHandler(tracer))
