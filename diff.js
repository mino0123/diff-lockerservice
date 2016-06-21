const fs = require('fs');
const jsdom = require('jsdom');

function trimParenthesis(name) {
  return name.replace('(', '').replace(')', '');
}

function writeJSONFileSync(filepath, object) {
  const json = JSON.stringify(object, null, '  ');
  fs.writeFileSync(filepath, json, 'utf8');
}

const tags = ['a', 'applet', 'area', 'audio', 'base', 'body', 'br', 'button', 'canvas', 'data', 'datalist', 'dialog', 'dir', 'div', 'dl', 'embed', 'fieldset', 'font', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'hr', 'html', 'iframe', 'img', 'input', 'label', 'legend', 'li', 'link', 'map', 'menu', 'meta', 'meter', 'del', 'ins', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'pre', 'progress', 'blockquote', 'q', 'script', 'select', 'source', 'span', 'style', 'caption', 'col', 'colgroup', 'td', 'table', 'th', 'time', 'title', 'tr', 'thead', 'tbody', 'tfoot', 'template', 'textarea', 'track', 'ul', 'video']
const ignored = ['frame']; 

jsdom.env('https://google.com', (errors, window) => {
    const code = fs.readFileSync('./lib/aura.js', 'utf8');
    with(window) {
      eval(code);
    }
    // diff document
    const doc = new window.SecureDocument(window.document, 'key');
    const docDiff = diffProps(window.document, doc);
    writeJSONFileSync('./diff/document.json', docDiff);
    // diff elements
    tags.filter((t) => (ignored.indexOf(t) < 0)).forEach((name) => {
      const diff = diffElement(name, window);
      writeJSONFileSync(`./diff/${name}.json`, diff);
    });
});

function diffElement(name, window) {
  try {
    const origEl = window.document.createElement(name);
    const lockerEl = window.SecureElement(origEl, 'key');
    return diffProps(origEl, lockerEl);
  } catch (e) {
    return {error: e};
  }
}

function diffProps(src, dst) {
  const result = {
    passed: [], removed: [], errors: []
  };
  for (var i in src) {
    try {
      if (!(i in dst)) {
        result.removed.push(i);
      } else {
        result.passed.push(i);
      }
    } catch (e) {
      result.errors.push({ name: i, error: e });
    }
  }
  if (result.errors.length === 0) {
    delete result.errors;
  }
  return result;
}
