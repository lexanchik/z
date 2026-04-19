(function () {
  'use strict';

  const API = 'https://lampac.ga/';
  const CACHE_TIME = 1000 * 60 * 5; // 5 минут

  const cache = {};

  function request(url, callback, error) {
    // ⚡ КЭШ
    if (cache[url] && (Date.now() - cache[url].time < CACHE_TIME)) {
      return callback(cache[url].data);
    }

    const net = new Lampa.Reguest();

    net.native(url, (data) => {
      cache[url] = {
        time: Date.now(),
        data: data
      };
      callback(data);
    }, error || function(){});
  }

  function parse(html, selector) {
    try {
      const root = $('<div>' + html + '</div>');
      const items = [];

      root.find(selector).each(function () {
        const el = $(this);
        const json = JSON.parse(el.attr('data-json') || '{}');

        json.title = el.text();
        json.active = el.hasClass('active');

        items.push(json);
      });

      return items;
    } catch (e) {
      return [];
    }
  }

  // 🚫 АНТИ-РЕКЛАМА (жёсткий фильтр)
  function cleanItems(items) {
    return items.filter(i => {
      if (!i) return false;

      const bad = JSON.stringify(i).toLowerCase();

      return (
        (i.method === 'play' || i.method === 'call') &&
        !bad.includes('ads') &&
        !bad.includes('advert') &&
        !bad.includes('promo') &&
        !bad.includes('banner') &&
        !bad.includes('vast')
      );
    });
  }

  // ⚡ ПАРАЛЛЕЛЬНЫЙ ВЫБОР ЛУЧШЕГО ИСТОЧНИКА
  function getBestSource(sources, done) {
    let finished = false;

    sources.slice(0, 3).forEach((src) => { // максимум 3
      request(src.url, (html) => {
        if (finished) return;

        const items = cleanItems(parse(html, '.videos__item'));

        if (items.length) {
          finished = true;
          done(src, items);
        }
      });
    });

    // fallback
    setTimeout(() => {
      if (!finished && sources.length) {
        request(sources[0].url, (html) => {
          const items = cleanItems(parse(html, '.videos__item'));
          done(sources[0], items);
        });
      }
    }, 2000);
  }

  function play(item) {
    if (item.method === 'play') {
      Lampa.Player.play(item);
    } else {
      request(item.url, function (json) {
        if (!json || !json.url) return;

        // 🚫 убираем VAST
        delete json.vast;

        // 🚫 защита от рекламных редиректов
        if (json.url && json.url.includes('ads')) return;

        Lampa.Player.play({
          url: json.url,
          title: item.title,
          quality: json.quality || item.quality
        });
      });
    }
  }

  function component(object) {
    const scroll = new Lampa.Scroll({ mask: true, over: true });

    this.create = function () {
      return this.render();
    };

    this.initialize = function () {
      this.load();
    };

    this.load = function () {
      request(API + 'lite/events', (sources) => {

        if (!sources || !sources.length) {
          return this.empty();
        }

        // ⚡ выбираем лучший источник
        getBestSource(sources, (src, items) => {

          if (!items.length) {
            return this.empty();
          }

          this.renderItems(items);

        });

      }, this.empty.bind(this));
    };

    this.renderItems = function (items) {
      scroll.clear();

      items.forEach((item) => {
        const el = $('<div class="simple-item">' + item.title + '</div>');

        el.on('hover:enter', () => play(item));

        scroll.append(el);
      });

      Lampa.Controller.enable('content');
    };

    this.empty = function () {
      scroll.body().html(
        '<div style="padding:2em;text-align:center;">Нет видео</div>'
      );
    };
  }

  Lampa.Component.add('online_fast_clean', component);
})();
