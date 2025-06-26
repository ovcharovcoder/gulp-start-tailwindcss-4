const gulp = require('gulp');
const { src, dest, watch, parallel, series } = gulp;
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const tailwindcss = require('@tailwindcss/postcss');

const plugins = {
    concat: require('gulp-concat'),
    uglify: require('gulp-uglify-es').default,
    browserSync: require('browser-sync').create(),
    clean: require('gulp-clean'),
    webp: require('gulp-webp'),
    avif: require('gulp-avif'),
    newer: require('gulp-newer'),
    fonter: require('gulp-fonter'),
    ttf2woff2: require('gulp-ttf2woff2'),
    include: require('gulp-file-include'),
    sourcemaps: require('gulp-sourcemaps'),
    notify: require('gulp-notify'),
    replace: require('gulp-replace'),
    plumber: require('gulp-plumber'),
    if: require('gulp-if'),
    postcss: require('gulp-postcss'),
    rename: require('gulp-rename'),
};

const postcssPlugins = (isProduction = process.env.NODE_ENV === 'production') => [
    tailwindcss('./tailwind.config.js'),
    autoprefixer(),
    ...(isProduction ? [cssnano({ preset: 'default' })] : []),
];

const paths = {
    imagesSrc: 'app/images/src/**/*.{jpg,jpeg,png,svg}',
    scriptsSrc: 'app/js/*.js',
    stylesSrc: 'app/css/input.css',
    htmlSrc: 'app/pages/*.html',
    fontsSrc: 'app/fonts/src/*.{ttf,otf}',
};

function pages() {
    return src(paths.htmlSrc, { allowEmpty: true })
        .pipe(plugins.plumber({ errorHandler: plugins.notify.onError('Error HTML: <%= error.message %>') }))
        .pipe(plugins.include({ prefix: '@@', basepath: 'app/' }))
        .pipe(dest('app'))
        .pipe(plugins.browserSync.stream());
}

function fonts() {
    return src(paths.fontsSrc, { allowEmpty: true })
        .pipe(plugins.plumber({ errorHandler: plugins.notify.onError('Error Fonts: <%= error.message %>') }))
        .pipe(plugins.fonter({ formats: ['woff', 'ttf'] }))
        .pipe(plugins.if(file => /\.woff$/.test(file.extname), dest('app/fonts')))
        .pipe(src(paths.fontsSrc))
        .pipe(plugins.if(file => /\.ttf$/.test(file.extname), plugins.ttf2woff2()))
        .pipe(dest('app/fonts'));
}

function images() {
    return src(paths.imagesSrc, { allowEmpty: true })
        .pipe(plugins.plumber({ errorHandler: plugins.notify.onError('Error Image: <%= error.message %>') }))
        .pipe(plugins.newer('app/images'))
        .pipe(plugins.if(file => /\.svg$/.test(file.extname), dest('app/images')))
        .pipe(src(paths.imagesSrc, { allowEmpty: true }))
        .pipe(plugins.newer('app/images'))
        .pipe(plugins.if(file => /\.(jpg|jpeg|png)$/.test(file.extname), plugins.avif({ quality: 50 })))
        .pipe(dest('app/images'))
        .pipe(src(paths.imagesSrc, { allowEmpty: true }))
        .pipe(plugins.newer('app/images'))
        .pipe(plugins.if(file => /\.(jpg|jpeg|png)$/.test(file.extname), plugins.webp()))
        .pipe(dest('app/images'));
}

function cleanScripts() {
    return src(['app/js/main.min.js', 'app/js/main.min.js.map'], { allowEmpty: true }).pipe(plugins.clean());
}

function scripts() {
    return src([paths.scriptsSrc, '!app/js/main.min.js', '!app/js/main.min.js.map'], { allowEmpty: true })
        .pipe(plugins.plumber({ errorHandler: plugins.notify.onError('Error scripts: <%= error.message %>') }))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('main.min.js'))
        .pipe(plugins.if(process.env.NODE_ENV === 'production', plugins.uglify()))
        .pipe(plugins.sourcemaps.write('.'))
        .pipe(dest('app/js'))
        .pipe(plugins.browserSync.stream());
}

function scriptsProduction() {
    return src([paths.scriptsSrc, '!app/js/main.min.js', '!app/js/main.min.js.map'], { allowEmpty: true })
        .pipe(plugins.plumber({ errorHandler: plugins.notify.onError('Error scripts: <%= error.message %>') }))
        .pipe(plugins.concat('main.min.js'))
        .pipe(plugins.uglify())
        .pipe(dest('app/js'));
}

function styles() {
    return src(paths.stylesSrc, { allowEmpty: true })
        .pipe(plugins.plumber({ errorHandler: plugins.notify.onError('Error styles: <%= error.message %>') }))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.postcss(postcssPlugins()).on('error', plugins.notify.onError('PostCSS Error: <%= error.message %>')))
        .pipe(plugins.rename('style.min.css'))
        .pipe(plugins.sourcemaps.write('.'))
        .pipe(dest('app/css'))
        .pipe(plugins.browserSync.stream());
}

function stylesProduction() {
    return src(paths.stylesSrc, { allowEmpty: true })
        .pipe(plugins.plumber({ errorHandler: plugins.notify.onError('Error styles: <%= error.message %>') }))
        .pipe(plugins.postcss(postcssPlugins(true)))
        .pipe(plugins.rename('style.min.css'))
        .pipe(dest('app/css'));
}

function sync(done) {
    plugins.browserSync.init({
        server: { baseDir: 'app/' },
        notify: false,
        port: 3000,
        ghostMode: false,
        online: true,
    });
    done();
}

function watching() {
    watch(['app/css/input.css'], styles);
    watch([paths.htmlSrc, 'app/components/*'], pages);
    watch([paths.scriptsSrc, '!app/js/main.min.js', '!app/js/main.min.js.map'], series(cleanScripts, scripts));
    watch(paths.imagesSrc, series(images, cb => { plugins.browserSync.reload(); cb(); }));
    watch(paths.fontsSrc, fonts);
    sync(() => console.log('BrowserSync started'));
}

function cleanDist() {
    return src('dist', { allowEmpty: true }).pipe(plugins.clean());
}

function building() {
    return src([
        'app/css/style.min.css',
        'app/images/**/*.{svg,webp,avif}',
        'app/fonts/*.{woff,woff2}',
        'app/js/main.min.js',
        'app/*.html',
    ], { base: 'app', allowEmpty: true })
        .pipe(dest('dist'));
}

exports.styles = styles;
exports.images = images;
exports.fonts = fonts;
exports.pages = pages;
exports.scripts = series(cleanScripts, scripts);
exports.watching = watching;
exports.cleanDist = cleanDist;
exports.scriptsProduction = scriptsProduction;
exports.build = series(cleanDist, images, fonts, stylesProduction, scriptsProduction, pages, building);
exports.default = parallel(styles, fonts, images, scripts, pages, watching);