"use strict";

// Run me with Node to see my output!

let P = require("..");

///////////////////////////////////////////////////////////////////////

// Use the JSON standard's definition of whitespace rather than Parsimmon's.
let whitespace = P.regexp(/\s*/m);

// JSON is pretty relaxed about whitespace, so let's make it easy to ignore
// after most text.
function token(parser) {
    return parser.skip(whitespace);
}

// Several parsers are just strings with optional whitespace.
function word(str) {
    return P.string(str).thru(token);
}

function fieldType(type) {
    return P.seqMap(
        P.string(type),
        P.alt(token(P.string("(").then(P.digits).skip(P.string(")"))),P.optWhitespace),
        P.alt(token(P.string("(").then(P.digits).skip(word(",")).then(P.digit).skip(P.string(")"))),P.optWhitespace),
        function(t,l,l2) {
        return t;
    }) 
}

function allTypes() {
    return P.alt(
        // numeric
        fieldType("tinyint"),
        fieldType("smallint"),
        fieldType("mediumint"),
        fieldType("int"),
        fieldType("bigint"),
        fieldType("float"),
        fieldType("double"),
        fieldType("decimal"),
        // char
        fieldType("varchar"),
        fieldType("char"),
        fieldType("tinytext"),
        fieldType("text"),
        fieldType("mediumtext"),
        fieldType("longtext"),
        //time
        fieldType("datetime"),
        fieldType("date"),
        fieldType("time"),
        fieldType("timestamp"),
        //blob
        fieldType("tinyblob"),
        fieldType("blob"),
        fieldType("mediumblob"),
        fieldType("longblob"),
        //binary
        fieldType("binary"),
        fieldType("varbinary")
    );
}

function allAttributes() {
    return P.alt(word("not null"),
                 word("null"),
                 word("auto_increment"),
                 word("primary key"),
                 word("unique"),
                 word("binary"),
                 word("unsigned"));
}

function orEmpty(name) {
    return P.alt(token(word(name)),P.optWhitespace);
}

function argumentValue(name) {
    return P.alt(
        word(name).skip(P.string("'")).then(P.takeWhile( function(x) { return x !== "'"; })).skip(P.string("'")).skip(whitespace),
        P.seqMap(word(name),orEmpty("current_timestamp"),orEmpty("on"),orEmpty("update"),orEmpty("current_timestamp"),
        function(a,b,c,d,e) {
            if(e) {
                return [b,c,d,e].join(" ");
            }else {
                return b;
            }
        }),
        P.optWhitespace);
}

function skipToRBracket() {
    return P.takeWhile(function(x) {
        return x !== ")";
    });
}

function skipTo(text) {
        return P.custom(function(success, failure) {
          return function(input, i) {
            var index = input.lastIndexOf("comment");
            var lastBracket = input.lastIndexOf(")");
            if(index > 0 && index > lastBracket) {
              var result = P.all.wrap(word("'"),word("'")).tryParse(input.substr(index));
              return success(index, result);
            }
            return failure(i, "skip to " + text + "failure");
          };
        });
}

let JSONParser = P.createLanguage({
    // This is the main entry point of the parser: a full JSON value.
    value: r =>
        P.seqMap(r.create,r.name,r.lbracket,r.fields, skipTo("comment"),function(create,tableName,ignore1,fields,comment) {
            return {tableName,fields}
        }),
     // r.create.then(r.name).skip(r.lbracket).then(r.fields).skip(P.all),
    // The basic tokens in JSON, with optional whitespace afterward.
    create: () => token(word("create table")),
    lbracket: () => word("("),
    rbracket: () => word(")"),
    quote: () => word("`"),
    comma: () => word(","),
    colon: () => word(":"),

    // Regexp based parsers should generally be named for better error reporting.
    name: r =>
        token(P.regexp(/[a-z|A-Z|_]+/)
        .wrap(P.alt(P.string("`"),P.optWhitespace),P.alt(P.string("`"),P.optWhitespace)))
        .desc("name"),
    fields: r =>
        P.seqMap(r.name,r.type,r.attributes.trim(P.optWhitespace).many(),
        argumentValue("default"),
        argumentValue("comment"),
        function(name,type,others,defaults,comment) {
            return {name,type,defaults,comment}
        }).sepBy(r.comma)
        .desc("fields"),
    type: () => allTypes(),
    attributes: () => allAttributes(),
});

///////////////////////////////////////////////////////////////////////

/*
let text = `\
CREATE TABLE \`user\` (
    user_id int unsigned NOT NULL PRIMARY KEY AUTO_INCREMENT,
    \`user_name\` varchar(255) binary NOT NULL default 'xxxx',
    user_real_name varchar(255) binary NOT NULL default 'abc',
    user_password tinyblob NOT NULL,
    user_newpassword tinyblob NOT NULL,
    user_newpass_time binary(14),
    user_email tinytext NOT NULL,
    user_touched binary(14) NOT NULL default '',
    user_token binary(32) NOT NULL default '',
    user_email_authenticated binary(14),
    user_email_token binary(32),
    user_email_token_expires binary(14),
    user_registration binary(14),
    user_editcount int,
    user_password_expires varbinary(14) DEFAULT NULL
   ) ENGINE=, DEFAULT CHARSET=utf8";
`;
*/



// let text = `\
// CREATE TABLE \`user\` (
//     user_id int unsigned NOT NULL PRIMARY KEY AUTO_INCREMENT,
//     user_name varchar(255) binary,
//     usexr_name varchar(255) binary NOT NULL default 'xxxx'
//    );
// `;

let ast = JSONParser.value.tryParse(text.toLowerCase());
console.log(ast);