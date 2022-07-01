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

    type Pod =
        { Service: Service
          Deployment: Deployment
          CreationDate: DateTime }

    type GetPodArgs =
        { Deployment: string
          PodName: string
          Service: string }

    let private serviceRegex =
        Regex("""(?<service>\w+)-(?<color>blue|green)(-.+?){2}\b""")

    let private timeRegex = Regex("""Start Time:\s+(?<time>.*)""")

    // TODO: Wrap in Result
    let podStartTime podName =
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

    let getPod args =
        let (>>=) m fn = Result.bind fn m
        let service = args.Service |> parseService
        let deployment = args.Deployment |> parseDeployment

        let creationDate =
            args.PodName
            |> podStartTime
            |> Async.AwaitTask
            |> Async.RunSynchronously

        let pod =
            service
            >>= fun s ->
                    deployment
                    >>= fun d ->
                            { Service = s
                              Deployment = d
                              CreationDate = creationDate }
                            |> Ok

        pod

    let getPods =
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
                  getPod
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

    // TODO: Use deployment age instead of age of first pod
    let private podAge service deployment =
        let podDeployments =
            getPods
            |> List.filter (fun d -> d.Service = service)
            |> List.groupBy (fun d -> d.Deployment)

        podDeployments
        |> List.find (fun (dep, _) -> dep = deployment)
        |> fun (_, podList) ->
            podList
            |> List.map (fun p -> p.CreationDate)
            |> List.head

    let blueGreen path service =
        task {
            let podDeployments =
                getPods
                |> List.filter (fun d -> d.Service = service)
                |> List.groupBy (fun d -> d.Deployment)

            let listLength = podDeployments |> List.length

            if listLength = 0 then
                return Error $"No deployments of {service} exist"
            elif listLength = 2 then
                return Error $"Both deployments of {service} already exist"
            else
                let (deployment, _) = podDeployments |> List.exactlyOne
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

    let rollback path service =
        task {
            let podDeployments =
                getPods
                |> List.filter (fun d -> d.Service = service)
                |> List.groupBy (fun d -> d.Deployment)

            let listLength = podDeployments |> List.length

            if listLength = 0 then
                return Error $"No deployments of {service} exist"
            elif listLength = 2 then
                return Error $"Both deployments of {service} already exist"
            else
                let blueAge = podAge service Blue
                let greenAge = podAge service Green

                if blueAge > greenAge then
                    uninstall path service Green |> ignore
                    return Ok $"Uninstalled newer green deployment"
                else
                    uninstall path service Blue |> ignore
                    return Ok $"Uninstalled newer blue deployment"
        }
        |> Async.AwaitTask
        |> Async.RunSynchronously

    let deploy path service =
        task {
            let podDeployments =
                getPods
                |> List.filter (fun d -> d.Service = service)
                |> List.groupBy (fun d -> d.Deployment)

            let listLength = podDeployments |> List.length

            if listLength <> 2 then
                return Error $"Both deployments of {service} are not up"
            else
                let blueAge = podAge service Blue
                let greenAge = podAge service Green

                if blueAge < greenAge then
                    uninstall path service Green |> ignore
                    return Ok $"Uninstalled old green deployment"
                else
                    uninstall path service Blue |> ignore
                    return Ok $"Uninstalled old blue deployment"
        }
        |> Async.AwaitTask
        |> Async.RunSynchronously

open Kubernetes
open Types
open Commands

let path =
    "/home/david/Documents/Projects/Smoothstack/Aline/dev-ops/kubernetes/local-helm"

let results =
    [ blueGreen path Bank
      deploy path Bank ]
