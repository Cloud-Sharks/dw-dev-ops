import * as aws from "@pulumi/aws";
import { GetSubnetsResult } from "@pulumi/aws/ec2";
import { Output } from "@pulumi/pulumi";
import { Deployment } from "./Deployment";
import { Service } from "./Service";

interface ServiceConfig {
  vpcId: Output<string>;
  cluster: aws.ecs.Cluster;
  listener: aws.lb.Listener;
  securityGroups: aws.ec2.SecurityGroup[];
  executionRole: aws.iam.Role;
}

// create a cluster
const cluster = new aws.ecs.Cluster("example");

// define the default vpc info to deploy
const vpc = aws.ec2.getVpcOutput({ default: true });
const subnets = getSubnets(vpc.id);
const securityGroup = generateSecurityGroup(vpc.id);
const executionRole = generateExecutionRole();

const loadBalancer = createLoadBalancer("dw-ecs-lb", [securityGroup], subnets);
const listener = createListener("dw-ecs-listener", 80, loadBalancer);

const createServiceConfig: ServiceConfig = {
  vpcId: vpc.id,
  securityGroups: [securityGroup],
  cluster,
  executionRole,
  listener,
};

createService(Service.Bank, Deployment.Green, createServiceConfig);
createService(Service.Bank, Deployment.Blue, createServiceConfig);

function createService(
  service: Service,
  deployment: Deployment,
  config: ServiceConfig,
): aws.ecs.Service {
  const serviceName = `${service}-${deployment}`;

  // target group for port 80
  const serviceTg = new aws.lb.TargetGroup(serviceName, {
    port: 80,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: config.vpcId,
  });

  const listenerRule = new aws.lb.ListenerRule(serviceName, {
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
          values: [`/${serviceName}`],
        },
      },
    ],
  });

  const taskDefinition = new aws.ecs.TaskDefinition(serviceName, {
    family: serviceName,
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: config.executionRole.arn,
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

  return svc;
}

function generateSecurityGroup(vpcId: Output<string>): aws.ec2.SecurityGroup {
  return new aws.ec2.SecurityGroup("example", {
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
  const role = new aws.iam.Role("example", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "ecs-tasks.amazonaws.com",
    }),
  });

  new aws.iam.RolePolicyAttachment("example", {
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

export const url = loadBalancer.dnsName;
