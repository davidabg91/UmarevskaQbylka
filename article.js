/* ===== Логика за отделната страница на статия ===== */
(function () {
  var articles = window.ARTICLES || [];
  var params = new URLSearchParams(location.search);
  var id = parseInt(params.get('id'), 10);
  var root = document.getElementById('articleRoot');

  if (isNaN(id) || id < 0 || id >= articles.length) {
    root.innerHTML =
      '<div class="article__notfound">' +
      '<h1>Статията не е намерена</h1>' +
      '<p>Възможно е връзката да е остаряла.</p>' +
      '<a href="index.html#blog" class="btn btn--primary">Към блога</a>' +
      '</div>';
    return;
  }

  var a = articles[id];
  document.title = a.title + ' — Умаревска Ябълка';
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', a.excerpt);

  // Dynamic social metadata updates
  var ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', a.title + ' — Умаревска Ябълка');
  
  var ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', a.excerpt);
  
  var ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    var absoluteImg = a.img;
    if (absoluteImg && !absoluteImg.startsWith('http')) {
      absoluteImg = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/' + absoluteImg;
    }
    ogImage.setAttribute('content', absoluteImg);
  }
  
  var ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', window.location.href);

  var twTitle = document.querySelector('meta[property="twitter:title"]');
  if (twTitle) twTitle.setAttribute('content', a.title + ' — Умаревска Ябълка');
  
  var twDesc = document.querySelector('meta[property="twitter:description"]');
  if (twDesc) twDesc.setAttribute('content', a.excerpt);
  
  var twImage = document.querySelector('meta[property="twitter:image"]');
  if (twImage) {
    var absoluteImg = a.img;
    if (absoluteImg && !absoluteImg.startsWith('http')) {
      absoluteImg = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/' + absoluteImg;
    }
    twImage.setAttribute('content', absoluteImg);
  }
  
  var twUrl = document.querySelector('meta[property="twitter:url"]');
  if (twUrl) twUrl.setAttribute('content', window.location.href);

  root.innerHTML =
    '<a href="index.html#blog" class="article__back">← Обратно към блога</a>' +
    '<div class="article__head">' +
      '<span class="post__cat">' + a.cat + '</span>' +
      '<h1 class="article__title">' + a.title + '</h1>' +
      '<div class="article__meta">' + a.meta + '</div>' +
    '</div>' +
    '<div class="article__cover"><img src="' + a.img + '" alt="' + a.title + '"></div>' +
    '<article class="article__body">' + a.body + '</article>' +
    '<aside class="article__cta">' +
      '<span class="article__cta-emoji">🍎</span>' +
      '<div class="article__cta-text">' +
        '<h3>' + (a.ctaTitle || 'Поръчайте директно от фермата') + '</h3>' +
        '<p>' + (a.ctaText || 'Свежи ябълки и 100% натурален сок от Умаревска Ябълка — поръчайте лесно онлайн.') + '</p>' +
      '</div>' +
      '<a href="index.html#shop" class="btn btn--primary">Към магазина →</a>' +
    '</aside>' +
    '<div class="article__foot">' +
      '<a href="index.html#blog" class="btn btn--ghost btn--dark">← Всички статии</a>' +
      '<a href="index.html#shop" class="btn btn--primary">Към магазина</a>' +
    '</div>';

  /* "Прочетете също" — до 3 други статии */
  var moreGrid = document.getElementById('moreGrid');
  if (moreGrid) {
    var others = articles
      .map(function (art, i) { return { art: art, i: i }; })
      .filter(function (o) { return o.i !== id; })
      .slice(0, 3);

    moreGrid.innerHTML = others.map(function (o) {
      var art = o.art;
      return '' +
        '<a class="post" href="article.html?id=' + o.i + '">' +
          '<div class="post__cover"><img src="' + art.img + '" alt="' + art.title + '" loading="lazy"></div>' +
          '<div class="post__body">' +
            '<span class="post__cat">' + art.cat + '</span>' +
            '<h3 class="post__title">' + art.title + '</h3>' +
            '<p class="post__excerpt">' + art.excerpt + '</p>' +
            '<span class="post__more">Прочети →</span>' +
          '</div>' +
        '</a>';
    }).join('');
  }

  window.scrollTo(0, 0);
})();
