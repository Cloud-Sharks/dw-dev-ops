import {
    DestroyResult,
    InlineProgramArgs,
    LocalWorkspace,
    UpResult,
} from "@pulumi/pulumi/automation";
import { createCluster } from "./ecs-cluster";

const process = require("process");
const [, , ...args] = process.argv;

let destroy = false;

if (args?.length > 0 && args[0]) {
    if (args[0] === "destroy") destroy = true;
}

const run = async () => {
    // Create our stack
    const args: InlineProgramArgs = {
        stackName: "ecs-bg-node",
        projectName: "ecs-bg",
        program: createCluster,
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
