// initalize store, dependency
let _STORE = new Store('../../data/');

// borrowed conversion helper?
function csv2Json(csv) {
  const lines = csv.split('\n');
  const result = [];
  const headers = lines[0].split(',');
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) {
      continue;
    }
    const obj = {};
    const currentline = lines[i].split(',');
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j];
    }
    result.push(obj);
  }
  return result;
}

function getManifest() {
  return new Promise(function(res, rej) {
    var files = document.getElementById('manifestSelect').files;
    if (files.length) {
      let reader = new FileReader();
      // callbacks
      reader.onload = function(e) {
        let manifest = csv2Json(e.target.result);
        console.info('got manifest');
        // convert to filename as key
        let keyedManifest = {};
        for (x of manifest) {
          let f = x.file || x.filename;
          if (!f) {
            rej(new Error('Could not find file reference in manifest.'));
          } else {
            delete x['file'];
            delete x['filename'];
            keyedManifest[x] = x;
          }
        }
        res(keyedManifest);
      };
      reader.onerror = console.error;
      reader.readAsText(files[0]);
    } else {
      res(false);
    }
  });
}


function getFilemap() {
  let files = document.getElementById('importSelect').files;
  let filemap = {};
  console.info('got ' + files.length + ' files');
  for (let x of files) {
    console.log(x.name);
    filemap[x.name] = x;
  }
  console.log(filemap);
  return filemap;
}

function importFile(file, dataType, manifestRecord) {
  return new Promise(function(res, rej) {
    res(false);
  });
}

function runImport() {
  let dataType = document.getElementById('dataType').value;
  // get manifest if exists
  getManifest().then((manifest)=>{
    let filemap = getFilemap();
    for (file of filemap) {
      console.log(file);
      if (dataType == 'slide') {
        // insert data from manifest if applicable
        if (manifest) {
          console.info('with manifest');
        }
        // chunked upload process, incl finish this file via load service
        // lookup required fields from load service
        // post slide
      } else {
        // insert data from manifest if applicable
        if (manifest) {
          console.info('with manifest');
        }
        // look up slide
        // insert into document
        // -- field maps to do -- /
        // slide - provenance.analysis.slide
        //
        // post
      }
    }
  });
}

document.getElementById('start').addEventListener('click', runImport, false);