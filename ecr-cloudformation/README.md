# Cloud Formation ECR Repositories

I was tasked with creating the repositories for my whole team. At the time we had 5 team members and each memeber had 4 repositories - so 20 resources had to be created by me.
I decided to have fun with this task and make a script to create the files for me since I had extra time, but this also could have been achieved with parameters

# Requirements

- dotnet 6 or greater installed

# Cloud Formation Generation

- Create a config.json file that looks like this

```json
{
  "AccountId": "11111111",
  "Members": ["FirstName Lastname", "Peter Parker"]
}
```

- Each memeber must have a first name and a last name for this
- run `dotnet fsi cloud-formation.fsx`
