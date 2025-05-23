const path = require('path');
const fse = require('fs-extra');

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

const usage = "node juxta2usfm.js <jxlPath> <bookCode>";
if (process.argv.length !== 4) {
    console.log(usage);
    process.exit(1);
}
const juxta = fse.readJsonSync(process.argv[2]);
const jxlJson = juxta.bookCode ? juxta.sentences : juxta;
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
const bookCode = process.argv[3];
let usfmBits = [
    `\\id ${bookCode} generated by Xenizo using juxta2usfm`,
    '\\usfm 3.0',
    `\\h ${bookCode}`,
    `\\toc1 ${bookCode}`,
    `\\toc2 ${bookCode}`,
    `\\toc3 ${bookCode}`,
    `\\mt ${bookCode}`
];
let chapterN = 0;
let waitingBits = [];
let cvs = [];
sentenceN = 0;
for (const sentence of juxta) {
    cvs.push(cvForSentence(sentence));
    let isFirst = true;
    for (const chunk of sentence.chunks) {
        const greekChunk = chunk.source.map(c => c.content).join(' ');
        const glossChunk = chunk.gloss.replace(/\*([^*]+)\*/g,(all, inner) => `\\it ${inner}\\it*`);
        waitingBits.push(isFirst ? '\\m' : "\\p");
        waitingBits.push(`${glossChunk} \\f + \\tl ${greekChunk}\\tl*\\f*`);
        isFirst = false;
    }
    if (!sentenceMerges[sentenceN]) {
        let chunkChapter = parseInt(sentence.chunks[0].source[0].cv.split(":")[0]);
        if (chunkChapter !== chapterN) {
            usfmBits.push(`\\c ${chunkChapter}`);
            chapterN = chunkChapter;
        }
        const cvRef = mergeCvs(cvs);
        usfmBits.push(`\\v ${cvRef.split(':')[1]}`);
        waitingBits.forEach(b => usfmBits.push(b));
        cvs = [];
        waitingBits = [];
    }
    sentenceN++
}

console.log(usfmBits.join('\r\n'));
