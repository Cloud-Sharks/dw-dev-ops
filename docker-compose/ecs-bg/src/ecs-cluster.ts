import * as aws from "@pulumi/aws";
import { GetSubnetsResult } from "@pulumi/aws/ec2";
import { Output } from "@pulumi/pulumi";
import {
    applyCommand,
    Command,
    generateServiceName,
    Microservice,
} from "./service-commands";
import { Deployment } from "./Deployment";
import { Service } from "./Service";

interface ServiceConfig {
    vpcId: Output<string>;
    cluster: aws.ecs.Cluster;
    listener: aws.lb.Listener;
    securityGroups: aws.ec2.SecurityGroup[];
    executionRole: aws.iam.Role;
}
// define the default vpc info to deploy
const vpc = aws.ec2.getVpcOutput({ default: true });
const subnets = getSubnets(vpc.id);
// create a cluster
const cluster = new aws.ecs.Cluster("dw-ecs-cluster", {
    name: "dw-ecs-cluster",
});

const securityGroup = generateSecurityGroup(vpc.id);
const executionRole = generateExecutionRole();

const loadBalancer = createLoadBalancer("dw-ecs-lb", [securityGroup], subnets);
const listener = createListener("dw-ecs-listener", 80, loadBalancer);

export const createCluster = async () => {
    const createServiceConfig: ServiceConfig = {
        vpcId: vpc.id,
        securityGroups: [securityGroup],
        cluster,
        executionRole,
        listener,
    };

    createService({
        deployment: Deployment.Green,
        service: Service.Underwriter,
        isTargeted: false,
    });

    // TODO: Get input from function
    let commandResults = await applyCommand(Command.Create, {
        clusterArn: cluster.arn,
        deployment: Deployment.Blue,
        service: Service.Underwriter,
    });

    // Set targets
    commandResults = commandResults.reduce(
        (acc, ms) => setTarget(acc, ms.service, Deployment.Blue),
        commandResults,
    );

    const services = commandResults.map((microservice) =>
        createService(microservice),
    );
};

export const createService = (microservice: Microservice): aws.ecs.Service => {
    const serviceName = generateServiceName(
        microservice.service,
        microservice.deployment,
    );

    // target group for port 80
    const serviceTg = new aws.lb.TargetGroup(serviceName, {
        port: 80,
        protocol: "HTTP",
        targetType: "ip",
        vpcId: vpc.id,
    });

    const taskDefinition = new aws.ecs.TaskDefinition(serviceName, {
        family: serviceName,
        cpu: "256",
        memory: "512",
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        executionRoleArn: executionRole.arn,
        containerDefinitions: JSON.stringify([
            {
                name: serviceName,
                image: "nginx",
                portMappings: [
                    {
                        containerPort: 80,
                        hostPort: 80,
                        protocol: "tcp",
                    },
                ],
            },
        ]),
    });

    const svc = new aws.ecs.Service(serviceName, {
        name: serviceName,
        cluster: cluster.arn,
        desiredCount: 1,
        launchType: "FARGATE",
        taskDefinition: taskDefinition.arn,
        networkConfiguration: {
            assignPublicIp: true,
            subnets: getSubnets(vpc.id).ids,
            securityGroups: [securityGroup].map((s) => s.id),
        },
        loadBalancers: [
            {
                targetGroupArn: serviceTg.arn,
                containerName: serviceName,
                containerPort: 80,
            },
        ],
    });

    generateListenerRule(microservice, serviceTg);

    return svc;
};

export function setTarget(
    services: Microservice[],
    service: Service,
    target: Deployment,
) {
    return services.map((svc) => {
        if (svc.service === service && svc.deployment === target) {
            svc.isTargeted = true;
        } else if (svc.service === service) {
            svc.isTargeted = false;
        }

        return svc;
    });
}

function generateListenerRule(
    microservice: Microservice,
    serviceTg: aws.lb.TargetGroup,
) {
    const path = microservice.isTargeted ? `/${microservice.service}s` : "";

    return new aws.lb.ListenerRule(microservice.service, {
        listenerArn: listener.arn,
        actions: [
            {
                type: "forward",
                targetGroupArn: serviceTg.arn,
            },
        ],
        conditions: [
            {
                pathPattern: {
                    values: [""],
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
