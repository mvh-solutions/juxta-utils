const fse = require("fs-extra");
const path = require("path");
const { Proskomma } = require("proskomma-core");
const { PerfRenderFromProskomma, render } = require("proskomma-json-tools");

const usage = "USAGE: node index.js <usfmPath";
if (process.argv.length !== 3) {
  console.log(usage);
  process.exit(1);
}

const actions = {
  startDocument: [
    {
      description: "Set up state",
      test: () => true,
      action: (environment) => {
        environment.output.alignments = [];
        environment.workspace.chapter = null;
        environment.workspace.verses = null;
        environment.workspace.currentAlignment = null;
      },
    },
  ],
  mark: [
    {
      description: "Update chapter",
      test: ({ context }) =>
        ["chapter", "verses"].includes(context.sequences[0].element.subType),
      action: (environment) => {
        const element = environment.context.sequences[0].element;
        if (element.subType === "chapter") {
          environment.workspace.chapter = element.atts["number"];
        } else {
          environment.workspace.verses = element.atts["number"];
        }
      },
    },
  ],
  startMilestone: [
    {
      description:
        "Start alignment record if necessary and add greek (maybe nested milestones)",
      test: ({ context, workspace }) =>
        context.sequences[0].element.subType === "usfm:zaln",
      action: ({ context, workspace }) => {
        const element = context.sequences[0].element;
        if (!workspace.currentAlignment) {
          workspace.currentAlignment = {
            chapter: workspace.chapter,
            verses: workspace.verses,
            greek: [],
            strong: [],
            english: [],
          };
        }
        for (const c of element.atts["x-content"]) {
          workspace.currentAlignment.greek.push(c);
        }
        for (const s of element.atts["x-strong"]) {
          workspace.currentAlignment.strong.push(s);
        }
      },
    },
  ],
  endMilestone: [
    {
      description: "Push alignment record (only once)",
      test: ({ context, workspace }) =>
        context.sequences[0].element.subType === "usfm:zaln",
      action: ({ workspace, output }) => {
        if (workspace.currentAlignment) {
          output.alignments.push(workspace.currentAlignment);
          workspace.currentAlignment = null;
        }
      },
    },
  ],
  text: [
    {
      description: "Add text to record",
      test: ({ workspace }) => workspace.currentAlignment,
      action: ({ workspace, context }) => {
        const text = context.sequences[0].element.text.trim();
        if (text.length > 0) {
          workspace.currentAlignment.english.push(text.trim());
        }
      },
    },
  ],
  endDocument: [
    {
      description: "Make TSV",
      test: () => true,
      action: ({ output }) => {
        let tsvBits = [];
        tsvBits.push("book\tchapter\tverse\tsort\tgreek\tstrong\tult\tpnc");
        let count = 1;
        for(const alignment of output.alignments) {
            tsvBits.push(`PHP\t${alignment.chapter}\t${alignment.verses}\t${count}\t${alignment.greek.join(" ")}\t${alignment.strong.join(" ")}\t${alignment.english.join("-")}\tpnc`);
        count++;
        }
        console.log(tsvBits.join("\n"));
      },
    },
  ]
};

const usfmString = fse.readFileSync(path.resolve(process.argv[2])).toString();

const pk = new Proskomma();
pk.importDocument({ lang: "xxx", abbr: "yyy" }, "usfm", usfmString);
const docId = pk.gqlQuerySync("{documents { id } }").data.documents[0].id;
const cl = new PerfRenderFromProskomma({
  proskomma: pk,
  actions,
  debugLevel: 0,
});
const output = {};
cl.renderDocument({ docId, config: {}, output });
// console.log(JSON.stringify(output, null, 2));
