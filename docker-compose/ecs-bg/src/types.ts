import { Output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export enum Deployment {
    Blue = "blue",
    Green = "green",
}

export enum Service {
    Bank = "bank",
    User = "user",
    Transaction = "transaction",
    Underwriter = "underwriter",
}

export enum Action {
    Create = "create",
    Remove = "remove",
    Point = "point",
}

export interface Command {
    action: Action;
    service: Service;
    deployment: Deployment;
}

export interface applyCommandArgs {
    clusterArn: Output<string>;
    service: Service;
    deployment: Deployment;
}

export interface Microservice {
    service: Service;
    deployment: Deployment;
    isTargeted: boolean;
}

export interface GetEscServiceResult {
    err: any | null;
    result: aws.ecs.GetServiceResult | null;
}

export interface ServiceConfig {
    vpcId: Output<string>;
    cluster: aws.ecs.Cluster;
    listener: aws.lb.Listener;
    securityGroups: aws.ec2.SecurityGroup[];
    executionRole: aws.iam.Role;
}
