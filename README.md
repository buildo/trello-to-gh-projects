Script to migrate PRISMA from Trello to Gh Projects

## How it works in 2 words

it reads the JSON export of a Trello board and open an issue for each card of a whitelisted set of Trello list.

Each issue is opened with the label defined in an option file based on:
- which list is into
- its Trello labels

## Run it

**Before** running the script you should:

1. Clone this repo and run `yarn`
2. Export your Trello board as JSON inside the cloned repo (Menu > More > Print and Export > Export as JSON)
3. Disable Trello PRISMA by removing it from [https://github.com/buildo/prisma/blob/master/config-ci.json](https://github.com/buildo/prisma/blob/master/config-ci.json)
4. Enable PRISMA Gh Projects (follow instructions from PRISMA repo)
5. Set up the project: add any open issue to the correct column

In order to work, the script requires four arguments:
- `--in`: path to Trello JSON export
- `--out`: the fullname of the repo you want to migrate the cards to (fullname is like `org/reponame`)
- `--token`: a valid GitHub token
- `--options`: path to your JSON options file

In your options file you can choose which lists should be migrated and which labels should be added to the newly created issues.

It's structured like this:

```ts
type Options = {
  lists: { [listName: string]: string[] } // right string[] should be an array of GitHub labels
  labels: { [trelloLabelName: string]: string } // right `string` should be a GitHub label
});
```

Example:

```json
{
  "labels": {
    "defect": "bug",
  },
  "lists": {
    "backlog": [],
    "tech debt": ["tech debt"],
    "defects/bugs": ["bug"]
  }
}
```

In the example above we're:
- mapping the label `defect` to `bug` (any other label will be ignored)
- migrating only three lists:
  - backlog
  - tech debt
  - defects/bugs
- forcing every card in "tech debt" list to have the `tech debt` label
- forcing every card in "defects/bugs" list to have the `bug` label

Create an options file inside the cloned repo.

Finally, you can run the script by typing something like:

```
yarn start --in exportedTrello.json --out org/reponame --token abc123 --options myOptions.json
```

The script will now quickly open the issues in series. At the same time, PRISMA will see newly created issue and, as always, will add them to the project in the correct column.
