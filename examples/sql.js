"use strict";

// Run me with Node to see my output!

let util = require("util");
let P = require("..");

///////////////////////////////////////////////////////////////////////

// Turn escaped characters into real ones (e.g. "\\n" becomes "\n").
function interpretEscapes(str) {
    let escapes = {
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t"
    };

    return str.replace(/\\(u[0-9a-fA-F]{4}|[^u])/, (_, escape) => {
        let type = escape.charAt(0);
        let hex = escape.slice(1);
        if (type === "u") {
            return String.fromCharCode(parseInt(hex, 16));
        }
        if (escapes.hasOwnProperty(type)) {
            return escapes[type];
        }
        return type;
    });
}

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
    return P.seqMap(P.string(type),P.alt(token(P.string("(").then(P.digits).skip(P.string(")"))),P.optWhitespace),function(t,l) {
        return t;
    }) 
}

let JSONParser = P.createLanguage({
    // This is the main entry point of the parser: a full JSON value.
    value: r =>
        P.seqMap(r.create,r.name,r.lbracket,r.fields,P.all,function(create,tableName,ignore1,fields,ignore2) {
            return {tableName,fields}
        }),
     // r.create.then(r.name).skip(r.lbracket).then(r.fields).skip(P.all),
    // The basic tokens in JSON, with optional whitespace afterward.
    create: () => word("CREATE TABLE"),
    lbracket: () => word("("),
    rbracket: () => word(")"),
    quote: () => word("`"),
    comma: () => word(","),
    colon: () => word(":"),

    // Regexp based parsers should generally be named for better error reporting.
    name: r =>
        P.alt(token(P.regexp(/[a-z|A-Z|_]+/)),token(P.regexp(/`[a-z|A-Z|_]+`/)))
            .map(interpretEscapes)
            .desc("name"),
    fields: r =>
        P.seqMap(r.name,r.type,P.letters,function(name,type,others) {
            return {name,type}
        }).sepBy(r.comma)
        .desc("fields"),
    type: () =>
        P.alt(fieldType("int"),
              fieldType("varchar")),

    number: () =>
        token(P.regexp(/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/))
            .map(Number)
            .desc("number")
});

///////////////////////////////////////////////////////////////////////

/*
let text = `\
CREATE TABLE \`user\` (
    user_id int unsigned NOT NULL PRIMARY KEY AUTO_INCREMENT,
    user_name varchar(255) binary NOT NULL default '',
    user_real_name varchar(255) binary NOT NULL default '',
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


let text = `\
CREATE TABLE \`user\` (
    user_id int(22),
    user_name varchar
   );
`;

function prettyPrint(x) {
    let opts = { depth: null, colors: "auto" };
    let s = util.inspect(x, opts);
    console.log(s);
}

let ast = JSONParser.value.tryParse(text);
console.log(ast);
prettyPrint(ast);