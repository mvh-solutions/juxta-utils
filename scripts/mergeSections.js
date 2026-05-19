const fse = require('fs-extra');
const path = require("path");


const USAGE = "node mergeSections <sectionsDirPath>";

if (process.argv.length !== 3) {
  console.error(
    `Expected exactly 1 argument but found ${process.argv.length - 2}\n${USAGE}`,
  );
  process.exit(1);
}

let ret = [];

let books = [
    "MAT",
    "MRK",
    "LUK",
    "JHN",
    "ACT",
    "ROM",
    "1CO",
    "2CO",
    "GAL",
    "EPH",
    "PHP",
    "COL",
    "1TH",
    "2TH",
    "1TI",
    "2TI",
    "TIT",
    "PHM",
    "HEB",
    "JAS",
    "1PE",
    "2PE",
    "1JN",
    "2JN",
    "3JN",
    "JUD",
    "REV"

]

const sectionsDirPath = path.resolve(process.argv[2]);
for (const sectionsBook of books) {
    const sectionsFilePath = path.join(sectionsDirPath, `${sectionsBook}.json`);
    const sectionsJson = fse.readJSONSync(sectionsFilePath);
    ret = [...ret, ...sectionsJson];
}

console.log(JSON.stringify(ret, null, 2));