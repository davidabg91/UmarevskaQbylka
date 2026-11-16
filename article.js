/* ===== Страница на статия =====
   Статиите са готови HTML страници blog-<slug>.html (правят се от tools/build-blog.js) — там няма
   какво да се рисува. Този файл остава заради старите връзки article.html?id=N: препраща ги към
   новия адрес на статията. */
(function () {
  var root = document.getElementById('articleRoot');
  if (!root || root.hasAttribute('data-static')) return;

  var articles = window.ARTICLES || [];
  var id = parseInt(new URLSearchParams(location.search).get('id'), 10);
  var a = articles[id];
  if (a && a.slug) { location.replace('blog-' + a.slug + '.html'); return; }

  root.innerHTML =
    '<div class="article__notfound">' +
    '<h1>Статията не е намерена</h1>' +
    '<p>Възможно е връзката да е остаряла.</p>' +
    '<a href="./#blog" class="btn btn--primary">Към блога</a>' +
    '</div>';
})();
