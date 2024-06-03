const {
	CognitoIdentityProviderClient,
	AdminDeleteUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider')

const an_authenticated_user = async (user) => {
	const cognito = new CognitoIdentityProviderClient()

	let req = {
		UserPoolId: process.env.COGNITO_USER_POOL_ID,
		Username: user.username,
	}
	await cognito.send(new AdminDeleteUserCommand(req))

	console.log(`[${user.username}] - user deleted`)
}

module.exports = {
	an_authenticated_user,
}
