import * as aws from "@pulumi/aws";
import { Service } from "./Service";
import { Deployment } from "./Deployment";
import * as pulumi from "@pulumi/pulumi";

export const vpc = aws.ec2.getVpcOutput({ default: true });

// create a cluster
const cluster = new aws.ecs.Cluster("dw-ecs");

// define the default vpc info to deploy
const subnets = aws.ec2.getSubnetsOutput({
  filters: [
    {
      name: "vpc-id",
      values: [vpc.id],
    },
  ],
});

// create the security groups
const securityGroup = new aws.ec2.SecurityGroup("dw-ecs-sg", {
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

const bankBlueTg = createFargateTask(Service.Bank, Deployment.Blue);
const bankGreenTg = createFargateTask(Service.Bank, Deployment.Green);

// define a loadbalancer
const lb = new aws.lb.LoadBalancer("dw-ecs-lb", {
  securityGroups: [securityGroup.id],
  subnets: subnets.ids,
});

// const lbListner = new aws.lb.Listener("dw-ecs-listner", {
//   loadBalancerArn: lb.arn,
//   defaultActions: [],
// });

// const rule = new aws.lb.ListenerRule("listener", {
//   listenerArn: lbListner.arn,
//   actions: [
//     {
//       type: "forward",
//       targetGroupArn: createFargateTask(Service.Bank, Deployment.Blue).arn,
//     },
//   ],
//   conditions: [
//     {
//       pathPattern: {
//         values: ["/banks"],
//       },
//     },
//   ],
// });

function createFargateTask(service: Service, deployment: Deployment) {
  const microserviceName = `${service}-${deployment}`;

  // // target group for port 80
  // const targetGroup = new aws.lb.TargetGroup(`${microserviceName}-tg`, {
  //   port: 80,
  //   protocol: "HTTP",
  //   targetType: "ip",
  //   vpcId: vpc.id,
  // });

  const svc = new aws.ecs.Service(microserviceName, {
    cluster: cluster.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    taskDefinition: createTaskDefinition(microserviceName).arn,
    networkConfiguration: {
      assignPublicIp: true,
      subnets: subnets.ids,
      securityGroups: [securityGroup.id],
    },
  });

  return targetGroup;
}

export function createTaskDefinition(microserviceName: string) {
  return new aws.ecs.TaskDefinition(microserviceName, {
    family: microserviceName,
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    // executionRoleArn: role.arn,
    containerDefinitions: pulumi.all([securityGroup]).apply(([sg]) =>
      JSON.stringify([
        {
          name: microserviceName,
          image: "nginx",
          portMappings: [
            {
              containerPort: 80,
              hostPort: 80,
              protocol: sg.ingress[0].protocol,
            },
          ],
        },
      ]),
    ),
  });
}

export const url = lb.dnsName;
