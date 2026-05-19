const path = require("path");
const fse = require("fs-extra");
const { Proskomma } = require("proskomma-core");
const { PerfRenderFromProskomma } = require("proskomma-json-tools");

const USAGE = "node unitsFromUgnt.js <usfmPath>";

if (process.argv.length !== 3) {
  console.error(
    `Expected exactly 1 argument but found ${process.argv.length - 2}\n${USAGE}`,
  );
  process.exit(1);
}

const usfmPath = path.resolve(process.argv[2]);
if (!fse.pathExistsSync(usfmPath)) {
  console.error(`Could not find usfm path '${usfmPath}'`);
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
        environment.workspace.currentSectionParas = [];
        environment.output.sections = [];
        environment.workspace.atSentenceEnd = false;
        environment.workspace.bookCode =
          environment.context.document.metadata.document.h;
      },
    },
  ],
  mark: [
    {
      description: "Update chapter and verse, update output",
      test: ({ context }) =>
        ["chapter", "verses"].includes(context.sequences[0].element.subType),
      action: (environment) => {
        const element = environment.context.sequences[0].element;
        if (element.subType === "chapter") {
          if (environment.workspace.chapter) {
            environment.workspace.currentSectionParas.push({
              paraTag: "p",
              units: [
                `${environment.workspace.chapter}:${environment.workspace.startVerse}${environment.workspace.startVerse !== environment.workspace.verses ? `-${environment.workspace.verses}` : ""}`,
              ],
            });
            const lastUnitCv =
              environment.workspace.currentSectionParas[
                environment.workspace.currentSectionParas.length - 1
              ].units[0];
            environment.output.sections.push({
              bookCode: environment.workspace.bookCode,
              cv: [
                environment.workspace.currentSectionParas[0].units[0].split(
                  "-",
                )[0],
                lastUnitCv.includes("-")
                  ? `${lastUnitCv.split(":")[0]}:${lastUnitCv.split("-")[1]}`
                  : lastUnitCv,
              ],
              fieldInitialValues: {},
              paragraphs: environment.workspace.currentSectionParas,
            });
          }
          environment.workspace.chapter = element.atts["number"];
          environment.workspace.verses = null;
          environment.workspace.startVerse = null;
          environment.workspace.currentSectionParas = [];
        } else {
          if (
            environment.workspace.atSentenceEnd &&
            environment.workspace.verses
          ) {
            environment.workspace.currentSectionParas.push({
              paraTag: "p",
              units: [
                `${environment.workspace.chapter}:${environment.workspace.startVerse}${environment.workspace.startVerse !== environment.workspace.verses ? `-${environment.workspace.verses}` : ""}`,
              ],
            });
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
      action: ({ output, workspace }) => {
        workspace.currentSectionParas.push({
          paraTag: "p",
          units: [
            `${workspace.chapter}:${workspace.startVerse}${workspace.startVerse !== workspace.verses ? `-${workspace.verses}` : ""}`,
          ],
        });
        const lastUnitCv =
          workspace.currentSectionParas[
            workspace.currentSectionParas.length - 1
          ].units[0];
        output.sections.push({
          bookCode: workspace.bookCode,
          cv: [
            workspace.currentSectionParas[0].units[0].split("-")[0],
            lastUnitCv.includes("-")
              ? `${lastUnitCv.split(":")[0]}:${lastUnitCv.split("-")[1]}`
              : lastUnitCv,
          ],
          fieldInitialValues: {},
          paragraphs: workspace.currentSectionParas,
        });
        console.log(JSON.stringify(output.sections, null, 2));
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
