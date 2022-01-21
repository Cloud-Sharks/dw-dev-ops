#r "nuget: Newtonsoft.Json"

open Newtonsoft.Json
open System.IO

type User =
    { Name: string
      Initials: string
      ARN: string }

let users =
    let arn (name: string) =
        let firstName = name.Split(' ') |> Seq.head
        $"arn:aws:iam::862167864120:user/cloudshark-{firstName}"

    let initials (name: string) =
        name.Split(' ')
        |> Seq.map (fun s -> Seq.head s)
        |> Seq.fold (fun acc ch -> $"{acc}{ch}") ""
        |> fun s -> s.ToLower()

    let names = File.ReadAllLines("team.txt")

    names
    |> Seq.map (fun n ->
        { Name = n
          Initials = initials n
          ARN = arn n })

let services =
    [ "user"
      "bank"
      "transaction"
      "underwriter" ]
    |> List.map (fun string -> $"{string}-microservice")

let repositoryPolicyRecord user =
    let statement =
        {| Sid = $"Allow {user.Name} push/pull"
           Effect = "Allow"
           Principal = {| AWS = user.ARN |}
           Action =
            [   "ecr:BatchGetImage"
                "ecr:BatchCheckLayerAvailability"
                "ecr:CompleteLayerUpload"
                "ecr:GetDownloadUrlForLayer"
                "ecr:InitiateLayerUpload"
                "ecr:PutImage"
                "ecr:UploadLayerPart" ] |}

    {| Version = "2008-10-17"; Statement = [statement]|}

let repositoryRecord user service =
    {| Type = "AWS::ECR::Repository"
       Properties =
        {| RepositoryName = $"{user.Initials}-{service}"
           RepositoryPolicyText = repositoryPolicyRecord user |} |}

let cloudFormationRecord =
    let kebabToCamel (words: string) =
        words.Split('-')
        |> Seq.map (fun str -> $"{(string str.[0]).ToUpper()}{ str[1..] |> string}")
        |> Seq.fold (fun acc str -> $"{acc}{str}") ""

    let resources =
        dict [ for user in users do
                   for service in services do
                       kebabToCamel $"{user.Initials}-{service}-repository", repositoryRecord user service ]

    dict [ "Resources", resources ]

let cloudFormationJson =
    JsonConvert.SerializeObject cloudFormationRecord

File.WriteAllText("cloud-formation.json", cloudFormationJson)
