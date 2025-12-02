import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('/Users/amrmelegy/Desktop/bpo-scorecard/public/scoreeee.pdf');

// Check if pdf is a function or has a default export
const parser = typeof pdf === 'function' ? pdf : pdf.default;

if (typeof parser === 'function') {
    parser(dataBuffer).then(function (data) {
        console.log(data.text);
    }).catch(function (error) {
        console.error('Error reading PDF:', error);
    });
} else {
    console.log('PDF Parser is not a function. Keys:', Object.keys(pdf));
}
