// 从 node_modules 载入 gulp 模块
var gulp = require('gulp');

// 导入各种 gulp 插件

/* 插件 gulp-load-plugins 可以让 gulp 系列插件（以 gulp 为前缀的插件）自动载入，载入命令中添加括号表示立即执行该插件，因此导入该插件后就立即自动导入项目安装了的 gulp 系列插件

在任务中使用相应的插件就需要以 $ 为对象，并调用相应函数的形式来实现，插件名字如果有连字符 - 则需要转换使用小驼峰式

由于使用了插件 gulp-load-plugins 自动导入了 gulp 系列的插件不需要手动每个载入了，所以以下的 gulp 系列插件载入命令注释了
*/
const $ = require('gulp-load-plugins')();

var gulpSequence = require('gulp-sequence'); // 插件 gulp-sequence 将一系列的 gulp 任务按照顺序 sequence 执行


// var jade = require('gulp-jade');   // HTML 模板语言 jade 编译插件

// CSS 预处理器需要载入两个插件，其中一个式 gulp 系列插件，由于之前使用了所以不需要手动载入了
// var sass = require('gulp-sass');
$.sass.compiler = require('node-sass');


// var plumber = require('gulp-plumber');   // 修改了 Gulp 运行时抛出错误暂停的默认行为，可以在终端输出错误但运行不中断

// var postcss = require('gulp-postcss');   // CSS 后处理器
var autoprefixer = require('autoprefixer'); // 它是 gulp-postcss 的拓展插件，根据需求为 CSS 样式添加前缀，实现网页的多浏览器版本适配

var mainBowerFiles = require('main-bower-files'); // 配合前端模块管理工具 Bower 的插件，可以从依赖模块中抽取编译出 JavaScript 文件

var browserSync = require('browser-sync').create(); // 创建一个本地服务器，提供 Liveload 功能

var minimist = require('minimist'); // 可以接收在终端执行 gulp 命令时输入参数，一般结合 gulp-if 插件让参数作为 gulp 任务的一部分，实现控制 gulp 自动化任务的条件性执行

// 配置预设的 env 名称
var envOptions = {
  string: 'env',
  default: {
    env: 'develop'
  }
}

// 配置 minimist 插件
var options = minimist(process.argv.slice(2), envOptions);
console.log(options); // 测试输出

// var watch = require('gulp-watch');   // 类似于「增强型」的 gulp.watch 插件，除了可以监听文件内容变动，还可以监听文件添加、删除

// gulp.task('copyHTML', function() {
//   return gulp.src('./source/**/*.html')
//   .pipe(gulp.dest('./public/'))
// })

gulp.task('clean', function () {
  return gulp.src(['./.tmp', './public'], {
      read: false
    })
    .pipe($.clean());
});

// jade 任务：对 HMTL 模板语言 jade 进行编译
gulp.task('jade', function () {
  // var YOUR_LOCALS = {};

  gulp.src('./source/*.jade') // 路径可以改为 gulp.src('./source/**/*.jade') 让 gulp 可以对目录 source 及其所有子目录下的 jade 文件都可以进行编译
    .pipe($.plumber()) // 一般在任务初都添加 plumber 插件捕获可能产生的错误，避免错误使得任务暂停
    .pipe($.sourcemaps.init())
    // 使用 gulp-data 插件将外部数据作为一个文件对象传递给 jade 插件使用
    .pipe($.data(function() {
      var menu = require('./source/data/menu.json');
      var khData = require('./source/data/data.json');
      var source = {
        khData: khData,
        menu: menu
      };
      return source;
    }))
    .pipe($.jade({
      // locals: YOUR_LOCALS
      pretty: true // 添加该属性可以让 HTML 代码排版适合阅读（不进行压缩）
    }))
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/')) // 将文件输出到指定路径
    .pipe(browserSync.stream()) // 当文件输出后调用 browserSync 插件的方法 stream 重新加载网页
});

// sass 任务：对 scss 文件进行编译、压缩
gulp.task('sass', function () {
  return gulp.src('./source/scss/**/*.scss')
    .pipe($.plumber())
    .pipe($.sourcemaps.init()) // 在编译前先初始化 sourcemaps 插件，准备为编译后的文件插入标记
    .pipe($.sass({
      // 以嵌套（非压缩，方便阅读）导入并编译模块中的 scss，如果在编译同时压缩 css 可以将该参数设置为 compressed
      outputStyle: 'nested',
      // 为 sass 编译器添加环境变量，当解释编译 scss 文档中的 @import 语句时，编译器会在 includePaths 指定路径中寻找依赖的外部 scss 文档
      includePaths: ['./node_modules/bootstrap/scss']
    }).on('error', $.sass.logError)) // 对 scss 文件进行编译
    .pipe($.postcss([autoprefixer()])) // scss 编译完成，执行 CSS 后编译，为 CSS 样式添加前缀以实现多浏览器版本的适配
    // 条件性编译，如果在 production 环境下实行 gulp 任务就会对 CSS 进行压缩
    .pipe($.if(options.env === 'production', $.cleanCss()))
    .pipe($.sourcemaps.write('.')) // 在输出前使用 sourcemaps 插件为编译后的文件插入标记
    .pipe(gulp.dest('./public/css'))
    .pipe(browserSync.stream());
});

// babel 任务：对 js 文件进行编译、压缩
gulp.task('babel', () =>
  gulp.src('./source/js/**/*.js')
  .pipe($.plumber())
  .pipe($.sourcemaps.init())
  // 对（基于 ES6 标准编写）js 文件进行编译以兼容的旧版本的浏览器
  .pipe($.babel({
    presets: ['@babel/env']
  }))
  .pipe($.concat('all.js')) // 合并多个 JavaScript 脚本为一个文件
  .pipe($.if(options.env === 'production', $.uglify({
    compress: {
      drop_console: true // 在 production 环境下编译时删除 JavaScript 脚本中 console.log() 语句
    }
  })))
  .pipe($.sourcemaps.write('.'))
  .pipe(gulp.dest('./public/js'))
  .pipe(browserSync.stream())
);

// bower 任务：配合前端模块管理工具 Bower 的插件，可以从 bower.json 记录（安装）的项目依赖模块中抽取编译出相应的文件（默认只提取 js 文件，可以在 bower.json 文件中添加 overrides 对象，修改提取的文件）
gulp.task('bower', function () {
  return gulp.src(mainBowerFiles())
    .pipe(gulp.dest('./.tmp/vendors'))
});

// vender 任务：将 bower 任务提取出来的多个文件进行合并为一个文件
// 其中为了确保 bower 任务先执行完成，再执行该任务，需要在回调函数前将 bower 任务（以数组形式）作为参数传入
gulp.task('vender', ['bower'], function () {
  // 将多个模块的 JavaScript 脚本合并为一个 venders.js 文件
  gulp.src('./.tmp/vendors/**/*.js')
    .pipe($.order([
      'jquery.js',
      'bootstrap.js'
    ]))
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.concat('venders.js'))
    .pipe($.if(options.env === 'production', $.uglify({
      compress: {
        drop_console: true // 在 production 环境下编译时删除 JavaScript 脚本中 console.log() 语句
      }
    })))
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/js'));

  // 将多个模块的 css 样式表合并为一个 venders.css 文件
  // gulp.src('./.tmp/vendors/**/*.css')
  //   .pipe($.plumber())
  //   .pipe($.sourcemaps.init())
  //   .pipe($.concat('venders.css'))
  //   .pipe($.if(options.env === 'production', $.cleanCss()))
  //   .pipe($.sourcemaps.write('.'))
  //   .pipe(gulp.dest('./public/css'))
})

// venderCSS 任务：将 bower 任务提取出来的 CSS 多个文件合并为一个 venders.css 文件
// 其中为了确保 bower 任务先执行完成，再执行该任务，需要在回调函数前将 bower 任务（以数组形式）作为参数传入
// gulp.task('venderCSS', function () {
//   gulp.src('./.tmp/vendors/**/*.css')
//     .pipe($.concat('venders.css'))
//     .pipe($.if(options.env === 'production', $.cleanCss()))
//     .pipe(gulp.dest('./public/css'))
// })

// image-min 任务：将图片进行压缩
gulp.task('image-min', () => (
  gulp.src('./source/images/*')
  .pipe($.if(options.env === 'production', $.imagemin()))
  .pipe(gulp.dest('./public/images'))
))

// browser-sync 任务：开启一个本地服务器，加载的网页路径在 baseDir 参数中指定
// Static server
gulp.task('browser-sync', function () {
  browserSync.init({
    server: {
      baseDir: "./public"
    }
  });
});

// watch 任务：使用插件 gulp-watch 监听指定文件的变动（包括目录下指定类型的文件添加、删除），执行相关的任务
// 由于 gulp 模块提供的原始 gulp.watch 功能只能监听文件内容的修改，无法监听文件的添加和删除，所以使用了 gulp-watch 插件
gulp.task('watch', function () {
  $.watch('./source/scss/**/*.scss', function () {
    gulp.start('sass')
  });
  $.watch('./source/**/*.jade', function () {
    gulp.start('jade')
  });
  $.watch('./source/js/**/*.js', function () {
    gulp.start('babel')
  });
});

// build 任务：使用 gulp-sequence 插件依次执行指定的任务
gulp.task('build', gulpSequence('clean', 'jade', 'sass', 'babel', 'vender', 'image-min'))

// deploy 任务：使用 gulp-gh-pages 插件将项目发布到 GitHub Page
gulp.task('deploy', function () {
  return gulp.src('./public/**/*')
    .pipe($.ghPages());
});

// default 任务：gulp 模块也支持依次执行指定的任务，以 default 命名的任务在终端中只需要命令 gulp 就可以执行（而无需如一般形式 gulp task_name 指定任务名称的形式）
gulp.task('default', ['jade', 'sass', 'babel', 'vender', 'image-min', 'browser-sync', 'watch']);