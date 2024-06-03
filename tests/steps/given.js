const {
	CognitoIdentityProviderClient,
	AdminCreateUserCommand,
	AdminInitiateAuthCommand,
	AdminRespondToAuthChallengeCommand,
} = require('@aws-sdk/client-cognito-identity-provider')
const chance = require('chance').Chance()
const random_password = () => {
	// needs number, special char, upper and lower case
	return `${chance.string({ length: 8 })}B!gM0uth`
}

const an_authenticated_user = async () => {
	const cognito = new CognitoIdentityProviderClient()

	const userPoolId = process.env.COGNITO_USER_POOL_ID
	const clientId = process.env.COGNITO_SERVER_CLIENT_ID

	const firstName = chance.first({ nationality: 'en' })
	const lastName = chance.last({ nationality: 'en' })
	const suffix = chance.string({
		length: 8,
		pool: 'abcdefghijklmnopqrstuvwxyz',
	})
	const username = `test-${firstName}-${lastName}-${suffix}`
	const password = random_password()
	const email = `${firstName}-${lastName}@big-mouth.com`

	const createReq = new AdminCreateUserCommand({
		UserPoolId: userPoolId,
		Username: username,
		MessageAction: 'SUPPRESS',
		TemporaryPassword: password,
		UserAttributes: [
			{ Name: 'given_name', Value: firstName },
			{ Name: 'family_name', Value: lastName },
			{ Name: 'email', Value: email },
		],
	})

	await cognito.send(createReq)

	console.log(`[${username}] - user is created`)

	const req = new AdminInitiateAuthCommand({
		UserPoolId: userPoolId,
		ClientId: clientId,
		AuthFlow: 'ADMIN_NO_SRP_AUTH',
		AuthParameters: {
			USERNAME: username,
			PASSWORD: password,
		},
	})

	const resp = await cognito.send(req)

	console.log(`[${username}] - initialized auth flow`)

	const challengeReq = new AdminRespondToAuthChallengeCommand({
		UserPoolId: userPoolId,
		ClientId: clientId,
		ChallengeName: resp.ChallengeName,
		ChallengeResponses: {
			USERNAME: username,
			NEW_PASSWORD: random_password(),
		},
		Session: resp.Session,
	})

	const challengeResp = await cognito.send(challengeReq)

	console.log(`[${username}] - responded to auth challenge`)

	return {
		username,
		firstName,
		lastName,
		idToken: challengeResp.AuthenticationResult.IdToken,
	}
}

module.exports = {
	an_authenticated_user,
}
