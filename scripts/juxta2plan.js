const path = require('path');
const fse = require('fs-extra');


const doUnits = (bookCode, jxlJson) => {
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

    let chapters = {};
    let cvs = [];
    sentenceN = 0;
    for (const sentence of juxta) {
        cvs.push(cvForSentence(sentence));
        if (!sentenceMerges[sentenceN]) {
            let chunkChapter = parseInt(sentence.chunks[0].source[0].cv.split(":")[0]);
            if (!chapters[chunkChapter]) {
                chapters[chunkChapter] = [];
            }
            const cvRef = mergeCvs(cvs);
            chapters[chunkChapter].push(cvRef);
            cvs = [];
        }
        sentenceN++
    }
    return chapters;
}

const doSections = (bookCode, chapters) => {
    const ret = [];
    for (const [chapter, units] of Object.entries(chapters)) {
        const chapterRecord = {
            bookCode,
            cv: [
                `${chapter}:1`,
                `${chapter}:${units[units.length - 1].split(":")[1]}`
            ],
            "fieldInitialValues": {},
            "paragraphs": units.map(
                u => {
                    return {
                        paraTag: "p",
                        units: [u]
                    }
                }
            )
        };
        ret.push(chapterRecord);
    }
    return ret;
}

const usage = "node juxta2usfm.js <bookCode> <jxlPath> ";
if (process.argv.length !== 4) {
    console.log(usage);
    process.exit(1);
}
const bookCode = process.argv[2];
const juxta = fse.readJsonSync(process.argv[3]);
const jxlJson = juxta.bookCode ? juxta.sentences : juxta;


console.log(
    JSON.stringify(
        doSections(
            bookCode,
            doUnits(bookCode, jxlJson)
        ),
        null,
        2
    )
);
