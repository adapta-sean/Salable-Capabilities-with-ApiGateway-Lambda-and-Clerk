import {APIGatewayProxyEvent, APIGatewayProxyResult, Handler} from 'aws-lambda';
import {clerkClient} from "@clerk/clerk-sdk-node";
import {defaultHeaders} from "../constants";

if (!process.env.CLERK_PUBLISHABLE_KEY) throw new Error('Missing CLERK_PUBLISHABLE_KEY');
if (!process.env.CLERK_SECRET_KEY) throw new Error('Missing CLERK_SECRET_KEY');
if (!process.env.SALABLE_READ_LICENSE) throw new Error('Missing SALABLE_READ_LICENSE');
if (!process.env.SALABLE_PRODUCT_UUID) throw new Error('Missing SALABLE_PRODUCT_UUID');

export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (event) => {
    const userId = event?.requestContext?.authorizer?.principalId;
    if (!userId) return {
        statusCode: 401,
        headers: defaultHeaders,
        body: JSON.stringify({error: 'NOT_AUTHENTICATED'})
    };

    try {
        const response = await fetch(
            `https://api.salable.app/licenses/check?productUuid=${process.env.SALABLE_PRODUCT_UUID}&granteeIds=${userId}?grace=1`, {
                headers: {
                    'x-api-key': process.env.SALABLE_READ_LICENSE!,
                    'version': 'v2'
                }
            });

        if (response.status === 200) {
            const data = await response.json();

            if (data.capabilities) {
                await clerkClient.users.updateUserMetadata(userId, {
                    publicMetadata: { capabilities: data.capabilitiesEndDates },
                });
            }
        }

        if (response.status === 204) {
            console.log('NO LICENSE')
            // Todo: handle case when no license found
        }

        return {
            statusCode: 204,
            headers: defaultHeaders,
            body: ''
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

