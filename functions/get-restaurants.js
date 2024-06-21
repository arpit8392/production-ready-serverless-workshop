const { DynamoDB } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const middy = require('@middy/core')
const ssm = require('@middy/ssm')
const { Logger } = require('@aws-lambda-powertools/logger')
const {
	injectLambdaContext,
} = require('@aws-lambda-powertools/logger/middleware')
const logger = new Logger({ serviceName: process.env.serviceName })
const { Tracer } = require('@aws-lambda-powertools/tracer')
const {
	captureLambdaHandler,
} = require('@aws-lambda-powertools/tracer/middleware')

const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled)
const middyCacheExpiry = parseInt(process.env.middy_cache_expiry_milliseconds)

const dynamodbClient = new DynamoDB()
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient)

const tracer = new Tracer({ serviceName: process.env.serviceName })
tracer.captureAWSv3Client(dynamodb)

const { serviceName, ssmStage } = process.env

const tableName = process.env.RESTAURANTS_TABLE

const getRestaurants = async (count) => {
	logger.debug('getting restaurants from DynamoDB...', {
		count,
		tableName,
	})
	const res = await dynamodb.send(
		new ScanCommand({
			TableName: tableName,
			Limit: count,
		})
	)
	logger.debug('found restaurants', {
		count: res.Items.length,
	})
	return res.Items
}

module.exports.handler = middy(async (event, context) => {
	logger.setLogLevel('INFO')
	logger.refreshSampleRateCalculation()

	const restaurants = await getRestaurants(context.config.defaultResults)
	const response = {
		statusCode: 200,
		body: JSON.stringify(restaurants),
	}
	return response
})
	.use(
		ssm({
			cache: middyCacheEnabled,
			cacheExpiry: middyCacheExpiry,
			setToContext: true,
			fetchData: {
				config: `/${serviceName}/${ssmStage}/get-restaurants/config`,
			},
		})
	)
	.use(injectLambdaContext(logger))
	.use(captureLambdaHandler(tracer))
