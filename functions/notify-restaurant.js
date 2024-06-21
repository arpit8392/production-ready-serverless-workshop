const {
	EventBridgeClient,
	PutEventsCommand,
} = require('@aws-sdk/client-eventbridge')
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns')
const { makeIdempotent } = require('@aws-lambda-powertools/idempotency')
const {
	DynamoDBPersistenceLayer,
} = require('@aws-lambda-powertools/idempotency/dynamodb')
const { Logger } = require('@aws-lambda-powertools/logger')
const {
	injectLambdaContext,
} = require('@aws-lambda-powertools/logger/middleware')
const middy = require('@middy/core')
const { Tracer } = require('@aws-lambda-powertools/tracer')
const {
	captureLambdaHandler,
} = require('@aws-lambda-powertools/tracer/middleware')

const eventBridge = new EventBridgeClient()
const sns = new SNSClient()

const tracer = new Tracer({ serviceName: process.env.serviceName })
tracer.captureAWSv3Client(eventBridge)
tracer.captureAWSv3Client(sns)

const logger = new Logger({ serviceName: process.env.serviceName })

const busName = process.env.bus_name
const topicArn = process.env.restaurant_notification_topic

const persistenceStore = new DynamoDBPersistenceLayer({
	tableName: process.env.idempotency_table,
})

const handler = async (event) => {
	logger.setLogLevel('INFO')
	logger.refreshSampleRateCalculation()

	const order = event.detail
	const publishCmd = new PublishCommand({
		Message: JSON.stringify(order),
		TopicArn: topicArn,
	})
	await sns.send(publishCmd)

	const { restaurantName, orderId } = order
	// console.log(`notified restaurant [${restaurantName}] of order [${orderId}]`)
	logger.debug('notified restaurant', { orderId, restaurantName })

	const putEventsCmd = new PutEventsCommand({
		Entries: [
			{
				Source: 'big-mouth',
				DetailType: 'restaurant_notified',
				Detail: JSON.stringify(order),
				EventBusName: busName,
			},
		],
	})
	await eventBridge.send(putEventsCmd)

	// console.log(`published 'restaurant_notified' event to EventBridge`)
	logger.debug(`published event into EventBridge`, {
		eventType: 'restaurant_notified',
		busName,
	})

	return orderId
}

module.exports.handler = middy(makeIdempotent(handler, { persistenceStore }))
	.use(injectLambdaContext(logger))
	.use(captureLambdaHandler(tracer))
