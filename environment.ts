import {config} from "dotenv";
import * as process from "process";

config();

interface Environment {
    STAGE: string
    DOMAIN_NAMES: string
    REGION: string
    ACCOUNT: string
    AUDIENCE: string
    ISSUER: string
    CLERK_SECRET_KEY: string
    CLERK_PUBLISHABLE_KEY: string
    SALABLE_READ_LICENSE: string
    SALABLE_WRITE_LICENSE: string
    SALABLE_PRODUCT_UUID: string
    SALABLE_PRO_PLAN_UUID: string
}

const envs: Environment = {
    STAGE: process.env.STAGE ?? '',
    DOMAIN_NAMES: process.env.DOMAIN_NAMES ?? '',
    REGION: process.env.REGION ?? '',
    ACCOUNT: process.env.ACCOUNT ?? '',
    AUDIENCE: process.env.AUDIENCE ?? '',
    ISSUER: process.env.ISSUER ?? '',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? '',
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY ?? '',
    SALABLE_READ_LICENSE: process.env.SALABLE_READ_LICENSE ?? '',
    SALABLE_WRITE_LICENSE: process.env.SALABLE_WRITE_LICENSE ?? '',
    SALABLE_PRODUCT_UUID: process.env.SALABLE_PRODUCT_UUID ?? '',
    SALABLE_PRO_PLAN_UUID: process.env.SALABLE_PRO_PLAN_UUID ?? '',
};

for (const [key, value] of Object.entries(envs)) {
    if (!value) throw new Error(`Missing env: ${key}`);
}

export default envs;