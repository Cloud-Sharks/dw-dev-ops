import * as aws from "@pulumi/aws";
import { Deployment } from "./Deployment";
import { Service } from "./Service";

// create a cluster
const cluster = new aws.ecs.Cluster("example");

// define the default vpc info to deploy
const vpc = aws.ec2.getVpcOutput({ default: true });
const subnets = aws.ec2.getSubnetsOutput({
  filters: [
    {
      name: "vpc-id",
      values: [vpc.id],
    },
  ],
});

const securityGroup = port80SecurityGroup();
const executionRole = generateExecutionRole();

const loadBalancer = createLoadBalancer("dw-ecs-lb");
const listener = createListener("dw-ecs-listener", 80, loadBalancer);

createService(Service.Bank, Deployment.Green);
createService(Service.Bank, Deployment.Blue);

function createService(
  service: Service,
  deployment: Deployment,
): aws.ecs.Service {
  const serviceName = `${service}-${deployment}`;

  // target group for port 80
  const serviceTg = new aws.lb.TargetGroup(serviceName, {
    port: 80,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: vpc.id,
  });

  const listenerRule = new aws.lb.ListenerRule(serviceName, {
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
    cluster: cluster.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    taskDefinition: taskDefinition.arn,
    networkConfiguration: {
      assignPublicIp: true,
      subnets: subnets.ids,
      securityGroups: [securityGroup.id],
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

function port80SecurityGroup(): aws.ec2.SecurityGroup {
  return new aws.ec2.SecurityGroup("example", {
    vpcId: vpc.id,
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

function createLoadBalancer(name: string): aws.lb.LoadBalancer {
  return new aws.lb.LoadBalancer(name, {
    name,
    securityGroups: [securityGroup.id],
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

export const url = loadBalancer.dnsName;
