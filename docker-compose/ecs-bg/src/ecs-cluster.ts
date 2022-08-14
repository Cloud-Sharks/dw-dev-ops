import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { Output } from "@pulumi/pulumi";

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

const { loadBalancer, listener } = createLoadBalancer(
  "dw-ecs-lb",
  "dw-ecs-listener",
);

// target group for port 80
const targetGroupA = new aws.lb.TargetGroup("example", {
  port: 80,
  protocol: "HTTP",
  targetType: "ip",
  vpcId: vpc.id,
});

const listenerRule = new aws.lb.ListenerRule("rule", {
  listenerArn: listener.arn,
  actions: [
    {
      type: "forward",
      targetGroupArn: targetGroupA.arn,
    },
  ],
  conditions: [
    {
      pathPattern: {
        values: ["/test"],
      },
    },
  ],
});

const taskDefinition = new aws.ecs.TaskDefinition("example", {
  family: "exampleA",
  cpu: "256",
  memory: "512",
  networkMode: "awsvpc",
  requiresCompatibilities: ["FARGATE"],
  executionRoleArn: executionRole.arn,
  containerDefinitions: JSON.stringify([
    {
      name: "my-app",
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

const svcA = new aws.ecs.Service("example", {
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
      targetGroupArn: targetGroupA.arn,
      containerName: "my-app",
      containerPort: 80,
    },
  ],
});

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

function createLoadBalancer(
  lbName: string,
  listenerName: string,
): { loadBalancer: aws.lb.LoadBalancer; listener: aws.lb.Listener } {
  const loadBalancer = new aws.lb.LoadBalancer(lbName, {
    name: lbName,
    securityGroups: [securityGroup.id],
    subnets: subnets.ids,
  });

  const listener = new aws.lb.Listener(listenerName, {
    loadBalancerArn: loadBalancer.arn,
    port: 80,
    defaultActions: [
      {
        type: "fixed-response",
        fixedResponse: {
          statusCode: "404",
          contentType: "text/plain",
        },
      },
    ],
  });

  return {
    loadBalancer,
    listener,
  };
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
