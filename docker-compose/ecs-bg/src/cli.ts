import {
    DestroyResult,
    InlineProgramArgs,
    LocalWorkspace,
    UpResult,
} from "@pulumi/pulumi/automation";
import { updateCluster } from "./ecs-cluster";
import { Command, Action } from "./service-commands";
import { Deployment } from "./Deployment";
import { Service } from "./Service";

const process = require("process");
const [, , ...args] = process.argv;

let destroy = false;

if (args?.length > 0 && args[0]) {
    if (args[0] === "destroy") destroy = true;
}

const parseCommand = (): Command => {
    const validAction = ["point", "create", "destroy"];
    const validService = ["bank", "transaction", "user", "underwriter"];
    const validDeployment = ["green", "blue"];

    const action: string = args[0];
    const service = args[1];
    const deployment = args[2];

    if (
        !validAction.includes(action) ||
        !validService.includes(service) ||
        !validDeployment.includes(deployment)
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

    console.log("command :>> ", command);

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

run().catch((err) => console.log(err));

// point bank blue
// point bank green

// create bank green
// create bank blue

// remove bank green
// remove bank blue
