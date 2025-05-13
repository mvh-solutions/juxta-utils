const fse = require("fs-extra");
const usage = "node juxtaSentences.js <fromJxlPath>";

if (process.argv.length !== 3) {
    console.log(usage);
    process.exit(1);
}
const fromJuxta = fse.readJsonSync(process.argv[2]);
if (Array.isArray(fromJuxta)) {
    throw new Error("Input JSON is already an array");
}
console.log(
    JSON.stringify(
        fromJuxta.sentences,
        null,
        2
    )
)