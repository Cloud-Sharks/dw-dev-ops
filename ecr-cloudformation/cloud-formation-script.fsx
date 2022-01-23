#r "nuget: Newtonsoft.Json"

open Newtonsoft.Json
open System.IO
open System.Collections.Generic

module Types =
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

    type EcrRepositoryCloudFormationResource =
        { Type: string
          Properties: {| RepositoryName: string
                         RepositoryPolicyText: RepositoryPolicy |} }

    type CloudFormationRoot =
        { Resources: IDictionary<string, EcrRepositoryCloudFormationResource> }

module Helpers =
    open Types

    let private getArn (name: string) =
        let firstName = name.Split(' ') |> Seq.head
        $"arn:aws:iam::862167864120:user/cloudshark-{firstName}"

    let private getInitials (name: string) =
        name.Split(' ')
        |> Seq.map (fun s -> Seq.head s)
        |> Seq.fold (fun acc ch -> $"{acc}{ch}") ""
        |> fun s -> s.ToLower()

    let kebabToCamel (words: string) =
        words.Split('-')
        |> Seq.map (fun str -> $"{(string str.[0]).ToUpper()}{str[1..] |> string}")
        |> Seq.fold (fun acc str -> $"{acc}{str}") ""

    let generateUsers filePath =
        File.ReadAllLines(filePath)
        |> Seq.map (fun fullName ->
            { Name = fullName
              Initials = getInitials fullName
              ARN = getArn fullName })
        |> Seq.toList

module CloudFormationScript =
    open Types
    open Helpers

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


    let generateRepositoryRecord user users (service: string) =
        { Type = "AWS::ECR::Repository"
          Properties =
            {| RepositoryName = $"{user.Initials}-{service}"
               RepositoryPolicyText = generateRepositoryPolicy user users |} }


    let generateCloudFormationRecord users services =
        let resources =
            dict [ for user in users do
                       for service in services do
                           let resourceName = kebabToCamel $"{user.Initials}-{service}-repository"
                           resourceName, generateRepositoryRecord user users service ]

        { Resources = resources }


open Helpers
open CloudFormationScript

let services =
    [ "user"
      "bank"
      "transaction"
      "underwriter" ]
    |> List.map (fun service -> $"{service}-microservice")

let users = generateUsers "team.txt"

let cloudFormationJson =
    generateCloudFormationRecord users services
    |> JsonConvert.SerializeObject

File.WriteAllText("cloud-formation.json", cloudFormationJson)
