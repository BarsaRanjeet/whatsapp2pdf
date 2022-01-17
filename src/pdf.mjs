'use strict';

import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import csv from 'csv-parser';

export class GeneratePDF {
    constructor(data) {
        this.doc = new PDFDocument();
        this.writeStream = fs.createWriteStream('whatsapp.pdf');
        this.doc.pipe(this.writeStream);
        this.data = data;
    }

    drawLine(doc, fromx, fromy, tox, toy) {
        doc.lineCap('butt')
            .moveTo(fromx, fromy)
            .lineTo(tox, toy)
            .stroke()
    }

    generate() {
        this.doc.fontSize(14).text("whatsapp messages", 5, 5, { align: "center" })
        this.drawLine(this.doc, 0, 25, 620, 25);
        this.columns = [
            "date",
            "type",
            "from",
            "message",
            "image"
        ];

        let columnLen = this.columns.length;
        this.box = 620 / columnLen;
        this.addColumn(this.doc, 30, this.columns)
        this.drawLine(this.doc, 0, 45, 620, 45);

        //add row
        this.lastRowYaxis = 50;

        for (let [_k, row] of Object.entries(this.data)) {
            if (this.lastRowYaxis >= 700) {
                this.doc.addPage();
                this.lastRowYaxis = 10;
            }
            this.addRow(this.doc, this.lastRowYaxis, row)
            // if
            //     (!row.image) this.lastRowYaxis += 50;
            // else
            this.lastRowYaxis += 110
        }

        this.doc.end();

    }

    addColumn(doc, yaxis, columns) {

        let no = 0;
        for (let col of columns) {
            if (col == "from") doc.fontSize(12).text(col, 200, yaxis);
            else if (col == "message") doc.fontSize(12).text(col, 280, yaxis);
            else doc.fontSize(12).text(col, this.box * no, yaxis);
            no++;
        }
    }

    addRow(doc, yaxis, data) {
        // datetime
        doc.fontSize(8).text(data.date, this.box * 0, yaxis);

        // type
        doc.fontSize(8).text(data.type, this.box * 1, yaxis);

        // from 
        doc.fontSize(8).text(data.from, 200, yaxis);

        // message
        doc.fontSize(8).text(data.message, 280, yaxis, { width: 200 });

        if (data.image)
            // media
            doc.image(data.image, this.box * 4, yaxis,
                { width: 100, height: 100 });
    }

    reset() {

    }
}

// local test
// const result = {
//     name: {
//         "date": "20-05-2012",
//         "type": "NEW MSG",
//         "from": "From Me",
//         "message": "Showing jdsadh jhsajk jdksaj kdjakj jdkasj kdja skjdk asjk jhf khk jdkajk",
//         "image": ""
//     }
// }

// const pd = new GeneratePDF(result);
// pd.generate()