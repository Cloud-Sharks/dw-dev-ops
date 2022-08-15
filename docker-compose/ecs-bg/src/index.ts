import { InlineProgramArgs, LocalWorkspace } from "@pulumi/pulumi/automation";
import createCluster from "./ecs-cluster";

const run = async () => {
    // Create our stack
    const args: InlineProgramArgs = {
        stackName: "ecs-bg-node",
        projectName: "ecs-bg-node",
        program: createCluster,
    };

    const stack = await LocalWorkspace.createOrSelectStack(args);
    const upRes = await stack.up({ onOutput: console.info });
    console.log(
        `update summary: \n${JSON.stringify(
            upRes.summary.resourceChanges,
            null,
            4,
        )}`,
    );
};

run().catch((err) => console.log(err));
