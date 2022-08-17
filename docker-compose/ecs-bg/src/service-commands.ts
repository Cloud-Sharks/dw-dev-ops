import * as aws from "@pulumi/aws";
import { Output } from "@pulumi/pulumi";
import { setTarget } from "./ecs-cluster";
import {
    Action,
    applyCommandArgs,
    Command,
    Deployment,
    GetEscServiceResult,
    Microservice,
    Service,
} from "./types";

async function getExistingServices(
    clusterArn: Output<string>,
): Promise<aws.ecs.GetServiceResult[]> {
    const deployments = [Deployment.Blue, Deployment.Green];
    const services = [
        Service.Bank,
        Service.User,
        Service.Transaction,
        Service.Underwriter,
    ];
    const possibleMicroservices: Microservice[] = services.flatMap((service) =>
        deployments.map((deployment) => ({
            deployment,
            service,
            isTargeted: false,
        })),
    );

    const getSvc = (microservice: Microservice): Promise<GetEscServiceResult> =>
        new Promise((res, rej) => {
            return clusterArn
                .apply((clusterArn) =>
                    getEcsService(clusterArn, microservice).catch(() => null),
                )
                .apply((svc) => {
                    if (svc?.result) res(svc);
                    else rej();
                });
        });

    const existingServices: GetEscServiceResult[] = [];

    for (const microservice of possibleMicroservices) {
        const svc = await getSvc(microservice).catch(() => null);
        if (svc?.result) existingServices.push(svc);
    }

    return existingServices.map((svc) => svc.result!);
}

function serviceToMicroservice(
    service: aws.ecs.GetServiceResult,
): Microservice {
    const [svc, deployment] = service.serviceName.split("-");

    return {
        service: svc as Service,
        deployment: deployment as Deployment,
        isTargeted: false,
    };
}

export async function applyCommand(command: Command, args: applyCommandArgs) {
    const services = await getExistingServices(args.clusterArn);
    let jsonServices: Microservice[] = services.map(serviceToMicroservice);

    const filterOutService = (services: aws.ecs.GetServiceResult[]) =>
        services
            .filter((svc) => {
                const microservice: Microservice = {
                    deployment: args.deployment,
                    service: args.service,
                    isTargeted: false,
                };

                return svc.serviceName !== generateServiceName(microservice);
            })
            .map(serviceToMicroservice);

    switch (command.action) {
        case Action.Create:
            jsonServices.push({
                service: args.service,
                deployment: args.deployment,
                isTargeted: false,
            });
            break;
        case Action.Remove:
            jsonServices = filterOutService(services);
            break;
        case Action.Point:
            jsonServices = setTarget(
                jsonServices,
                command.service,
                command.deployment,
            );
            break;
    }

    return jsonServices;
}

export function generateServiceName(microservice: Microservice) {
    return `${microservice.service}-${microservice.deployment}`;
}

export async function getEcsService(
    clusterArn: string,
    microservice: Microservice,
): Promise<GetEscServiceResult> {
    try {
        const svc = await aws.ecs.getService({
            clusterArn,
            serviceName: generateServiceName(microservice),
        });

        if (svc.desiredCount === 0) throw new Error("Desired count is 0");

        return { err: null, result: svc };
    } catch (error) {
        return { err: error, result: null };
    }
}
