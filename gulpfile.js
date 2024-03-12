const { watch, src, dest, series, parallel } = require("gulp")
const cp = require("child_process")
const ts = require("gulp-typescript")

const tsProject = ts.createProject("tsconfig.json")

function dirs() {
    return src('*.*', { read: false })
        .pipe(dest('./site'))
        .pipe(dest('./site/static'))
        .pipe(dest('./site/static/assets'))
}

function build(cb) {
    return cp.exec("go build -o scripts/build src/build.go", cb)
}

function html(cb) {
    return cp.exec("./scripts/build", cb)
}

function css(cb) {
    return src("src/*.css")
        .pipe(dest("site/static"))
}

function tsc(cb) {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(dest("site/static"));
}

function build_api(cb) {
    return cp.exec("go build -C ./src/api -o ../../site/api")
}

function sudokus(cb) {
    return src("./src/api/sudokus.txt").pipe(dest("site"))
}

function assets(cb) {
    return src("assets/*.*").pipe(dest("site/static/assets"))
}

function clean(cb) {
    return cp.exec("rm -rf site/* scripts/*", cb)
}

exports.watch = function() {
    watch("src/build.go", series(build, html))
    watch("src/*.html", html)
    watch("src/*.css", css)
    watch("src/*.ts", tsc)
    watch("src/api/**/*.go", build_api)
    watch("src/api/sudokus.txt", sudokus)
    watch("assets/*.*", assets)
}

exports.clean = clean

exports.build = series(
    clean,
    dirs,
    parallel(
        series(build, html),
        css,
        tsc,
        build_api,
        sudokus,
        assets,
    )
)
