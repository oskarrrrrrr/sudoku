const { watch, src, dest, series, parallel } = require("gulp")
const cp = require("child_process");
const ts = require("gulp-typescript");

const tsProject = ts.createProject("tsconfig.json");

function build_builder(cb) {
    return cp.exec("go build -o tools/main tools/main.go", cb)
}

function html(cb) {
    return cp.exec("./tools/main", cb)
}

function css(cb) {
    return src("site/*.css")
        .pipe(dest("out"))
}

function tsc(cb) {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(dest("out"));
}

exports.watch = function() {
    watch("tools/*.go", series(build_builder, html))
    watch("site/*.html", html)
    watch("site/*.css", css)
    watch("site/*.ts", tsc)
}

exports.clean = function(cb) {
    return cp.exec("rm out/* tools/main", cb)
}

exports.build = parallel(
        series(build_builder, html),
        css,
        tsc
    )
