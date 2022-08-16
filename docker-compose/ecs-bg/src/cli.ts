import {
    DestroyResult,
    InlineProgramArgs,
    LocalWorkspace,
    UpResult,
} from "@pulumi/pulumi/automation";
import { updateCluster } from "./ecs-cluster";
import { Action, Command, Deployment, Service } from "./types";
import * as process from "process";

const [, , ...args] = process.argv;

let destroy = false;

if (args?.length > 0 && args[0]) {
    if (args[0] === "destroy") destroy = true;
}

const parseCommand = (): Command => {
    const validAction = ["point", "create", "remove"];
    const validService = ["bank", "transaction", "user", "underwriter"];
    const validDeployment = ["green", "blue"];

    const action = args[0];
    const service = args[1];
    const deployment = args[2];

    if (
        (!validAction.includes(action) ||
            !validService.includes(service) ||
            !validDeployment.includes(deployment)) &&
        !destroy
    ) {
        console.error("Invalid parameters");
        process.exit(1);
    }

    return {
        action: action as Action,
        deployment: deployment as Deployment,
        service: service as Service,
    };
};

const run = async () => {
    const command = parseCommand();

    console.info("command :>> ", command);

    // Create our stack
    const args: InlineProgramArgs = {
        stackName: "ecs-bg-node",
        projectName: "ecs-bg",
        program: () => updateCluster(command),
    };

    const stack = await LocalWorkspace.createOrSelectStack(args);

    let result: DestroyResult | UpResult | undefined = undefined;

    if (destroy) {
        result = await stack.destroy({ onOutput: console.info });
    } else {
        result = await stack.up({ onOutput: console.info });
    }

    const summary = JSON.stringify(result?.summary.resourceChanges, null, 4);
};

run().catch((err) => console.error(err));
