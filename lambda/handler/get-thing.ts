import {APIGatewayProxyEvent, APIGatewayProxyResult, Handler} from 'aws-lambda';
import {defaultHeaders} from "../constants";

type UnsafeMetadata = {
    capabilities: string[]
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

        if (!unsafeMetadata || !unsafeMetadata.capabilities.includes('eap')) return {
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
