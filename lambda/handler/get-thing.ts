import {APIGatewayProxyEvent, APIGatewayProxyResult, Handler} from 'aws-lambda';
import {defaultHeaders} from "../constants";

type UnsafeMetadata = {
    capabilities: Record<string, string>;
}

function hasCapability(requiredCapability: string, unsafeMetadata: UnsafeMetadata): boolean {
    if (!(requiredCapability in unsafeMetadata.capabilities)) {
        return false;
    }
    const expirationDate = new Date(unsafeMetadata.capabilities[requiredCapability]);
    return new Date() <= expirationDate;
}


export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (event) => {
    try {
        if (!event?.requestContext?.authorizer) return {
            statusCode: 401,
            headers: defaultHeaders,
            body: JSON.stringify({error: 'NOT_AUTHENTICATED'})
        };

        const userId = event.requestContext.authorizer.principalId as string;

        const unsafeMetadata = event.requestContext.authorizer.unsafeMetadata
            ? JSON.parse(event.requestContext.authorizer.unsafeMetadata) as UnsafeMetadata
            : null;

        const requiredCapability = 'eap';
        if (!unsafeMetadata || !hasCapability(requiredCapability, unsafeMetadata)) return {
            statusCode: 403,
            headers: defaultHeaders,
            body: JSON.stringify({error: 'NOT_AUTHORISED'})
        };

        return {
            statusCode: 200,
            headers: defaultHeaders,
            body: JSON.stringify({data: `fetched with eap capability by ${userId}`})
        }
    } catch (e) {
        console.log(e);
        return {
            statusCode: 500,
            headers: defaultHeaders,
            body: JSON.stringify({error: 'REQUEST_FAILURE'})
        };
    }
};
