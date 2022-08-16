import * as fs from "fs";
import { Microservice } from "./types";

export function envToObject(envPath: string) {
    const content = fs.readFileSync(envPath, { encoding: "utf-8" });
    const isKeyPair = (input: string) => /^.+?=.+$/.test(input);

    return content
        .split("\n")
        .filter(isKeyPair)
        .map((envKeyVal) => {
            const [name, value] = envKeyVal.split("=").map((v) => v.trim());

            return {
                name,
                value,
            };
        });
}

export function getImageName(envPath: string, microservice: Microservice) {
    const env = envToObject(envPath);

    const accountId = env.find((e) => e.name === "AWS_ACCOUNT_ID");
    const ecrRegion = env.find((e) => e.name === "ECR_REGION");

    const image = `${accountId?.value}.dkr.ecr.${ecrRegion?.value}.amazonaws.com/dw-${microservice.service}-microservice:stable`;
    return image;
}
