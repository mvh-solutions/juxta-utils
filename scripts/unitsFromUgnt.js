const path = require("path");
const fse = require("fs-extra");
const { Proskomma } = require("proskomma-core");
const { PerfRenderFromProskomma } = require("proskomma-json-tools");

const USAGE = "node unitsFromUgnt.js <usfmPath> <bookCode>";

if (process.argv.length !== 4) {
  console.log(
    `Expected exactly 2 arguments but found ${process.argv.length - 2}\n${USAGE}`,
  );
  process.exit(1);
}

const bookCode = process.argv[3];

const usfmPath = path.resolve(process.argv[2]);
if (!fse.pathExistsSync(usfmPath)) {
  console.log(`Could not find usfm path '${usfmPath}'`);
  process.exit(1);
}

const actions = {
  startDocument: [
    {
      description: "Set up state",
      test: () => true,
      action: (environment) => {
        environment.workspace.chapter = null;
        environment.workspace.startVerse = null;
        environment.workspace.verses = null;
        environment.workspace.currentPara = null;
        environment.output.paras = [];
        environment.workspace.atSentenceEnd = false;
      },
    },
  ],
  mark: [
    {
      description: "Update chapter and verse",
      test: ({ context }) =>
        ["chapter", "verses"].includes(context.sequences[0].element.subType),
      action: (environment) => {
        const element = environment.context.sequences[0].element;
        if (element.subType === "chapter") {
            if (environment.workspace.chapter) {
            console.log(
              `${environment.workspace.chapter}:${environment.workspace.startVerse}${environment.workspace.startVerse !== environment.workspace.verses ? `-${environment.workspace.verses}` : ""}`
            );
        }
          environment.workspace.chapter = element.atts["number"];
          environment.workspace.verses = null;
          environment.workspace.startVerse = null;
        } else {
          if (
            environment.workspace.atSentenceEnd &&
            environment.workspace.verses
          ) {
            console.log(
              `${environment.workspace.chapter}:${environment.workspace.startVerse}${environment.workspace.startVerse !== environment.workspace.verses ? `-${environment.workspace.verses}` : ""}`
            );
            environment.workspace.startVerse = element.atts["number"];
          }
          if (!environment.workspace.startVerse) {
            environment.workspace.startVerse = element.atts["number"];
          }
          environment.workspace.verses = element.atts["number"];
        }
      },
    },
  ],
  text: [
    {
      description: "Add text to record",
      test: ({ workspace }) => true,
      action: ({ workspace, context }) => {
        const text = context.sequences[0].element.text.trim();
        const re = /[!.?]$/;
        workspace.atSentenceEnd = text.match(re);
      },
    },
  ],
  endDocument: [
    {
      description: "Output paras",
      test: () => true,
      action: ({ output }) => {
        console.log(JSON.stringify(output.paras));
      },
    },
  ],
};

const usfm = fse.readFileSync(usfmPath).toString("utf8");

const pk = new Proskomma();
pk.importDocument({ lang: "xxx", abbr: "yyy" }, "usfm", usfm);

const docId = pk.gqlQuerySync("{documents { id } }").data.documents[0].id;
const cl = new PerfRenderFromProskomma({
  proskomma: pk,
  actions,
  debugLevel: 0,
});
const output = {};
cl.renderDocument({ docId, config: {}, output });
