const fse = require("fs-extra");
const usage = "node mergeJuxtas.js <fromJxlPath> <toJxlPath> <fromStart> <fromEnd>";

if (process.argv.length !== 6) {
    console.log(usage);
    process.exit(1);
}
const fromJuxta = fse.readJsonSync(process.argv[2]);
const fromJuxtaJson = fromJuxta.bookCode ? fromJuxta.sentences : fromJuxta;
const toJuxta = fse.readJsonSync(process.argv[3]);
let toJuxtaJson = toJuxta.bookCode ? toJuxta.sentences : toJuxta;
const fromStart = parseInt(process.argv[4]) - 1;
const fromEnd = parseInt(process.argv[5]) - 1;

for (const [fromSentenceN, sentence] of [...fromJuxtaJson.entries()].slice(fromStart, fromEnd)) {
    toJuxtaJson[fromSentenceN + fromStart] = sentence;
}

console.log(
    JSON.stringify(
        toJuxtaJson,
        null,
        2
    )
)