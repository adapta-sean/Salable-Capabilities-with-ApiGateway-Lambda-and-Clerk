import authenticate from './jwt-rsa-authoriser';


export const handler = async (event: any, context: any) => {
    try {
        return await authenticate(event);
    } catch (err) {
        return context.fail('Unauthorized');
    }
};