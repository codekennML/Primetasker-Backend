const { nlp, its } = require("./nlpHelpers");

const tokenizeStemLemma = (entity) => {
  let title;
  typeof entity === "string" ? (title = entity) : (title = entity?.name);

  const doc = nlp.readDoc(title);
  const tokens = doc.tokens();

  let filteredTokens = tokens
    .filter(
      (token) =>
        token.out(its.pos) === "NOUN" ||
        (token.out(its.pos) === "VERB" && !token.out(its.stopWordFlag))
    )
    .out(its.lemma && its.stem);
  return filteredTokens;
};

module.exports = { tokenizeStemLemma };
