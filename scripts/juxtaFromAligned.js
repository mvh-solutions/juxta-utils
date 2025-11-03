const path = require('path');
const fse = require('fs-extra');
const {Proskomma} = require('proskomma-core');

const USAGE = "node juxtaFromAligned.js <modelJuxtaDir> <usfmDir> <bookCode> <newJuxta>";

if (process.argv.length !== 6) {
    console.log(`Expected exactly 6 arguments but found ${process.argv.length - 2}\n${USAGE}`);
    process.exit(1);
}

const bookCode = process.argv[4];

const modelJuxtaDirPath = path.resolve(process.argv[2]);
if (!fse.pathExistsSync(modelJuxtaDirPath)) {
    console.log(`Could not find model juxta dir path '${modelJuxtaDirPath}'`);
    process.exit(1);
}
const modelJuxtaPath = path.join(modelJuxtaDirPath, `${bookCode}.json`);
if (!fse.pathExistsSync(modelJuxtaPath)) {
    console.log(`Could not find model juxta path '${modelJuxtaPath}'`);
    process.exit(1);
}
let modelJuxta = fse.readJsonSync(modelJuxtaPath);
modelJuxta = modelJuxta.bookCode ? modelJuxta.sentences : modelJuxta;

const usfmDirPath = path.resolve(process.argv[3]);
if (!fse.pathExistsSync(usfmDirPath)) {
    console.log(`Could not find usfm dir path '${usfmDirPath}'`);
    process.exit(1);
}
const usfmPath = path.join(usfmDirPath, `${bookCode}.usfm`);
if (!fse.pathExistsSync(usfmPath)) {
    console.log(`Could not find usfm path '${usfmPath}'`);
    process.exit(1);
}
const usfm = fse.readFileSync(usfmPath).toString("utf8");

const newJuxtaPath = path.resolve(process.argv[5]);
if (fse.pathExistsSync(newJuxtaPath)) {
    console.log(`New juxta path '${usfmPath}' already exists`);
    process.exit(1);
}

const pk = new Proskomma();
pk.importDocument({lang: "xxx", abbr: "yyy"}, "usfm", usfm);

for (const [sentenceN, sentence] of modelJuxta.entries()) {
    console.log(`Sentence #${sentenceN + 1}`);
    for (const chunk of sentence.chunks) {
        let glossStrings = [];
        for (const sourceWord of chunk.source) {
            const query =
                `{
                  documents(withBook:"${bookCode}") {
                    mainSequence {
                      blocks (withScriptureCV: "${sourceWord.cv}") {
                        tokens(
                          includeContext:true
                          withScopes:[
                            "attribute/milestone/zaln/x-content/0/${sourceWord.content}",
                            "attribute/milestone/zaln/x-occurrence/0/${sourceWord.occurrence}"
                          ]
                        ) {
                          subType payload scopes
                        }
                      }
                    }
                  }
                }`;
            const result = pk.gqlQuerySync(query);
            // console.log(result.data.documents[0].mainSequence.blocks.map(b => b.tokens.map(t => t.scopes)));
            const glossString =
                result.data.documents[0].mainSequence
                    .blocks
                    .map(
                        b => b.tokens
                            .filter(t => t.subType === "wordLike")
                            .map(t => t.payload)
                            .filter((t, n, a) => !(a.slice(0, n).map(v => v.toLowerCase())).includes(t.toLowerCase()))
                            .join("-")
                    )
                    .join(" ");
            if (!glossStrings.includes(glossString)) {
                glossStrings.push(glossString);
            }
        }
        console.log(glossStrings.join(" ").replace(/\s+/g, " ").trim());
    }
    console.log()
}