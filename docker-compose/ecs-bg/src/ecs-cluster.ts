import * as aws from "@pulumi/aws";
import * as path from "path";
import { GetSubnetsResult } from "@pulumi/aws/ec2";
import { Output } from "@pulumi/pulumi";
import { applyCommand, generateServiceName } from "./service-commands";
import { envToObject, getImageName } from "./util";
import {
    Command,
    Deployment,
    Microservice,
    Service,
    ServiceConfig,
} from "./types";

export const updateCluster = async (command?: Command) => {
    // define the default vpc info to deploy
    const vpc = aws.ec2.getVpcOutput({ default: true });
    const subnets = getSubnets(vpc.id);
    // create a cluster
    const cluster = new aws.ecs.Cluster("dw-ecs-cluster", {
        name: "dw-ecs-cluster",
    });

    const securityGroup = generateSecurityGroup(vpc.id);
    const executionRole = generateExecutionRole();

    const loadBalancer = createLoadBalancer(
        "dw-ecs-lb",
        [securityGroup],
        subnets,
    );
    const listener = createListener("dw-ecs-listener", 80, loadBalancer);

    if (!command) return;

    let commandResults = await applyCommand(command, {
        clusterArn: cluster.arn,
        deployment: command.deployment,
        service: command.service,
    });

    // Set targets
    commandResults = commandResults.reduce((acc, ms) => {
        if (ms.service === command.service) {
            return acc;
        }

        return setTarget(acc, ms.service, Deployment.Blue);
    }, commandResults);

    const createServiceConfig: ServiceConfig = {
        vpcId: vpc.id,
        securityGroups: [securityGroup],
        cluster,
        executionRole,
        listener,
    };

    for (const ms of commandResults) {
        createService(ms, createServiceConfig);
    }
};

export const createService = (
    microservice: Microservice,
    config: ServiceConfig,
): aws.ecs.Service => {
    const serviceName = generateServiceName(microservice);

    // target group for port 80
    const serviceTg = new aws.lb.TargetGroup(serviceName, {
        name: serviceName,
        port: 80,
        protocol: "HTTP",
        targetType: "ip",
        vpcId: config.vpcId,
    });

    const envPath = path.join(__dirname, ".env");
    const env = envToObject(envPath);

    const taskDefinition = new aws.ecs.TaskDefinition(serviceName, {
        family: serviceName,
        cpu: "2048",
        memory: "2048",
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        executionRoleArn: config.executionRole.arn,
        containerDefinitions: JSON.stringify([
            {
                name: serviceName,
                image: getImageName(envPath, microservice),
                portMappings: [
                    {
                        containerPort: 80,
                        hostPort: 80,
                        protocol: "tcp",
                    },
                ],
                environment: env,
            },
        ]),
    });

    const svc = new aws.ecs.Service(serviceName, {
        name: serviceName,
        cluster: config.cluster.arn,
        desiredCount: 1,
        launchType: "FARGATE",
        taskDefinition: taskDefinition.arn,
        networkConfiguration: {
            assignPublicIp: true,
            subnets: getSubnets(config.vpcId).ids,
            securityGroups: config.securityGroups.map((s) => s.id),
        },
        loadBalancers: [
            {
                targetGroupArn: serviceTg.arn,
                containerName: serviceName,
                containerPort: 80,
            },
        ],
    });

    generateListenerRule(microservice, serviceTg, config);

    return svc;
};

export function setTarget(
    services: Microservice[],
    service: Service,
    target: Deployment,
) {
    const isSingle = (service: Service) => {
        return services.filter((svc) => svc.service === service).length === 1;
    };

    const targets = services.map((svc) => {
        if (isSingle(svc.service)) {
            svc.isTargeted = true;
        } else if (svc.service === service && svc.deployment === target) {
            svc.isTargeted = true;
        } else if (svc.service === service) {
            svc.isTargeted = false;
        }

        return svc;
    });

    return targets;
}

function generateListenerRule(
    microservice: Microservice,
    serviceTg: aws.lb.TargetGroup,
    config: ServiceConfig,
) {
    const path = microservice.isTargeted ? `/${microservice.service}s` : "NA";
    const name = generateServiceName(microservice);

    return new aws.lb.ListenerRule(name, {
        listenerArn: config.listener.arn,
        actions: [
            {
                type: "forward",
                targetGroupArn: serviceTg.arn,
            },
        ],
        conditions: [
            {
                pathPattern: {
                    values: [path],
                },
            },
        ],
    });
}

function generateSecurityGroup(vpcId: Output<string>): aws.ec2.SecurityGroup {
    return new aws.ec2.SecurityGroup("dw-ecs-security-group", {
        vpcId: vpcId,
        description: "HTTP access",
        ingress: [
            {
                protocol: "tcp",
                fromPort: 80,
                toPort: 80,
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
        egress: [
            {
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
    });
}

function createLoadBalancer(
    name: string,
    securityGroups: aws.ec2.SecurityGroup[],
    subnets: Output<GetSubnetsResult>,
): aws.lb.LoadBalancer {
    return new aws.lb.LoadBalancer(name, {
        name,
        securityGroups: securityGroups.map((g) => g.id),
        subnets: subnets.ids,
    });
}

function createListener(
    name: string,
    port: number,
    loadBalancer: aws.lb.LoadBalancer,
) {
    return new aws.lb.Listener(name, {
        loadBalancerArn: loadBalancer.arn,
        port,
        defaultActions: [
            {
                type: "fixed-response",
                fixedResponse: {
                    statusCode: "404",
                    contentType: "text/plain",
                    messageBody: "Content not found",
                },
            },
        ],
    });
}

function generateExecutionRole(): aws.iam.Role {
    const role = new aws.iam.Role("ecs-execution-role", {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "ecs-tasks.amazonaws.com",
        }),
    });

    new aws.iam.RolePolicyAttachment("ecs-execution-role-attachment", {
        role: role.name,
        policyArn:
            "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    });

    return role;
}

function getSubnets(vpcId: Output<string>): Output<aws.ec2.GetSubnetsResult> {
    return aws.ec2.getSubnetsOutput({
        filters: [
            {
                name: "vpc-id",
                values: [vpcId],
            },
        ],
    });
}
