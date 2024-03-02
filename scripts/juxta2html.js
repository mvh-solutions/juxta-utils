const path = require('path');
const fse = require('fs-extra');

const juxta = fse.readJsonSync(process.argv[2]);
let table = [
    '<table>',
    '<tbody>'
];
let sentenceN = 1;
for (const sentence of juxta) {
    let rows = []
    let chunkN = 0;
    for (const chunk of sentence.chunks) {
        const greekChunk = chunk.source.map(c => c.content).join(' ');
        const glossChunk = chunk.gloss.replace(/\*([^*]+)\*/g,(all, inner) => `<i>${inner}</i>`);
        rows.push(`<tr><td>${greekChunk}</td><td>${glossChunk}</td>${chunkN === 0 ? `<td rowspan="${sentence.chunks.length}"></td>` : ""}<td></td><td></td></tr>`);
        chunkN++;
    }
    table.push(`<tr><th colspan="5">Phrase ${sentenceN}</th></tr>`);
    table.push('<tr><th>Grec</th><th>Gloss</th><th>PSLE</th><th>Notes de bas de page</th><th>Termes pour glossaire</th></tr>');
    table.push(rows.join("\n"));
    sentenceN++;
}
table = [
    ...table,
    '</tbody>',
    '</table>'
]
const html = `
<html>
<head>
<meta charset="UTF-8">
<title>Juxta table</title>
</head>
<body>
${table.join("\n")}
</body>
</html>
`;

console.log(html);
