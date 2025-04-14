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

const usage = "node juxtaverbs.js <jxlPath>";
if (process.argv.length !== 3) {
    console.log(usage);
    process.exit(1);
}
const juxta = fse.readJsonSync(process.argv[2]);
const jxlJson = juxta.bookCode ? juxta.sentences : juxta;
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
// Collect verbs
let verbRecords = [];
let verbsInChapter = new Set([]);
let chapterN = 0;
let waitingVerbs = [];
let cvs = [];
for (let [sentenceN, sentence] of jxlJson.entries()) {
    cvs.push(cvForSentence(sentence));
    for (const [chunkN, chunk] of sentence.chunks.entries()) {
        const quote = chunk.source.map(s => s.content).join(" ");
        for (const greekData of chunk.source.filter(c => c.morph[1] === "V")) {
            let rowBits = [];
            rowBits.push(cvForSentence(sentence)); // cv
            rowBits.push(uuid().split("-")[0]); // id
            rowBits.push(`jc:${sentenceN}:${chunkN}`); // sentence info in tag
            rowBits.push("") // Support ref
            rowBits.push(quote) // Quote
            rowBits.push(1) // occ
            rowBits.push(`${greekData.content}: ${greekData.lemma[0]} (${morphSummary(greekData.morph)})`) // Note
            console.log(rowBits.join("\t"));
        }
    }
}