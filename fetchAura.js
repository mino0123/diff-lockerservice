const fs = require('fs');
const path = require('path');
const fetchUrl = require('fetch').fetchUrl;
const jsdom = require('jsdom');


// shim
Object.values = Object.values || function values(obj) {
  return Object.keys(obj).map((k) => obj[k]);
};

function trimIncludeKeyword(str) {
  return str.replace(/\/\/ ?#include /, '');
}
function isFileInclude(includeExpression) {
  return !/\{/.test(includeExpression);
}

const BASE_URL = 'https://raw.githubusercontent.com/forcedotcom/aura/master/aura-impl/src/main/resources/';

fetchAuraJS('aura.Aura')
.then((code) => {
  code = `
    var document = window.document;
    var navigator = window.navigator;
    var NodeList = window.NodeList;
    var HTMLCollection = window.HTMLCollection;
    var Event = window.Event;
    function AuraDevToolService() {}
    ${code}
    window.SecureDocument = SecureDocument;
    window.SecureElement = SecureElement;
  `;
  fs.writeFileSync('./lib/aura.js', code, 'utf8');
});

function fetchAuraJS(name) {
  const pathName = name.replace(/\./g, '/');
  const url = `${BASE_URL}${pathName}.js`;
  return Promise.resolve({
    includes: {}, codes: {}
  })
    .then((ctx) => {
      return new Promise((resolve, reject) => {
        fetchUrl(url, (error, meta, body) => {
          const code = body.toString();
          ctx.baseCode = code;
          const includeExpressions = code.match(/\/\/ ?#include .*/g);
          if (includeExpressions) {
            const includes = code.match(/\/\/ ?#include .*/g)
                            .filter(isFileInclude)
                            .reduce((includes, matched) => {
                              const name = trimIncludeKeyword(matched);
                              const pathName = name.replace(/\./g, '/');
                              includes[name] = `${BASE_URL}${pathName}.js`;
                              return includes;
                            }, {});
            ctx.includes = includes;
          } else {
            ctx.includes = [];
          }
          resolve(ctx);
        });
      });
    })
    .then((ctx) => {// fetch dependency
      var names = Object.keys(ctx.includes);
      var urls = Object.values(ctx.includes);
      // if (urls.length > 60) {
      //   // 多重include確認用に依存性を減らす
      //   names = names.slice(81, 84);
      //   urls = urls.slice(81, 84);
      // }
      return Promise.resolve(0)
        .then(function loop(i) {
          if (!urls[i]) {
            return ctx;
          } else {
            // fetch include target
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                fetchAuraJS(names[i]).then((code) => {
                  ctx.codes[names[i]] = code;
                  resolve(i + 1);
                });
              }, 1000);
            })
            .then((i) => urls[i] ? loop(i) : ctx);
          }
        })
        .then((ctx) => {
          // replace #include
          const c = Object.keys(ctx.codes).reduce((code, name) => {
            const regexp = new RegExp('// ?#include ' + name);
            return code.replace(regexp, () => ctx.codes[name]);// 正規表現の$nによる置換を回避するため第二引数は関数
          }, ctx.baseCode);
          return c;
        });
    });
}
