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

    type CreateKubernetesDeploymentArgs =
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

    let createKubernetesDeployment args =
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

    let getDeployments service =
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

              createKubernetesDeployment
                  { Deployment = deployment
                    Service = service
                    PodName = podName.Value } ]

open Kubernetes
open Types

let result = getDeployments Bank
