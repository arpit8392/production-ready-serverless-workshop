const {
	EventBridgeClient,
	PutEventsCommand,
} = require('@aws-sdk/client-eventbridge')
const chance = require('chance').Chance()
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

const tracer = new Tracer({ serviceName: process.env.serviceName })
tracer.captureAWSv3Client(eventBridge)

const logger = new Logger({ serviceName: process.env.serviceName })

const busName = process.env.bus_name

module.exports.handler = middy(async (event) => {
	logger.setLogLevel('INFO')
	logger.refreshSampleRateCalculation()

	const restaurantName = JSON.parse(event.body).restaurantName

	const orderId = chance.guid()
	logger.debug('placing order...', { orderId, restaurantName })

	const putEvent = new PutEventsCommand({
		Entries: [
			{
				Detail: JSON.stringify({
					orderId,
					restaurantName,
				}),
				DetailType: 'order_placed',
				Source: 'big-mouth',
				EventBusName: busName,
			},
		],
	})

	await eventBridge.send(putEvent)

	logger.debug(`published event into EventBridge`, {
		eventType: 'order_placed',
		busName,
	})

	const response = {
		statusCode: 200,
		body: JSON.stringify({ orderId }),
	}

	return response
})
	.use(injectLambdaContext(logger))
	.use(captureLambdaHandler(tracer))
