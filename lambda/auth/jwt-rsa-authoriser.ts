import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import util from 'util';

if (!process.env.AUDIENCE) throw new Error('Missing AUDIENCE');
if (!process.env.ISSUER) throw new Error('Missing ISSUER');
if (!process.env.ACCOUNT) throw new Error('Missing ACCOUNT');

const JWKS_URI = `${process.env.ISSUER}/.well-known/jwks.json`;

const getPolicyDocument = (effect: 'Allow' | 'Deny', resource: string) => ({
    Version: '2012-10-17',
    Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
    }]
});

const getToken = (params: any) => {
    if (!params.type || params.type !== 'TOKEN') {
        throw new Error('Expected "event.type" parameter to have value "TOKEN"');
    }

    const tokenString = params.authorizationToken;
    if (!tokenString) {
        throw new Error('Expected "event.authorizationToken" parameter to be set');
    }

    const match = tokenString.match(/^Bearer (.*)$/);
    if (!match || match.length < 2) {
        throw new Error(`Invalid Authorization token - ${tokenString} does not match "Bearer .*"`);
    }
    return match[1];
};

const jwtOptions = {
    audience: process.env.AUDIENCE,
    issuer: process.env.ISSUER
};

const client = jwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    jwksUri: JWKS_URI
});

const authenticate = async (event: any) => {
    const token = getToken(event);

    const decoded = jwt.decode(token, {complete: true});
    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('invalid token');
    }

    const getSigningKey = util.promisify(client.getSigningKey);
    return getSigningKey(decoded.header.kid)
        .then((key: any) => {
            const signingKey = key?.publicKey || key?.rsaPublicKey;
            return jwt.verify(token, signingKey, jwtOptions);
        })
        .then((claims: any) =>
            ({
                principalId: claims.sub,
                // policyDocument: getPolicyDocument('Allow', event.methodArn), // Todo: figure out why this isn't working, currently causes 403 response
                policyDocument: getPolicyDocument('Allow', '*'),
                context: {
                    unsafeMetadata: claims.unsafeMetadata ? JSON.stringify(claims.unsafeMetadata) : '',
                }
            })
        );
};


export default authenticate;