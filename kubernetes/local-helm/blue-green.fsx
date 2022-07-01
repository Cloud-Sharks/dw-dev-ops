#r "nuget: CliWrap, 3.4.4"

// bank bg

// bank old
// bank new

// bank rollback
// bank deploy

module Types =
    type Service =
        | Bank
        | User
        | Transaction
        | Underwriter

    type Deployment =
        | Blue
        | Green

    type Command = { Service: Service; Command: string }

module Parsers =
    open Types
    open System.Text.RegularExpressions

    let private commandRegex =
        Regex("""^(?<service>\w+)\s+(?<command>\w+)$""")

    let parseService =
        function
        | "bank" -> Ok Bank
        | "user" -> Ok User
        | "transaction" -> Ok Transaction
        | "underwriter" -> Ok Underwriter
        | _ as service -> Error <| sprintf "Invalid service '%s'" service

    let parseDeployment =
        function
        | "blue" -> Ok Blue
        | "green" -> Ok Green
        | _ as deployment -> Error <| $"Invalid deployment {deployment}"

    let parseCliCommand cliCommand =
        let matches = commandRegex.Match(cliCommand)

        let commands =
            [ "bg"
              "old"
              "new"
              "rollback"
              "deploy" ]

        let service = matches.Groups.Item("service").Value
        let command = matches.Groups.Item("command").Value

        match parseService service with
        | Error msg -> Error msg
        | Ok service ->
            let isValidCommand = commands |> List.contains command

            if isValidCommand then
                Ok <| { Service = service; Command = command }
            else
                Error <| sprintf "Invalid command '%s'" command

module Kubernetes =
    open Types
    open System.Text.RegularExpressions
    open System
    open Parsers
    open CliWrap
    open CliWrap.Buffered

    type KubernetesDeployment =
        { Service: Service
          Deployment: Deployment
          CreationDate: DateTime }

    type GetKubernetesDeploymentArgs =
        { Deployment: string
          PodName: string
          Service: string }

    let private serviceRegex =
        Regex("""(?<service>\w+)-deployment-(?<color>blue|green)(-.+?){2}\b""")

    let private timeRegex = Regex("""Start Time:\s+(?<time>.*)""")

    // TODO: Wrap in Result
    let getPodStartTime podName =
        task {
            let! result =
                Cli
                    .Wrap("kubectl")
                    .WithArguments($"describe pod {podName}")
                    .ExecuteBufferedAsync()

            let matchGroups =
                timeRegex.Match(result.StandardOutput).Groups

            return matchGroups.Item("time").Value |> DateTime.Parse
        }

    let getKubernetesDeployment args =
        let (>>=) m fn = Result.bind fn m
        let service = args.Service |> parseService
        let deployment = args.Deployment |> parseDeployment

        let creationDate =
            args.PodName
            |> getPodStartTime
            |> Async.AwaitTask
            |> Async.RunSynchronously

        let kubernetesDeployment =
            service
            >>= fun s ->
                    deployment
                    >>= fun d ->
                            { Service = s
                              Deployment = d
                              CreationDate = creationDate }
                            |> Ok

        kubernetesDeployment

    let getDeployments =
        let (>>=) m fn = Result.bind fn m

        let cliResult =
            task {
                let! result =
                    Cli
                        .Wrap("kubectl")
                        .WithArguments("get pods")
                        .ExecuteBufferedAsync()

                return result
            }
            |> Async.AwaitTask
            |> Async.RunSynchronously

        let podNames =
            serviceRegex.Matches(cliResult.StandardOutput)

        [ for podName in podNames do
              let service = podName.Groups.Item("service").Value
              let deployment = podName.Groups.Item("color").Value

              let deployment =
                  getKubernetesDeployment
                      { Deployment = deployment
                        Service = service
                        PodName = podName.Value }

              match deployment with
              | Ok d -> d
              | Error msg -> failwith msg ]

module Commands =
    open Types
    open Kubernetes
    open CliWrap
    open CliWrap.Buffered

    let private oppositeDeployment =
        function
        | Blue -> Green
        | Green -> Blue

    // TODO: Return result
    let private install path service deployment =
        task {
            let args =
                $"install_{service}_{deployment}".ToLower()

            let! result =
                Cli
                    .Wrap("make")
                    .WithArguments(args)
                    .WithWorkingDirectory(path)
                    .ExecuteBufferedAsync()

            return result
        }
        |> Async.AwaitTask
        |> Async.RunSynchronously

    // TODO: Return result
    let private uninstall path service deployment =
        task {
            let args =
                $"uninstall_{service}_{deployment}".ToLower()

            let! result =
                Cli
                    .Wrap("make")
                    .WithArguments(args)
                    .WithWorkingDirectory(path)
                    .ExecuteBufferedAsync()

            return result
        }
        |> Async.AwaitTask
        |> Async.RunSynchronously

    let blueGreen path service =
        task {
            let serviceDeployments =
                getDeployments
                |> List.filter (fun d -> d.Service = service)
                |> List.groupBy (fun d -> d.Deployment)

            if List.length serviceDeployments <> 1 then
                return Error $"Both deployments of {service} already exist"
            else
                let (deployment, _) = serviceDeployments |> List.exactlyOne
                let missingDeployment = oppositeDeployment deployment

                install path service missingDeployment |> ignore
                return Ok $"Deployed {service} {missingDeployment}"
        }
        |> Async.AwaitTask
        |> Async.RunSynchronously

    let swapTraffic path service direction =
        match direction with
        | "old" -> Ok()
        | "new" -> Ok()
        | _ as dir -> Error $"Invalid direction {dir}"

// let rollback path service = task {  }


open Kubernetes
open Types
open Commands

let path =
    "/home/david/Documents/Projects/Smoothstack/Aline/dev-ops/kubernetes/local-helm"

let result = blueGreen path Bank
