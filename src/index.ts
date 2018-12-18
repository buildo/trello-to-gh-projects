import * as path from "path";
import * as minimist from "minimist";
import stagger from "staggerjs";
import * as t from "io-ts";
import { failure } from "io-ts/lib/PathReporter";
import * as console from "better-console";
import * as Octokat from 'octokat';

const Args = t.interface({
  in: t.string,
  out: t.string,
  token: t.string,
  options: t.string
});

const Options = t.interface({
  lists: t.dictionary(t.string, t.array(t.string)),
  labels: t.dictionary(t.string, t.string)
});

const TrelloExport = t.interface({
  cards: t.array(
    t.interface({
      id: t.string,
      closed: t.boolean,
      desc: t.string,
      idList: t.string,
      name: t.string,
      labels: t.array(t.interface({ name: t.string })),
      shortUrl: t.string,
      attachments: t.array(
        t.interface({
          previews: t.array(t.any),
          name: t.string,
          url: t.string
        })
      )
    })
  ),
  lists: t.array(
    t.interface({
      id: t.string,
      name: t.string
    })
  )
});

const handleErrors = (errors: any) => {
  throw new Error(failure(errors).join("\n"));
};

type NewIssue = {
  title: string;
  body: string;
  labels: Array<{ name: string }>
};

try {
  const args = Args.decode(minimist(process.argv.slice(2))).getOrElseL(
    handleErrors
  );

  const octo = new (Octokat as any)({
    token: args.token
  });

  const trelloExport = TrelloExport.decode(
    require(path.resolve(process.cwd(), args.in))
  ).getOrElseL(handleErrors);

  const options = Options.decode(
    require(path.resolve(process.cwd(), args.options))
  ).getOrElseL(handleErrors);

  const wantedLists = trelloExport.lists.filter(list =>
    Object.keys(options.lists).find(
      l => l.toLowerCase() === list.name.toLowerCase()
    )
  );

  const cardsToBeMigrated = trelloExport.cards.filter(
    card => !card.closed && wantedLists.find(l => l.id === card.idList)
  );

  const asyncMethods = cardsToBeMigrated.map((card, i) => () => {
    const list = wantedLists.find(l => l.id === card.idList)!;

    const attachments = card.attachments.map(
      a => `${a.previews.length > 0 ? "!" : ""}[${a.name}](${a.url})`
    );

    const labels = card.labels
      .map(l => options.labels[l.name])
      .concat(options.lists[list.name] || [])
      .filter(l => l)
      .map(l => ({ name: l }));

    const issue: NewIssue = {
      title: card.name,
      body: `${card.desc || ""}${
        attachments.length > 0 ? `\n\n##attachments\n${attachments}` : ""
      }\n\n##original Trello card\n${card.shortUrl}`,
      labels
    };

    return octo.repos(args.out).issues.create(issue)
      .then(() => {
        console.log(`✅ ${i + 1}/${cardsToBeMigrated.length}`);
      })
      .catch((error: any) => {
        console.error(`❌ ${i + 1}/${cardsToBeMigrated.length}\n${error}\nCard: ${card.id})`);
      });
  });

  stagger(asyncMethods, { maxOngoingMethods: 1, perSecond: Infinity });
} catch (error) {
  console.error(error.message);
}
