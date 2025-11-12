// Vibe coded by Claude. Don't look at me like that lol ¯\_(ツ)_/¯
const fs = require('fs');
const path = require('path');
const { minify: minifyJS } = require('terser');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

// Configuration
const PATHS = {
  css: 'ratio-matcher.css',
  html: 'ratio-matcher.html',
  js: 'ratio-matcher.js',
  output: 'static/ratio-matcher-bundle.min.js'
};

// Minifiers
const cssMinifier = new CleanCSS();

async function buildBundle() {
  try {
    console.log('🔨 Building bundle...');

    // Read files
    const css = fs.readFileSync(PATHS.css, 'utf8');
    const html = fs.readFileSync(PATHS.html, 'utf8');
    const js = fs.readFileSync(PATHS.js, 'utf8');

    // Minify CSS and HTML
    const minCSS = cssMinifier.minify(css).styles;
    const minHTML = await minifyHTML(html, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true
    });

    // Create bundle with minified strings embedded
    const bundle = `const CSS = \`${minCSS}\`;\nconst HTML = \`${minHTML}\`;\n${js}`;

    // Minify the entire bundle
    const result = await minifyJS(bundle, {
      compress: true,
      mangle: true
    });

    // Ensure output directory exists
    const outputDir = path.dirname(PATHS.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output
    fs.writeFileSync(PATHS.output, result.code);

    console.log('✅ Bundle created:', PATHS.output);
    console.log(`   Size: ${(result.code.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
  }
}

function watch() {
  console.log('👀 Watching files for changes...\n');

  // Build initially
  buildBundle();

  // Watch each file
  Object.entries(PATHS).forEach(([name, filepath]) => {
    if (name === 'output') return;

    fs.watch(filepath, (eventType) => {
      console.log(`📝 ${name} changed (${eventType})`);
      buildBundle();
    });
  });

  console.log('\nPress Ctrl+C to stop watching\n');
}

// Check if files exist
const missingFiles = Object.entries(PATHS)
  .filter(([name, filepath]) => name !== 'output' && !fs.existsSync(filepath))
  .map(([name, filepath]) => filepath);

if (missingFiles.length > 0) {
  console.error('❌ Missing files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

// Run
if (process.argv.includes('--build')) {
  buildBundle();
} else {
  watch();
}