const scanner = require('i18next-scanner');
const fs = require('fs');
const path = require('path');

const config = {
  input: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
  ],
  output: 'locales',
  options: {
    debug: true,
    sort: true,
    func: {
      list: ['t'],
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    lngs: ['en', 'hi'],
    resource: {
      loadPath: 'locales/{{lng}}/{{ns}}.json',
      savePath: 'locales/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
    },
    ns: ['translation'],
    defaultLng: 'en',
    defaultNs: 'translation',
    defaultValue: '__NOT_TRANSLATED__',
    keySeparator: '.',
    nsSeparator: ':',
    interpolation: {
      prefix: '{{',
      suffix: '}}'
    },
    metadata: {},
    allowDynamicKeys: false,
  },
  transform: function customTransform(file, enc, done) {
    const parser = this.parser;
    const content = fs.readFileSync(file.path, enc);
    
    parser.parseFuncFromString(content, { list: ['t'] });
    
    done();
  }
};

scanner(config, (err, res) => {
  if (err) {
    console.error('Error scanning files:', err);
    process.exit(1);
  }
  console.log('Translation strings extracted successfully!');
  console.log('Check the locales/ directory for updated translation files.');
});
