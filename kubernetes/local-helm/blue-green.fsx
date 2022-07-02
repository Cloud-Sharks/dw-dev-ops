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

module Helpers =
    open CliWrap
    open CliWrap.Buffered

    type TimeComparison =
        | Earlier = -1
        | Same = 0
        | Later = 1

    let runCli target (arguments: string) workingDirectory =
        task {
            let! result =
                Cli
                    .Wrap(target)
                    .WithWorkingDirectory(workingDirectory)
                    .WithArguments(arguments)
                    .ExecuteBufferedAsync()

            return
                match result.ExitCode with
                | 0 -> Ok <| result.StandardOutput
                | _ -> Error <| result.StandardError
        }
        |> Async.AwaitTask
        |> Async.RunSynchronously

module Kubernetes =
    open Types
    open System.Text.RegularExpressions
    open System
    open Parsers
    open Helpers

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

    let podStartTime (podName: string) =
        runCli "kubectl" $"describe pod {podName}" "."
        |> Result.bind (fun msg ->
            let matchGroups = timeRegex.Match(msg).Groups

            matchGroups.Item("time").Value
            |> DateTime.Parse
            |> Ok)

    let getPod args =
        let service = args.Service |> parseService
        let deployment = args.Deployment |> parseDeployment
        let creationDate = args.PodName |> podStartTime

        let pod =
            service
            |> Result.bind (fun service ->
                deployment
                |> Result.bind (fun deployment ->
                    creationDate
                    |> Result.bind (fun creationDate ->
                        Ok
                            { Service = service
                              Deployment = deployment
                              CreationDate = creationDate })))

        pod

    let getPods =
        runCli "kubectl" "get pods" "."
        |> Result.bind (fun msg ->
            let podNames = serviceRegex.Matches(msg)

            Ok [ for podName in podNames do
                     let service = podName.Groups.Item("service").Value
                     let deployment = podName.Groups.Item("color").Value

                     let pod =
                         getPod
                             { Deployment = deployment
                               Service = service
                               PodName = podName.Value }

                     match pod with
                     | Ok pod -> pod
                     | Error msg -> failwith msg ])

module Commands =
    open Types
    open Kubernetes
    open Helpers

    let private oppositeDeployment =
        function
        | Blue -> Green
        | Green -> Blue

    let private install path (service: Service) (deployment: Deployment) =
        let args =
            $"install_{service}_{deployment}".ToLower()

        runCli "make" args path

    let private uninstall path (service: Service) (deployment: Deployment) =
        let args =
            $"uninstall_{service}_{deployment}".ToLower()

        runCli "make" args path

    // TODO: Use deployment age instead of age of first pod
    let private podAge service deployment =
        getPods
        |> Result.map (fun podList ->
            podList
            |> List.filter (fun p -> p.Service = service)
            |> List.groupBy (fun p -> p.Deployment))
        |> Result.map (fun groupedPods ->
            groupedPods
            |> List.find (fun (dep, _) -> dep = deployment)
            |> fun (_, podList) ->
                podList
                |> List.map (fun p -> p.CreationDate)
                |> List.head)

    let blueGreen path service =
        getPods
        |> Result.map (fun podList ->
            podList
            |> List.filter (fun p -> p.Service = service)
            |> List.groupBy (fun p -> p.Deployment))
        |> Result.bind (fun groupedPods ->
            let listLength = groupedPods |> List.length

            if listLength = 0 then
                Error $"Cannot implement blue/green deployment. No deployments of {service} exist"
            elif listLength = 2 then
                Error $"Cannot implement blue/green deployment. Both deployments of {service} already exist"
            else
                let (deployment, _) = groupedPods |> List.exactlyOne
                let missingDeployment = oppositeDeployment deployment
                install path service missingDeployment)

    let rollback path service =
        getPods
        |> Result.map (fun podList ->
            podList
            |> List.filter (fun p -> p.Service = service)
            |> List.groupBy (fun p -> p.Deployment))
        |> Result.bind (fun groupedPods ->
            let listLength = groupedPods |> List.length

            if listLength = 0 then
                Error $"Cannot rollback. No deployments of {service} exist"
            elif listLength = 1 then
                Error $"Cannot rollback. Only one deployment of {service} exists"
            else
                podAge service Blue
                |> Result.bind (fun blueAge ->
                    podAge service Green
                    |> Result.bind (fun greenAge ->
                        if enum <| blueAge.CompareTo(greenAge) = TimeComparison.Earlier then
                            uninstall path service Blue
                        else
                            uninstall path service Green)))

    let deploy path service =
        getPods
        |> Result.map (fun podList ->
            podList
            |> List.filter (fun p -> p.Service = service)
            |> List.groupBy (fun p -> p.Deployment))
        |> Result.bind (fun groupedPods ->
            let listLength = groupedPods |> List.length

            if listLength <> 2 then
                Error $"Cannot deploy. Both deployments of {service} are not up"
            else
                podAge service Blue
                |> Result.bind (fun blueAge ->
                    podAge service Green
                    |> Result.bind (fun greenAge ->
                        if enum <| blueAge.CompareTo(greenAge) = TimeComparison.Earlier then
                            uninstall path service Green
                        else
                            uninstall path service Blue)))

open Types
open Commands

let path =
    "/home/david/Documents/Projects/Smoothstack/Aline/dev-ops/kubernetes/local-helm"

let results = [ rollback path Bank ]
