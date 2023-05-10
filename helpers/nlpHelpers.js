const winkNLP = require("wink-nlp");
const model = require("wink-eng-lite-web-model");
const nlp = winkNLP(model);
const its = require("wink-nlp/src/its.js");

module.exports = { nlp, its };
