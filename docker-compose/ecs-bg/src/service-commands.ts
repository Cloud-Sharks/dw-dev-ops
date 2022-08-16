import { Deployment } from "./Deployment";
import { Service } from "./Service";
import * as aws from "@pulumi/aws";
import { Output } from "@pulumi/pulumi";

export enum Command {
    Create = "create",
    Destroy = "destroy",
    Swap = "swap",
}

interface applyCommandArgs {
    clusterArn: Output<string>;
    service: Service;
    deployment: Deployment;
}

interface Microservice {
    service: Service;
    deployment: Deployment;
}

interface GetEscServiceResult {
    err: any | null;
    result: aws.ecs.GetServiceResult | null;
}

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

    const existingServices: GetEscServiceResult[] = [];

    const getService = (
        service: Service,
        deployment: Deployment,
    ): Promise<GetEscServiceResult> =>
        new Promise((res, rej) => {
            return clusterArn.apply(async (clusterArn) => {
                const svc = await getEcsService(
                    clusterArn,
                    service,
                    deployment,
                );

                if (svc.err) {
                    rej(svc.err);
                }

                if (svc.result?.desiredCount == 0) {
                    rej("Desired count is 0");
                }

                res(svc);
            });
        });

    for (const service of services) {
        for (const deployment of deployments) {
            await getService(service, deployment).then(
                (res) => existingServices.push(res),
                (err) => {},
            );
        }
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
    };
}

export async function applyCommand(command: Command, args: applyCommandArgs) {
    const services = await getExistingServices(args.clusterArn);
    let jsonServices: Microservice[] = services.map(serviceToMicroservice);

    const filterOutService = (services: aws.ecs.GetServiceResult[]) =>
        services
            .filter(
                (svc) =>
                    svc.serviceName ===
                    generateServiceName(args.service, args.deployment),
            )
            .map(serviceToMicroservice);

    switch (command) {
        case Command.Create:
            jsonServices.push({
                service: args.service,
                deployment: args.deployment,
            });
            break;
        case Command.Destroy:
            jsonServices = filterOutService(services);
            break;
        case Command.Swap:
            break;
    }

    return jsonServices;
}

export function swapListenerRuleTg(service: Service) {
    // const x = {
    //     listenerArn: config.listener.arn,
    //     actions: [
    //         {
    //             type: "forward",
    //             targetGroupArn: serviceTg.arn,
    //         },
    //     ],
    //     conditions: [
    //         {
    //             pathPattern: {
    //                 values: [`/${serviceName}`],
    //             },
    //         },
    //     ],
    // };
    // aws.lb.ListenerRule.get();
}

export function generateServiceName(service: Service, deployment: Deployment) {
    return `${service}-${deployment}`;
}

export async function getEcsService(
    clusterArn: string,
    service: Service,
    deployment: Deployment,
): Promise<GetEscServiceResult> {
    return await aws.ecs
        .getService({
            clusterArn,
            serviceName: generateServiceName(service, deployment),
        })
        .then(
            (res) => ({ err: null, result: res }),
            (err) => ({ err, result: null }),
        );
}
