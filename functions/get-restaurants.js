const { DynamoDB } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb')

const dynamodbClient = new DynamoDB()
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient)

const defaultResults = parseInt(process.env.DEFAULT_RESULTS)
const tableName = process.env.RESTAURANTS_TABLE

const getRestaurants = async (count) => {
	console.log(`fetching ${count} restaurants from ${tableName}`)
	const res = await dynamodb.send(
		new ScanCommand({
			TableName: tableName,
			Limit: count,
		})
	)
	console.log(`found ${res.Items.length} restaurants`)
	return res.Items
}

module.exports.handler = async (event, context) => {
	const restaurants = await getRestaurants(defaultResults)
	const response = {
		statusCode: 200,
		body: JSON.stringify(restaurants),
	}

	return response
}
