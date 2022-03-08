#r "nuget: Newtonsoft.Json"

open Newtonsoft.Json
open Newtonsoft.Json.Linq
open System.IO
open System.Collections.Generic

module Types =
    type Config = 
        { AccountId: string
          Members: string list }

    type User =
        { Name: string
          Initials: string
          ARN: string }

    type RepositoryPolicyStatement =
        { Sid: string
          Effect: string
          Principal: {| AWS: string list |}
          Action: string list }

    type RepositoryPolicy =
        { Version: string
          Statement: RepositoryPolicyStatement list }

    type LifecyclePolicy = 
        { LifecyclePolicyText: string
          RegistryId: string }

    type EcrRepositoryCloudFormationResource =
        { Type: string
          Properties: {| RepositoryName: string
                         RepositoryPolicyText: RepositoryPolicy
                         LifecyclePolicy: LifecyclePolicy |} }

    type CloudFormationRoot =
        { Resources: IDictionary<string, EcrRepositoryCloudFormationResource> }

module Helpers =
    open Types

    let private getArn config (name: string) =
        let firstName = name.Split(' ') |> Seq.head
        $"arn:aws:iam::{config.AccountId}:user/cloudshark-{firstName}"

    let private getInitials (name: string) =
        name.Split(' ')
        |> Seq.map (fun s -> Seq.head s)
        |> Seq.fold (fun acc ch -> $"{acc}{ch}") ""
        |> fun s -> s.ToLower()

    let generateConfig configPath = 
        let configJson = File.ReadAllText(configPath) 
        JsonConvert.DeserializeObject<Config>(configJson)

    let kebabToCamel (words: string) =
        words.Split('-')
        |> Seq.map (fun str -> $"{(string str.[0]).ToUpper()}{str[1..] |> string}")
        |> Seq.fold (fun acc str -> $"{acc}{str}") ""

    let generateUsers config =
        config.Members
        |> Seq.map (fun fullName ->
            { Name = fullName
              Initials = getInitials fullName
              ARN = getArn config fullName })
        |> Seq.toList

module CloudFormationScript =
    open Types
    open Helpers

    let generateLifecyclePolicy config =
        let policy = File.ReadAllText("lifecyclepolicy.json")
        let formatted = JObject.Parse(policy).ToString(Newtonsoft.Json.Formatting.None)
        { LifecyclePolicyText = formatted; RegistryId = config.AccountId }

    let generateRepositoryPolicy user users =
        let actions =
            [ "ecr:BatchGetImage"
              "ecr:BatchCheckLayerAvailability"
              "ecr:CompleteLayerUpload"
              "ecr:GetDownloadUrlForLayer"
              "ecr:InitiateLayerUpload"
              "ecr:PutImage"
              "ecr:UploadLayerPart" ]

        let allowStatement =
            { Sid = $"Allow {user.Name} push/pull"
              Effect = "Allow"
              Principal = {| AWS = [ user.ARN ] |}
              Action = actions }

        let denyStatement =
            let otherUsers =
                users
                |> Seq.filter (fun u -> u <> user)
                |> Seq.map (fun u -> u.ARN)
                |> Seq.toList

            { Sid = $"Deny others"
              Effect = "Deny"
              Principal = {| AWS = otherUsers |}
              Action = actions }

        { Version = "2008-10-17"
          Statement = [ allowStatement; denyStatement ] }


    let generateRepositoryRecord config user users (service: string) =
        { Type = "AWS::ECR::Repository"
          Properties =
            {| RepositoryName = $"{user.Initials}-{service}"
               RepositoryPolicyText = generateRepositoryPolicy user users
               LifecyclePolicy = generateLifecyclePolicy config |} }


    let generateSingletonCloudFormationRecord config services =
        let userList = generateUsers config 
    
        let resources =
            dict [ for user in userList do
                       for service in services do
                           let resourceName = kebabToCamel $"{user.Initials}-{service}-repository"
                           resourceName, generateRepositoryRecord config user userList service ]

        { Resources = resources }

    let generateSplitCloudFormationRecords config services =
        let userList = generateUsers config 
    
        userList
        |> Seq.map (fun user ->
            let userResources =
                dict [ for service in services do
                           let resourceName = kebabToCamel $"{user.Initials}-{service}-repository"
                           resourceName, generateRepositoryRecord config user userList service ]

            {| Owner = user.Initials; CloudFormationRoot = { Resources = userResources } |})

open Helpers
open CloudFormationScript

let services =
    [ "user"
      "bank"
      "transaction"
      "underwriter" ]
    |> List.map (fun service -> $"{service}-microservice")


let config = generateConfig "config.json"

let generateSingletonJson config services = 
    let cloudFormationJson =
        generateSingletonCloudFormationRecord config services
        |> JsonConvert.SerializeObject

    File.WriteAllText("cloud-formation-singleton.json", cloudFormationJson)

let generateSplitJson config outputDirectory services =
    if Directory.Exists(outputDirectory) |> not then
        Directory.CreateDirectory(outputDirectory) |> ignore

    let userJsonList = generateSplitCloudFormationRecords config services
    
    for json in userJsonList do
        File.WriteAllText($"{outputDirectory}/{json.Owner}-cloud-formation.json", json.CloudFormationRoot |> JsonConvert.SerializeObject)

generateSplitJson config "team-cf-files" services
