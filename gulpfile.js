const { watch, src, dest, series, parallel } = require("gulp")
const cp = require("child_process")

function dirs() {
    return src('*.*', { read: false })
        .pipe(dest('./site'))
        .pipe(dest('./site/static'))
        .pipe(dest('./site/static/assets'))
}

function build(cb) {
    return cp.exec("go build -o scripts/build cmd/build/build.go", cb)
}

function html(cb) {
    return cp.exec("./scripts/build", cb)
}

function css(cb) {
    return src("ui/src/*.css")
        .pipe(dest("site/static"))
}

function tsc(cb) {
    return cp.exec("npm run tsc -- -p ui/tsconfig.json")
}

function build_server(cb) {
    return cp.exec("go build -o ./site/api cmd/serve.go")
}

function sudokus(cb) {
    return src("./sudokus.txt").pipe(dest("site"))
}

function clean(cb) {
    return cp.exec("rm -rf site/* scripts/*", cb)
}

exports.watch = function() {
    watch("src/build.go", series(build, html))
    watch("ui/src/*.html", html)
    watch("ui/src/*.css", css)
    watch("ui/src/*.ts", tsc)
    watch("cmd/**/*.go", build_server)
    watch("internal/**/*.go", build_server)
    watch("sudokus.txt", sudokus)
}

exports.clean = clean

exports.build = series(
    clean,
    dirs,
    parallel(
        series(build, html),
        css,
        tsc,
        build_server,
        sudokus,
    )
)
