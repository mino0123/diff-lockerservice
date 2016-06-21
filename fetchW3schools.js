const fs = require('fs');
const jsdom = require('jsdom');

function isDomObj(el) {
  return /^dom_obj_/.test(el.getAttribute('href'));
}
function isPropLink(el) {
  const href = el.getAttribute('href');
  return /^prop_/.test(href) || /^met_/.test(href);
}

function unique(elements) {
  return elements
          .filter((e, i) => {
            const href = e.getAttribute('href');
            return elements.findIndex((el) => href === el.getAttribute('href')) === i;
          });
}

jsdom.env(
  'http://www.w3schools.com/jsref/default.asp',
  (errors, window) => {
    var anchors = [...window.document.getElementsByTagName('a')].filter(isDomObj);
    // anchors = anchors.slice(0, 2);
    anchors = unique(anchors);
    var elements = [];
    Promise.resolve(0).then(function loop(i) {
      new Promise((resolve) => {
        const el = anchors[i];
        const url = 'http://www.w3schools.com/jsref/' + el.getAttribute('href');
        const elementName = el.textContent.replace('<', '').replace('>', '');
        jsdom.env(url, (errors, window) => {
          const propLinks = [...window.document.getElementsByTagName('a')].filter(isPropLink);
          const names = propLinks.map((el) => el.textContent);
          elements.push({
            name: elementName,
            properties: names
          });
          resolve(i + 1);
        });
      })
      .then((i) => {
        setTimeout(() => {
          if (anchors[i]) {
            loop(i);
          } else {
            const json = JSON.stringify(elements, null, '  ');
            fs.writeFileSync('./elements.json', json, 'utf-8');
          }
        }, 2000);
      })
      .catch((e) => {
        console.log(e);
      });
    });
  }
)


