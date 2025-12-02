const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('/Users/amrmelegy/Desktop/bpo-scorecard/public/scoreeee.pdf');

pdf(dataBuffer).then(function (data) {
    console.log('Number of pages:', data.numpages);
    console.log('Raw text content:', JSON.stringify(data.text));
    console.log('Info:', JSON.stringify(data.info));
}).catch(function (error) {
    console.error('Error reading PDF:', error);
});
