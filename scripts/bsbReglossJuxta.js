const path = require('path');
const fse = require('fs-extra');
const { v4: uuid } = require('uuid');

const mergeCvs = (cvs) => {
    const chapter = cvs[0]
        .split(":")[0];
    const firstCvFirstV = cvs[0]
        .split(":")[1]
        .split('-')[0];
    const lastCvLastV = cvs.reverse()[0]
        .split(":")[1]
        .split('-').reverse()[0];
    return `${chapter}:${firstCvFirstV}${firstCvFirstV === lastCvLastV ? "" : `-${lastCvLastV}`}`;
}

const cvForSentence = sentence => {
    const cvSet = new Set([]);
    sentence.chunks.forEach(c => c.source.forEach(se => cvSet.add(se.cv)));
    const cvValues = Array.from(cvSet);
    const cv1 = cvValues[0];
    const cv2 = cvValues[cvValues.length - 1];
    if (cv1 === cv2) {
        return cv1;
    }
    const [c1, v1] = cv1.split(':');
    const [c2, v2] = cv2.split(':');
    if (c1 === c2) {
        return `${c1}:${v1}-${v2}`;
    }
    return `${cv1}-${cv2}`
};

const vForSentence = sentence => {
    const cvSet = new Set([]);
    sentence.chunks.forEach(c => c.source.forEach(se => cvSet.add(se.cv)));
    const cvValues = Array.from(cvSet);
    const cv1 = cvValues[0];
    const cv2 = cvValues[cvValues.length - 1];
    if (cv1 === cv2) {
        return cv1.split(':')[1];
    }
    const v1 = cv1.split(':')[1];
    const v2 = cv2.split(':')[1];
    if (v1 === v2) {
        return v1;
    }
    return `${v1}-${v2}`
};

const morphLookup = [
    {
        I: "ind",
        P: "part",
        N: "inf",
        S: "subj",
        M: "impér",
        O: "opt"
    },
    {
        A: "aor",
        P: "prés",
        I: "impft",
        F: "fut",
        E: "parf",
        L: "pqp"
    },
    {
        A: "act",
        P: "pass",
        M: "moy"
    },
    {
        "1": "1",
        "2": "2",
        "3": "3"
    },
    {
        S: "s",
        P: "p"
    }
];

const morphSummary = (morphArray) => {
    let retBits = [];
    let morphString = morphArray[2];
    if (morphString.length > 3) {
        retBits.push((morphLookup[3][morphString.substring(3, 4)] + (morphLookup[4][morphArray[4]] || "")) || "?");
    }
    retBits.push(morphLookup[0][morphString.substring(0, 1)] || "?");
    retBits.push(morphLookup[1][morphString.substring(1, 2)] || "?");
    retBits.push(morphLookup[2][morphString.substring(2, 3)] || "?");
    return retBits.join(" ");
}

const usage = "node bsbReglossJuxta.js <jxlPath> <bsbTsvPath>";
if (process.argv.length !== 4) {
    console.log(usage);
    process.exit(1);
}
// Read juxta
const juxta = fse.readJsonSync(process.argv[2]);
const jxlJson = juxta.bookCode ? juxta.sentences : juxta;
// Read BSB alignment as TSV
const bsbTsv = fse.readFileSync(process.argv[3])
    .toString()
    .split("\n")
    .slice(1)
    .map(l => l.split("\t"))
    .filter(l => l.length > 7);
// BSB alignment as JSON
const bsbLookup = {};
for (const bsbLine of bsbTsv) {
    const cv = `${bsbLine[1]}:${bsbLine[2]}`;
    if (!bsbLookup[cv]) {
        bsbLookup[cv] = [];
    }
    bsbLookup[cv][bsbLine[4].toLowerCase()] = bsbLine[6];
}
// Find breaks for whole sentence/whole verse
const sentenceMerges = []; // True means "merge with next sentence"
let sentenceN = 0;
for (const sentence of jxlJson) {
    let sentenceLastV = cvForSentence(sentence)
        .split(":")[1]
        .split('-')
        .reverse()[0];
    let nextSentenceFirstV = (sentenceN + 1) === jxlJson.length ?
        999 :
        cvForSentence(jxlJson[sentenceN + 1])
            .split(":")[1]
            .split('-')[0];
    sentenceMerges.push(sentenceLastV === nextSentenceFirstV);
    sentenceN++;
}
// Rework Greek
for (let [sentenceN, sentence] of jxlJson.entries()) {
    for (const chunk of sentence.chunks) {
        if (chunk.source.length == 2 && chunk.source[0].morph[1] == "N" && chunk.source[1].morph[1] == "AA") {
            chunk.source = [chunk.source[1], chunk.source[0]];
        }
    }
}
// Regloss
for (let [sentenceN, sentence] of jxlJson.entries()) {
    for (const chunk of sentence.chunks) {
        const chunkGlossBits = [];
        for (const sourceWord of chunk.source) {
            const cv = sourceWord.cv;
            const greekWord = sourceWord.content.toLowerCase();
            if (bsbLookup[cv] && bsbLookup[cv][greekWord]) {
                chunkGlossBits.push(
                    bsbLookup[cv][greekWord]
                    .replace("-", "_")
                    .split(" ")
                    .join("-")
                    .replace("[", "*")
                    .replace("]", "*")
                    .replace("vvv", ">")
                    .replace(/(of-[^’]+)’s/, "$1")
                    .replace(/([^’-]+)’s/g, "of-$1")
                );
            } else {
                chunkGlossBits.push(`?${greekWord}?`);
            }
        }
        chunk.gloss = chunkGlossBits.join(" ");
        // console.log(`${chunk.gloss} => ${chunk.gloss2}`);
    }
}
console.log(JSON.stringify(jxlJson, null, 2));
