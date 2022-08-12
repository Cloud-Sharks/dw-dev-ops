import * as aws from "@pulumi/aws";

export function addListenerRules(lb: aws.lb.LoadBalancer) {
  // listener for port 80
  const listener = new aws.lb.Listener(`dw-ecs-listener`, {
    loadBalancerArn: lb.arn,
    port: 80,
    defaultActions: [
      {
        type: "forward",
        targetGroupArn: targetGroup.arn,
      },
    ],
  });

  return listener;
}
