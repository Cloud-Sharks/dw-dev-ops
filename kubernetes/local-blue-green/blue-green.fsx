#r "nuget: CliWrap, 3.4.4"

module Types =
    type Service =
        | Bank
        | User
        | Transaction
        | Underwriter

    type Deployment =
        | Blue
        | Green

    type Command =
        | BlueGreen
        | SwitchOld
        | SwitchNew
        | Rollback
        | CompleteDeployment

module Helpers =
    open CliWrap
    open CliWrap.Buffered

    type TimeComparison =
        | Older = -1
        | Same = 0
        | Younger = 1

    let runCli target (arguments: string) workingDirectory =
        task {
            let! result =
                Cli
                    .Wrap(target)
                    .WithWorkingDirectory(workingDirectory)
                    .WithArguments(arguments)
                    .WithValidation(CommandResultValidation.None)
                    .ExecuteBufferedAsync()

            return
                match result.ExitCode with
                | 0 -> Ok <| result.StandardOutput
                | _ -> Error <| result.StandardError
        }
        |> Async.AwaitTask
        |> Async.RunSynchronously

module Parsers =
    open Types

    let parseService =
        function
        | "bank" -> Ok Bank
        | "user" -> Ok User
        | "transaction" -> Ok Transaction
        | "underwriter" -> Ok Underwriter
        | _ as service -> Error $"Invalid service {service}"

    let parseDeployment =
        function
        | "blue" -> Ok Blue
        | "green" -> Ok Green
        | _ as deployment -> Error $"Invalid deployment: '{deployment}'"

    let parseCommand =
        function
        | "bg" -> Ok BlueGreen
        | "old" -> Ok SwitchOld
        | "new" -> Ok SwitchNew
        | "rollback" -> Ok Rollback
        | "complete" -> Ok CompleteDeployment
        | _ as cmd -> Error $"Invalid command: '{cmd}'"

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
        |> Result.map (fun msg ->
            let matchGroups = timeRegex.Match(msg).Groups
            matchGroups.Item("time").Value |> DateTime.Parse)

    let getPod fnArgs =
        let service = fnArgs.Service |> parseService
        let deployment = fnArgs.Deployment |> parseDeployment
        let creationDate = fnArgs.PodName |> podStartTime

        let pod =
            service
            |> Result.bind (fun service ->
                deployment
                |> Result.bind (fun deployment ->
                    creationDate
                    |> Result.map (fun creationDate ->
                        { Service = service
                          Deployment = deployment
                          CreationDate = creationDate })))

        pod

    let getPods =
        runCli "kubectl" "get pods" "."
        |> Result.map (fun msg ->
            let podNames = serviceRegex.Matches(msg)

            [ for podName in podNames do
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
                        if enum <| blueAge.CompareTo(greenAge) = TimeComparison.Younger then
                            uninstall path service Blue
                        else
                            uninstall path service Green)))

    let completeDeployment path service =
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
                        if enum <| blueAge.CompareTo(greenAge) = TimeComparison.Younger then
                            uninstall path service Green
                        else
                            uninstall path service Blue)))

open Types
open Commands
open Parsers

let args = fsi.CommandLineArgs

let result =
    match args with
    | [| path; service; command |] ->
        parseService service
        |> Result.bind (fun service ->
            parseCommand command
            |> Result.bind (fun command ->
                match command with
                | BlueGreen -> blueGreen path service
                | Rollback -> rollback path service
                | CompleteDeployment -> completeDeployment path service
                | _ as cmd -> Error $"{cmd} Not implemented"))
    | _ ->
        Error "Invalid arguments passed. Example arguments (bank|transaction|user|underwriter) (bg|rollback|complete)"

match result with
| Ok msg -> printfn "%s" msg
| Error msg -> failwithf "%s" msg
