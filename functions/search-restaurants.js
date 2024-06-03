const { DynamoDB } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb')

const dynamodbClient = new DynamoDB()
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient)

const defaultResults = parseInt(process.env.DEFAULT_RESULTS)
const tableName = process.env.RESTAURANTS_TABLE

const findRestaurantsByTheme = async (theme, count) => {
	console.log(`finding (up to ${count}) restaurants with theme ${theme}`)

	const resp = await dynamodb.send(
		new ScanCommand({
			TableName: tableName,
			FilterExpression: 'contains(themes, :theme)',
			ExpressionAttributeValues: { ':theme': theme },
			Limit: count,
		})
	)

	console.log(`found ${resp.Items.length} restaurants`)
	return resp.Items
}

module.exports.handler = async (event, context) => {
	const req = JSON.parse(event.body)
	const theme = req.theme
	const restaurants = await findRestaurantsByTheme(theme, defaultResults)
	const response = {
		statusCode: 200,
		body: JSON.stringify(restaurants),
	}

	return response
}
