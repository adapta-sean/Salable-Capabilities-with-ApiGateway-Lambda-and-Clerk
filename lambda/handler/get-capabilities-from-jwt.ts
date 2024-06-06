import {APIGatewayProxyEvent, APIGatewayProxyResult, Handler} from 'aws-lambda';
import {defaultHeaders} from "../constants";

type UnsafeMetadata = {
    capabilities: Record<string, string>;
}

function hasCapability(requiredCapability: string, capabilities: Record<string, string>): boolean {
    if (!(requiredCapability in capabilities)) {
        return false;
    }
    const expirationDate = new Date(capabilities[requiredCapability]);
    return new Date() <= expirationDate;
}

/**
 * This endpoint is used purely to demonstrate that capabilities are available to the api via the jwt claims.
 * Requires non-expired the `eap` capability to access
 * @param event
 */
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

        if (!unsafeMetadata || !hasCapability('eap', unsafeMetadata.capabilities)) return {
            statusCode: 403,
            headers: defaultHeaders,
            body: JSON.stringify({error: 'NOT_AUTHORISED'})
        };

        return {
            statusCode: 200,
            headers: defaultHeaders,
            body: JSON.stringify({
                message: `${userId} has access to these capabilities in api requests. Capabilities are extracted from the Clerk's jwt claims unsafeMetadata property`,
                capabilities: unsafeMetadata.capabilities
            })
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
