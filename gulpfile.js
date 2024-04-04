const { watch, src, dest, series, parallel } = require("gulp")
const cp = require("child_process")

function dirs() {
    return src('*.*', { read: false })
        .pipe(dest('./site'))
        .pipe(dest('./site/static'))
        .pipe(dest('./site/static/assets'))
        .pipe(dest('./site/migrations'))
        .pipe(dest('./bin'))
}

function build(cb) {
    return cp.exec("go build -o bin/build cmd/build/build.go", cb)
}

function html_build(cb) {
    return cp.exec("./bin/build", cb)
}

function html(cb) {
    return src("ui/src/*.html")
        .pipe(dest("site/static"))
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

function migrations(cb) {
    return src("./migrations/*.sql").pipe(dest("./site/migrations"))
}

function clean(cb) {
    return cp.exec("rm -rf site/* bin/*", cb)
}

exports.watch = function() {
    watch("src/build.go", series(build, html_build))
    watch("ui/src/index.html", html_build)
    watch("ui/src/*.html", series(html, html_build))
    watch("ui/src/*.css", css)
    watch("ui/src/**/*.ts", tsc)
    watch("cmd/**/*.go", build_server)
    watch("internal/**/*.go", build_server)
    watch("migrations/*.sql", migrations)
    watch("sudokus.txt", sudokus)
}

exports.clean = clean

exports.build = series(
    clean,
    dirs,
    parallel(
        series(build, html, html_build),
        css,
        tsc,
        build_server,
        migrations,
        sudokus,
    )
)
