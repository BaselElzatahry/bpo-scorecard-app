const fs = require('fs');
const pdf = require('pdf-parse');

console.log('Type of pdf:', typeof pdf);
console.log('pdf export:', pdf);

const dataBuffer = fs.readFileSync('/Users/amrmelegy/Desktop/bpo-scorecard/public/scoreeee.pdf');

try {
    let parser = pdf;
    if (typeof pdf !== 'function' && typeof pdf.default === 'function') {
        parser = pdf.default;
    }

    if (typeof parser === 'function') {
        parser(dataBuffer).then(function (data) {
            console.log(data.text);
        }).catch(function (error) {
            console.error('Error reading PDF:', error);
        });
    } else {
        console.error('PDF parser is not a function');
    }
} catch (e) {
    console.error(e);
}
