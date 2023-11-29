const { watch, src, dest, series, parallel } = require("gulp")
const cp = require("child_process")
const ts = require("gulp-typescript")

const tsProject = ts.createProject("tsconfig.json")

function build(cb) {
    return cp.exec("go build -o scripts/build src/build.go", cb)
}

function html(cb) {
    return cp.exec("./scripts/build", cb)
}

function css(cb) {
    return src("src/*.css")
        .pipe(dest("site"))
}

function tsc(cb) {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(dest("site"));
}

exports.watch = function() {
    watch("src/build.go", series(build, html))
    watch("src/*.html", html)
    watch("src/*.css", css)
    watch("src/*.ts", tsc)
}

exports.clean = function(cb) {
    return cp.exec("rm -rf site/* scripts/*", cb)
}

exports.build = parallel(
    series(build, html),
    css,
    tsc
)
